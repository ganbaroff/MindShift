/**
 * features/focus/useFocusTimer.js
 * Hybrid focus timer — Date.now() timestamps + requestAnimationFrame ticks.
 *
 * Bolt 5.2 (ADR 0018): Chosen over setInterval because:
 *   - Accurate: elapsed = Date.now() - startTime - pausedMs (no drift)
 *   - Tab-safe: visibilitychange reconciles without pausing the timer
 *   - rAF stops when tab hidden (browser throttles it), but on resume
 *     we get an accurate snapshot via Date.now()
 *
 * ADHD design principles:
 *   - No "overdue" state — timer simply stops at 0 and emits onDone
 *   - Pause is a feature, not a cheat — hyperfocus has natural pauses
 *   - Sprint presets match ADHD research: 5 min (initiation), 25 min,
 *     45 min (flow entry), 90 min (full flow cycle)
 *
 * Usage:
 *   const { state, remaining, progress, start, pause, resume, reset } =
 *     useFocusTimer({ duration: 25, onDone: () => {} });
 *
 *   state:     'idle' | 'running' | 'paused' | 'done'
 *   remaining: seconds left (integer)
 *   progress:  0.0 → 1.0 (1.0 = full, 0.0 = done) — drives SVG arc
 */

import { useState, useRef, useCallback, useEffect } from "react";

/** Available sprint durations (minutes). */
export const SPRINT_OPTIONS = [5, 25, 45, 90];

/**
 * @typedef {'idle'|'running'|'paused'|'done'} TimerState
 *
 * @param {{ duration?: number, onDone?: () => void }} options
 * @returns {{
 *   state:     TimerState,
 *   duration:  number,
 *   remaining: number,
 *   progress:  number,
 *   setDuration: (min: number) => void,
 *   start:    () => void,
 *   pause:    () => void,
 *   resume:   () => void,
 *   reset:    () => void,
 * }}
 */
export function useFocusTimer({ duration: initDuration = 25, onDone } = {}) {
  const [duration, setDurationState] = useState(initDuration);
  const [timerState, setTimerState]  = useState(/** @type {TimerState} */ ("idle"));
  const [remaining, setRemaining]    = useState(initDuration * 60);
  const [progress,  setProgress]     = useState(1);

  // Refs: mutable values inside rAF callback, avoid stale closures
  const startTimeRef  = useRef(null);   // Date.now() when running started
  const pausedMsRef   = useRef(0);      // total ms accumulated while paused
  const pauseStartRef = useRef(null);   // Date.now() when current pause began
  const durationMsRef = useRef(initDuration * 60 * 1000);
  const rafRef        = useRef(null);
  const doneFiredRef  = useRef(false);
  const onDoneRef     = useRef(onDone);

  // Keep onDone ref fresh
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);

  // ── Core tick ─────────────────────────────────────────────────────────────
  const tick = useCallback(() => {
    if (!startTimeRef.current) return;

    const elapsed   = Date.now() - startTimeRef.current - pausedMsRef.current;
    const totalMs   = durationMsRef.current;
    const leftMs    = Math.max(0, totalMs - elapsed);
    const leftSec   = Math.ceil(leftMs / 1000);
    const prog      = Math.max(0, Math.min(1, leftMs / totalMs));

    setRemaining(leftSec);
    setProgress(prog);

    if (leftMs <= 0) {
      setTimerState("done");
      startTimeRef.current = null;
      if (!doneFiredRef.current) {
        doneFiredRef.current = true;
        onDoneRef.current?.();
      }
      return; // stop rAF loop
    }

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  // ── Cleanup rAF on unmount ─────────────────────────────────────────────
  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const start = useCallback(() => {
    doneFiredRef.current = false;
    pausedMsRef.current  = 0;
    pauseStartRef.current = null;
    startTimeRef.current = Date.now();
    setTimerState("running");
    setProgress(1);
    setRemaining(durationMsRef.current / 1000);
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const pause = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    pauseStartRef.current = Date.now();
    setTimerState("paused");
  }, []);

  const resume = useCallback(() => {
    if (pauseStartRef.current) {
      pausedMsRef.current += Date.now() - pauseStartRef.current;
      pauseStartRef.current = null;
    }
    setTimerState("running");
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const reset = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    startTimeRef.current  = null;
    pausedMsRef.current   = 0;
    pauseStartRef.current = null;
    doneFiredRef.current  = false;
    setTimerState("idle");
    setRemaining(durationMsRef.current / 1000);
    setProgress(1);
  }, []);

  const setDuration = useCallback((min) => {
    durationMsRef.current = min * 60 * 1000;
    setDurationState(min);
    // Reset state when duration changes from idle/done
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    startTimeRef.current  = null;
    pausedMsRef.current   = 0;
    pauseStartRef.current = null;
    doneFiredRef.current  = false;
    setTimerState("idle");
    setRemaining(min * 60);
    setProgress(1);
  }, []);

  return {
    state:       timerState,
    duration,
    remaining,
    progress,
    setDuration,
    start,
    pause,
    resume,
    reset,
  };
}

/**
 * Formats remaining seconds as "MM:SS".
 * @param {number} seconds
 * @returns {string}
 */
export function formatRemaining(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
