/**
 * features/evening/useCharacterProgress.js
 * Hook — loads and updates character XP / level from Supabase.
 * Bolt 2.4: Evening Review + Character Progress.
 *
 * Single responsibility:
 *   - On mount: fetch existing progress for the authed user
 *   - expose awardXp(earned, reviewDate) → upserts new total to Supabase
 *
 * level formula: floor(total_xp / 100) + 1  (ADR 0008)
 *
 * Exports: useCharacterProgress
 */

import { useState, useEffect, useCallback } from "react";
import {
  sbGetCharacterProgress,
  sbUpsertCharacterProgress,
} from "../../shared/services/supabase.js";
import { logError } from "../../shared/lib/logger.js";

/**
 * @param {import("@supabase/supabase-js").User|null} user
 * @returns {{
 *   totalXp: number,
 *   level: number,
 *   progressLoading: boolean,
 *   awardXp: (earned: number, reviewDate: string) => Promise<number>,
 * }}
 */
export function useCharacterProgress(user) {
  const [totalXp,         setTotalXp]         = useState(0);
  const [level,           setLevel]           = useState(1);
  const [progressLoading, setProgressLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) { setProgressLoading(false); return; }

    sbGetCharacterProgress(user.id)
      .then(data => {
        if (data) {
          setTotalXp(data.total_xp ?? 0);
          setLevel(data.level ?? 1);
        }
      })
      .catch(e => logError("useCharacterProgress.load", e))
      .finally(() => setProgressLoading(false));
  }, [user?.id]);

  /**
   * Awards XP for today's review. Updates local state immediately,
   * then persists to Supabase.
   *
   * @param {number} earned      — XP from this review (10–50)
   * @param {string} reviewDate  — 'YYYY-MM-DD'
   * @returns {Promise<number>}  — new total_xp (for animation)
   */
  const awardXp = useCallback(async (earned, reviewDate) => {
    const newTotal = totalXp + earned;
    const newLevel = Math.floor(newTotal / 100) + 1;

    // Optimistic local update
    setTotalXp(newTotal);
    setLevel(newLevel);

    // Persist
    if (user?.id) {
      try {
        await sbUpsertCharacterProgress(user.id, newTotal, reviewDate);
      } catch (e) {
        logError("useCharacterProgress.awardXp", e);
      }
    }

    return newTotal;
  }, [totalXp, user?.id]);

  return { totalXp, level, progressLoading, awardXp };
}
