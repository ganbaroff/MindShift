/**
 * features/today/useDayPlan.js
 * Hook for the AI-powered daily plan state machine.
 *
 * Bolt 2.2 — ADR 0007
 *
 * State machine:
 *   idle → processing → review → saved (or idle on cancel)
 *          ↓ on error
 *         error → idle (auto-reset after 4s)
 *
 * Responsibilities:
 *   - Fetch today's existing tasks on mount (if user is logged in)
 *   - Submit raw text → parseDayPlan → human-in-the-loop review
 *   - Confirm: bulk-save accepted tasks to Supabase → "saved"
 *   - Optimistic checkbox toggle for saved tasks
 *
 * Exports: useDayPlan
 */

import { useState, useCallback, useEffect } from "react";
import { parseDayPlan }      from "../../shared/services/claude.js";
import { sbGetDailyTasks, sbSaveDailyTasks, sbToggleDailyTask } from "../../shared/services/supabase.js";
import { logError }          from "../../shared/lib/logger.js";

/** Returns today's date as 'YYYY-MM-DD' in local time. */
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * @typedef {Object} DailyTask
 * @property {string}   id
 * @property {string}   title
 * @property {string}   priority          — "high" | "medium" | "low"
 * @property {number}   estimated_minutes
 * @property {string[]} microsteps
 * @property {boolean}  completed
 */

/**
 * @typedef {Object} ProposedTask
 * @property {object}  task     — raw task from parseDayPlan
 * @property {boolean} accepted
 */

/**
 * @param {object} opts
 * @param {string}      opts.lang
 * @param {object|null} opts.persona
 * @param {object|null} opts.user      — auth user (null = unauthenticated)
 */
export function useDayPlan({ lang, persona, user }) {
  const date = todayStr();

  /** "idle" | "processing" | "review" | "saved" | "error" */
  const [status,       setStatus]       = useState("idle");
  const [proposed,     setProposed]     = useState(/** @type {ProposedTask[]} */ ([]));
  const [errorMsg,     setErrorMsg]     = useState("");
  const [savedTasks,   setSavedTasks]   = useState(/** @type {DailyTask[]} */ ([]));
  const [loadingTasks, setLoadingTasks] = useState(false);

  // ── Load today's existing tasks on mount ─────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    setLoadingTasks(true);
    sbGetDailyTasks(user.id, date)
      .then(tasks => { if (!cancelled) setSavedTasks(tasks); })
      .catch(e   => logError("useDayPlan.loadTasks", e))
      .finally(()=> { if (!cancelled) setLoadingTasks(false); });
    return () => { cancelled = true; };
  }, [user?.id, date]);

  /**
   * Submit raw text for AI parsing.
   * Transitions: idle/error → processing → review | error
   * @param {string} rawText
   */
  const submitDayPlan = useCallback(async (rawText) => {
    const trimmed = rawText?.trim();
    if (!trimmed || status === "processing") return;

    setStatus("processing");
    setErrorMsg("");

    try {
      const tasks = await parseDayPlan(trimmed, lang, persona);
      setProposed(tasks.map(task => ({ task, accepted: true })));
      setStatus("review");
    } catch (e) {
      logError("useDayPlan.submitDayPlan", e);
      const msg =
        e.message === "timeout"
          ? (lang === "ru" ? "⏱ Таймаут — попробуй снова"
             : lang === "az" ? "⏱ Vaxt bitdi"
             : "⏱ Timeout — try again")
        : e.message?.includes(":auth")
          ? (lang === "ru" ? "🔑 Ошибка API ключа" : "🔑 API key error")
        : e.message?.includes(":rate_limit")
          ? (lang === "ru" ? "⏳ Лимит запросов — подожди минуту"
             : "⏳ Rate limit — wait a moment")
        : (lang === "ru" ? "Что-то пошло не так — попробуй снова"
           : lang === "az" ? "Xəta baş verdi"
           : "Something went wrong — try again");
      setErrorMsg(msg);
      setStatus("error");
      setTimeout(() => { setStatus("idle"); setErrorMsg(""); }, 4000);
    }
  }, [status, lang, persona]);

  /** Toggle a single proposed item's accepted state. */
  const toggleItem = useCallback((index) => {
    setProposed(prev =>
      prev.map((p, i) => i === index ? { ...p, accepted: !p.accepted } : p)
    );
  }, []);

  /** Accept all proposed items. */
  const acceptAll = useCallback(() => {
    setProposed(prev => prev.map(p => ({ ...p, accepted: true })));
  }, []);

  /**
   * Confirm: save accepted tasks, transition to "saved".
   * If user not logged in, still shows tasks in memory (no persistence).
   */
  const confirmPlan = useCallback(async () => {
    const accepted = proposed.filter(p => p.accepted).map(p => p.task);
    if (!accepted.length) {
      setProposed([]);
      setStatus("idle");
      return;
    }

    let newTasks = accepted.map((t, i) => ({ ...t, id: `local-${i}`, completed: false }));

    if (user?.id) {
      try {
        const saved = await sbSaveDailyTasks(accepted, user.id, date);
        if (saved.length) newTasks = saved;
      } catch (e) {
        logError("useDayPlan.confirmPlan", e);
      }
    }

    setSavedTasks(newTasks);
    setProposed([]);
    setStatus("idle"); // back to idle — DayPlanTaskList is now shown
  }, [proposed, user?.id, date]);

  /** Cancel review — discard proposed, back to idle. */
  const cancelReview = useCallback(() => {
    setProposed([]);
    setStatus("idle");
  }, []);

  /**
   * Optimistic toggle of a saved task's completed state.
   * Updates local state immediately, then persists to Supabase.
   * @param {string} taskId
   */
  const toggleSavedTask = useCallback((taskId) => {
    setSavedTasks(prev => {
      const updated = prev.map(t =>
        t.id === taskId ? { ...t, completed: !t.completed } : t
      );
      if (user?.id) {
        const task = updated.find(t => t.id === taskId);
        if (task && !taskId.startsWith("local-")) {
          sbToggleDailyTask(taskId, task.completed, user.id)
            .catch(e => logError("useDayPlan.toggleSavedTask", e));
        }
      }
      return updated;
    });
  }, [user?.id]);

  /**
   * Clear today's plan so user can re-plan.
   * Deletes from Supabase, resets local state.
   */
  const clearPlan = useCallback(async () => {
    if (user?.id) {
      try {
        await sbSaveDailyTasks([], user.id, date); // sbSaveDailyTasks deletes first
      } catch (e) {
        logError("useDayPlan.clearPlan", e);
      }
    }
    setSavedTasks([]);
    setStatus("idle");
  }, [user?.id, date]);

  return {
    status,          // "idle" | "processing" | "review" | "saved" | "error"
    proposed,        // ProposedTask[]
    errorMsg,        // string
    savedTasks,      // DailyTask[]
    loadingTasks,    // boolean
    date,            // 'YYYY-MM-DD'
    submitDayPlan,
    toggleItem,
    acceptAll,
    confirmPlan,
    cancelReview,
    toggleSavedTask,
    clearPlan,
  };
}
