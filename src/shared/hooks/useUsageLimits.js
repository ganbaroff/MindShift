/**
 * shared/hooks/useUsageLimits.js
 * Cross-cutting hook — freemium AI call limits (Bolt 2.5, ADR 0009).
 *
 * Free limits per UTC day:
 *   parseDayPlan:          3 calls
 *   generateEveningReview: 1 call
 *
 * Pro users (user_profiles.is_pro = true) bypass all limits.
 *
 * Usage:
 *   const { canUseDayPlan, canUseEveningReview, dayPlanLeft, isPro,
 *           limitsLoading, checkAndIncrement } = useUsageLimits(user);
 *
 *   // Before calling parseDayPlan:
 *   const { allowed } = await checkAndIncrement("day_plan");
 *   if (!allowed) { show inline banner; return; }
 *
 * Exports: useUsageLimits
 */

import { useState, useEffect, useCallback } from "react";
import {
  sbGetUsage,
  sbCheckAndIncrementUsage,
  sbGetUserProfile,
} from "../services/supabase.js";
import { logError } from "../lib/logger.js";

// Free-tier limits (ADR 0009)
const LIMITS = {
  day_plan:       3,
  evening_review: 1,
};

/** Returns today's UTC date as 'YYYY-MM-DD'. */
function utcToday() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * @param {import("@supabase/supabase-js").User|null} user
 * @returns {{
 *   canUseDayPlan:       boolean,
 *   canUseEveningReview: boolean,
 *   dayPlanLeft:         number,
 *   isPro:               boolean,
 *   limitsLoading:       boolean,
 *   checkAndIncrement:   (feature: "day_plan"|"evening_review") => Promise<{ allowed: boolean }>,
 * }}
 */
export function useUsageLimits(user) {
  const [isPro,          setIsPro]          = useState(false);
  const [usage,          setUsage]          = useState({ day_plan_calls: 0, evening_review_calls: 0 });
  const [limitsLoading,  setLimitsLoading]  = useState(true);

  useEffect(() => {
    if (!user?.id) { setLimitsLoading(false); return; }

    const date = utcToday();
    Promise.all([
      sbGetUserProfile(user.id),
      sbGetUsage(user.id, date),
    ])
      .then(([profile, usageRow]) => {
        setIsPro(profile?.is_pro ?? false);
        if (usageRow) setUsage(usageRow);
      })
      .catch(e => logError("useUsageLimits.load", e))
      .finally(() => setLimitsLoading(false));
  }, [user?.id]);

  /**
   * Checks the limit for the given feature, increments in Supabase if allowed,
   * and updates local state optimistically.
   *
   * @param {"day_plan"|"evening_review"} feature
   * @returns {Promise<{ allowed: boolean }>}
   */
  const checkAndIncrement = useCallback(async (feature) => {
    // Pro users always allowed — no DB write needed
    if (isPro) return { allowed: true };

    const field = feature === "day_plan" ? "day_plan_calls" : "evening_review_calls";
    const limit = LIMITS[feature];

    try {
      const result = await sbCheckAndIncrementUsage(user.id, utcToday(), field, limit);
      if (result.allowed) {
        setUsage(prev => ({ ...prev, [field]: (prev[field] ?? 0) + 1 }));
      }
      return result;
    } catch (e) {
      logError("useUsageLimits.checkAndIncrement", e);
      return { allowed: true }; // fail-open — never block user on infra error
    }
  }, [isPro, user?.id]);

  const canUseDayPlan       = isPro || (usage.day_plan_calls       < LIMITS.day_plan);
  const canUseEveningReview = isPro || (usage.evening_review_calls < LIMITS.evening_review);
  const dayPlanLeft         = isPro ? Infinity : Math.max(0, LIMITS.day_plan - (usage.day_plan_calls ?? 0));

  return {
    canUseDayPlan,
    canUseEveningReview,
    dayPlanLeft,
    isPro,
    limitsLoading,
    checkAndIncrement,
  };
}
