/**
 * shared/lib/freemium.js
 * Freemium limit tracking and Pro user detection.
 * Pure functions + localStorage for dump counting.
 *
 * Bolt 1.2: extracted from mindflow.jsx lines 263–290.
 */

export const FREE_LIMITS = {
  dumpsPerMonth: 30,   // AI calls per month
  thoughtsStored: 50,  // max active (non-archived) thoughts
};

export function getMonthKey() {
  const d = new Date();
  return `mf_dumps_${d.getFullYear()}_${d.getMonth()}`;
}

export function getDumpCount() {
  try { return parseInt(localStorage.getItem(getMonthKey()) || "0", 10); } catch { return 0; }
}

export function incrementDumpCount() {
  try {
    const key = getMonthKey();
    const n = getDumpCount() + 1;
    localStorage.setItem(key, String(n));
    return n;
  } catch { return 0; }
}

export function isProUser(user, subscription) {
  if (!user) return false;
  if (subscription?.plan === "pro" || subscription?.plan === "coach") return true;
  return false;
}
