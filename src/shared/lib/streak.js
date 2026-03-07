/**
 * shared/lib/streak.js
 * Streak calculation and persistence utilities.
 *
 * A "streak day" = any day where the user either:
 *   - created at least one thought (createdAt)
 *   - archived at least one task (archivedAt)
 *
 * Design intent: Duolingo-style loss aversion. A streak survives
 * if the user was active yesterday (so waking up in the morning
 * doesn't immediately break your streak).
 */

const STREAK_BEST_KEY = "mf_streak_best";

/**
 * Computes streak metrics from a thoughts array.
 * Pure function — reads only `thought.createdAt` and `thought.archivedAt`.
 *
 * @param {Array<{ createdAt?: string, archivedAt?: string }>} thoughts
 * @returns {{ current: number, longest: number, doneToday: boolean, alive: boolean }}
 */
export function getStreakData(thoughts) {
  if (!thoughts.length) return { current: 0, longest: 0, doneToday: false, alive: false };

  // Collect all active days (dump or archive event)
  const days = new Set();
  thoughts.forEach(t => {
    if (t.createdAt)  days.add(t.createdAt.slice(0, 10));
    if (t.archivedAt) days.add(t.archivedAt.slice(0, 10));
  });

  const todayStr     = new Date().toISOString().slice(0, 10);
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  const doneToday = days.has(todayStr);
  const alive     = doneToday || days.has(yesterdayStr);

  // Count current streak (walk backwards day by day)
  let current = 0;
  if (alive) {
    let check = new Date();
    if (!doneToday) check = new Date(Date.now() - 86400000); // start from yesterday
    while (true) {
      const s = check.toISOString().slice(0, 10);
      if (!days.has(s)) break;
      current++;
      check = new Date(check.getTime() - 86400000);
    }
  }

  // Longest streak (walk the sorted day array)
  let longest = 0, run = 0;
  const allDays = Array.from(days).sort();
  for (let i = 0; i < allDays.length; i++) {
    if (i === 0) {
      run = 1;
    } else {
      const prev = new Date(allDays[i - 1]);
      const curr = new Date(allDays[i]);
      const diff = (curr - prev) / 86400000;
      run = diff === 1 ? run + 1 : 1;
    }
    longest = Math.max(longest, run);
  }

  return { current, longest, doneToday, alive };
}

/**
 * Persists the current streak best to localStorage.
 * No-op if localStorage is unavailable.
 *
 * @param {number} current - current streak count
 */
export function saveStreak(current) {
  try {
    const prev = parseInt(localStorage.getItem(STREAK_BEST_KEY) || "0");
    localStorage.setItem(STREAK_BEST_KEY, Math.max(current, prev));
  } catch {}
}
