/**
 * features/today/useToday.js
 * Hook for Today screen — task list state, soft cap, decomposition, welcome-back.
 *
 * Bolt 2.1: adhd-aware-planning skill compliance:
 *   - Soft cap ≤ 5 visible tasks
 *   - welcomeBack flag: shows once per session when lastActiveDate > 2 days
 *   - decomposeTask: AI micro-step generator for "don't know where to start"
 *   - completeTask / archiveTask: both call archive silently (no shame)
 *
 * Exports: useToday
 */

import { useState, useMemo, useCallback } from "react";
import { aiDecomposeTask } from "../../shared/services/claude.js";
import { logError }        from "../../shared/lib/logger.js";

const SOFT_CAP = 5;

/**
 * @param {object} opts
 * @param {object[]} opts.thoughts       — full thoughts array from App state
 * @param {Function} opts.onArchive      — (id) => void — archives a thought
 * @param {Function} opts.onUpdate       — (id, fields) => void — updates a thought
 * @param {string}   opts.lang
 * @param {object|null} opts.persona
 */
export function useToday({ thoughts, onArchive, onUpdate, lang, persona }) {
  const [expandAll,    setExpandAll]    = useState(false);
  const [decomposing,  setDecomposing]  = useState(null);  // task id being decomposed
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);

  // ── Derived lists ──────────────────────────────────────────────────────────
  const activeTasks = useMemo(
    () => thoughts.filter(t => t.isToday && !t.archived),
    [thoughts]
  );

  const visibleTasks = useMemo(
    () => expandAll ? activeTasks : activeTasks.slice(0, SOFT_CAP),
    [activeTasks, expandAll]
  );

  const hiddenCount = Math.max(0, activeTasks.length - SOFT_CAP);

  // ── Welcome-back detection ─────────────────────────────────────────────────
  // Shows once per session when user has been away > 2 days.
  const shouldShowWelcome = useMemo(() => {
    if (welcomeDismissed) return false;
    const lastActive = persona?.patterns?.lastActiveDate;
    if (!lastActive) return false;
    const daysSince = Math.floor(
      (Date.now() - new Date(lastActive).getTime()) / 86_400_000
    );
    return daysSince > 2;
  }, [persona, welcomeDismissed]);

  const dismissWelcome = useCallback(() => setWelcomeDismissed(true), []);

  // ── Task actions ───────────────────────────────────────────────────────────
  /** Archive a task quietly (done = archive, no streak/count shown) */
  const completeTask = useCallback((id) => onArchive(id), [onArchive]);

  /** Remove a task silently without confirmation */
  const archiveTask  = useCallback((id) => onArchive(id), [onArchive]);

  /**
   * AI decompose: request micro-steps for a task that feels overwhelming.
   * Updates the thought in-place via onUpdate.
   * @param {object} task
   */
  const decomposeTask = useCallback(async (task) => {
    if (decomposing) return; // guard: only one at a time
    setDecomposing(task.id);
    try {
      const result = await aiDecomposeTask(task, lang, persona);
      onUpdate(task.id, {
        step_one: result.step_one,
        steps:    result.steps,
      });
    } catch (e) {
      logError("useToday.decomposeTask", e, { taskId: task.id });
    } finally {
      setDecomposing(null);
    }
  }, [decomposing, lang, persona, onUpdate]);

  return {
    activeTasks,
    visibleTasks,
    hiddenCount,
    expandAll,
    setExpandAll,
    completeTask,
    archiveTask,
    decomposeTask,
    decomposing,
    shouldShowWelcome,
    dismissWelcome,
  };
}
