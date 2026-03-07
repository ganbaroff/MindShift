/**
 * shared/lib/notifications.js
 * Notification permission, preference persistence, and scheduling primitives.
 * No i18n dependency — see notif-schedule.js for language-aware scheduling.
 *
 * Bolt 1.2: extracted from mindflow.jsx lines 2257–2306.
 */

export const NOTIF_STORAGE_KEY = "mf_notif_prefs";

// Global timer store for cancellation
window.__mf_timers = window.__mf_timers || {};

export function defaultNotifPrefs() {
  return {
    enabled: false,
    morningTime: "09:00",
    eveningTime: "21:00",
    morningOn: true,
    eveningOn: true,
  };
}

export function loadNotifPrefs() {
  // FIX: localStorage persists across reloads (was window.__mf_notif which reset on refresh)
  try {
    const raw = localStorage.getItem("mf_notif_prefs");
    return raw ? JSON.parse(raw) : defaultNotifPrefs();
  } catch { return defaultNotifPrefs(); }
}

export function saveNotifPrefs(prefs) {
  try { localStorage.setItem("mf_notif_prefs", JSON.stringify(prefs)); } catch {}
}

export async function requestNotifPermission() {
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  const result = await Notification.requestPermission();
  return result;
}

export function scheduleNotification(title, body, timeStr) {
  if (!("Notification" in window) || Notification.permission !== "granted") return null;
  const [h, m] = timeStr.split(":").map(Number);
  const now = new Date();
  const target = new Date();
  target.setHours(h, m, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  const delay = target.getTime() - now.getTime();
  const timerId = setTimeout(() => {
    new Notification(title, { body, icon: "\u{1F9E0}", tag: `mf_${timeStr}` });
    // reschedule for next day
    scheduleNotification(title, body, timeStr);
  }, delay);
  return timerId;
}
