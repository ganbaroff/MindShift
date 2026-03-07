/**
 * shared/hooks/useCharacterProgress.js
 * Bolt 3.1: Promoted from features/evening/ — now cross-cutting (used by
 * PersonaCard + EveningScreen). Features import from here; the old path
 * re-exports for backwards compatibility.
 *
 * Hook — loads and updates character XP / level from Supabase.
 *
 * Single responsibility:
 *   - On mount: fetch existing progress for the authed user
 *   - expose awardXp(earned, reviewDate) → upserts new total to Supabase
 *   - Bolt 4.1: expose addXp(xpGain) → optimistic update + sbAddXp persist
 *               expose levelUpPayload → { newLevel } for LevelUpToast, or null
 *
 * level formula: floor(total_xp / 100) + 1  (ADR 0008)
 *
 * Exports: useCharacterProgress
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  sbGetCharacterProgress,
  sbUpsertCharacterProgress,
  sbAddXp,
} from "../services/supabase.js";
import { logError } from "../lib/logger.js";

/**
 * @param {import("@supabase/supabase-js").User|null} user
 * @returns {{
 *   totalXp:        number,
 *   level:          number,
 *   progressLoading: boolean,
 *   awardXp:        (earned: number, reviewDate: string) => Promise<number>,
 *   addXp:          (xpGain: number) => Promise<{ leveledUp: boolean, newLevel: number }>,
 *   levelUpPayload: { newLevel: number } | null,
 * }}
 */
export function useCharacterProgress(user) {
  const [totalXp,         setTotalXp]         = useState(0);
  const [level,           setLevel]           = useState(1);
  const [progressLoading, setProgressLoading] = useState(true);
  const [levelUpPayload,  setLevelUpPayload]  = useState(null);
  const levelUpTimer = useRef(null);

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

  /**
   * Bolt 4.1 — awards XP for any activity (AC1–AC4, ADR 0013).
   *
   * 1. Optimistic update: immediately updates local totalXp + level.
   * 2. If a level-up occurred, sets levelUpPayload for LevelUpToast (auto-clears in 2.5s).
   * 3. Persists via sbAddXp (read-modify-write on character_progress).
   * 4. Reconciles local state with DB result (handles multi-device scenarios).
   *
   * @param {number} xpGain — from calcXpGain(action)
   * @returns {Promise<{ leveledUp: boolean, newLevel: number }>}
   */
  const addXp = useCallback(async (xpGain) => {
    const newTotal  = totalXp + xpGain;
    const newLevel  = Math.floor(newTotal / 100) + 1;
    const leveledUp = newLevel > level;

    // 1. Optimistic local update (immediate UI feedback)
    setTotalXp(newTotal);
    setLevel(newLevel);

    // 2. Level Up toast (auto-clears after 2.5s)
    if (leveledUp) {
      clearTimeout(levelUpTimer.current);
      setLevelUpPayload({ newLevel });
      levelUpTimer.current = setTimeout(() => setLevelUpPayload(null), 2500);
    }

    // 3. Persist + reconcile with DB
    if (user?.id) {
      sbAddXp(user.id, xpGain)
        .then(({ newXp: dbXp, newLevel: dbLevel }) => {
          // Reconcile in case another device also awarded XP
          setTotalXp(dbXp);
          setLevel(dbLevel);
        })
        .catch(e => logError("useCharacterProgress.addXp", e));
    }

    return { leveledUp, newLevel };
  }, [totalXp, level, user?.id]);

  // Cleanup level-up timer on unmount
  useEffect(() => () => clearTimeout(levelUpTimer.current), []);

  return { totalXp, level, progressLoading, awardXp, addXp, levelUpPayload };
}
