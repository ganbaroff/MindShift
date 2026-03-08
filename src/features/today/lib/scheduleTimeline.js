/**
 * features/today/lib/scheduleTimeline.js
 * Pure scheduling algorithm for the Timeline View.
 *
 * Bolt 5.1 (ADR 0017): No external calendar library — this tiny pure-JS
 * function replaces FullCalendar / react-big-calendar entirely for our
 * single-day, single-column use case.
 *
 * ADHD design principles applied:
 *   - Auto-shift: never marks tasks as "overdue" (red), just reschedules from now
 *   - 15-min buffer between tasks: breathing room, not wasted time
 *   - Priority order (high→medium→low) within today's list
 */

/** Minutes of automatic buffer between any two tasks. */
export const BUFFER_MINUTES = 15;

/**
 * Formats a Date as "HH:MM" in local time.
 * @param {Date} date
 * @returns {string}
 */
export function formatHHMM(date) {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * Formats a duration in minutes as "Xh Ym" or "Ym".
 * @param {number} minutes
 * @returns {string}
 */
export function formatDuration(minutes) {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/**
 * @typedef {Object} ScheduledItem
 * @property {string}  id
 * @property {boolean} isBuffer          — true for 15-min break blocks
 * @property {Date}    scheduledStart
 * @property {Date}    scheduledEnd
 * @property {number}  estimated_minutes
 * @property {string}  [title]           — task only
 * @property {string}  [priority]        — "high" | "medium" | "low", task only
 * @property {boolean} [completed]       — task only
 * @property {string[]} [microsteps]     — task only
 */

/**
 * Greedy sequential scheduler.
 *
 * Algorithm:
 * 1. Sort tasks: high → medium → low priority (stable — original order preserved
 *    within same priority bucket).
 * 2. Cursor starts at: max(09:00 today, referenceTime).
 * 3. For each incomplete task: if cursor < now, advance cursor to now (auto-shift).
 * 4. Place task block: scheduledStart = cursor, scheduledEnd = cursor + estimated_minutes.
 * 5. Insert BUFFER_MINUTES break after each task (except the last).
 *
 * Completed tasks are placed as-is (cursor advances normally) — they show
 * historical position on the timeline.
 *
 * @param {Object[]} tasks          — DailyTask[] from useDayPlan.savedTasks
 * @param {Date}    [referenceTime] — override "now"; defaults to new Date()
 * @returns {ScheduledItem[]}
 */
export function scheduleTimeline(tasks, referenceTime = null) {
  if (!tasks || tasks.length === 0) return [];

  const now = referenceTime instanceof Date ? referenceTime : new Date();

  // Start at 09:00 local time if we're running before 9 AM, else start now.
  const nineAM = new Date(now);
  nineAM.setHours(9, 0, 0, 0);
  let cursor = now < nineAM ? new Date(nineAM) : new Date(now);

  // ── Sort by priority ─────────────────────────────────────────────────────
  const rank = { high: 0, medium: 1, low: 2 };
  // Array.sort is stable in V8 (ES2019+), preserving original order within equal keys.
  const sorted = [...tasks].sort(
    (a, b) => (rank[a.priority] ?? 1) - (rank[b.priority] ?? 1)
  );

  const result = [];

  for (let i = 0; i < sorted.length; i++) {
    const task = sorted[i];

    // ── Auto-shift (ADHD principle: no "overdue" red) ─────────────────────
    // If this incomplete task's planned slot has already passed, gently move
    // the cursor forward to right now. Completed tasks keep their place.
    if (!task.completed && cursor < now) {
      cursor = new Date(now);
    }

    const scheduledStart = new Date(cursor);
    const durationMin    = Math.max(task.estimated_minutes ?? 25, 1);
    const scheduledEnd   = new Date(cursor.getTime() + durationMin * 60_000);

    result.push({
      ...task,
      scheduledStart,
      scheduledEnd,
      isBuffer: false,
    });

    cursor = scheduledEnd;

    // ── 15-min buffer block between tasks (not after the last one) ─────────
    if (i < sorted.length - 1) {
      const bufStart = new Date(cursor);
      const bufEnd   = new Date(cursor.getTime() + BUFFER_MINUTES * 60_000);

      result.push({
        id:                `buf-${task.id}-${i}`,
        isBuffer:          true,
        scheduledStart:    bufStart,
        scheduledEnd:      bufEnd,
        estimated_minutes: BUFFER_MINUTES,
      });

      cursor = bufEnd;
    }
  }

  return result;
}
