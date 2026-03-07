/**
 * shared/hooks/useNotifications.js
 * Bolt 2.6 — Notification permission, settings, and schedule management.
 *
 * Wraps shared/lib/notifications.js + shared/lib/notif-schedule.js.
 * Scheduling is foreground-only (setTimeout) — no VAPID/FCM (ADR 0010).
 * Settings persist to localStorage via saveNotifPrefs ("mf_notif_prefs").
 *
 * Returns:
 *   requestPermission   — async () => "granted"|"denied"|"default"|"unsupported"
 *   scheduleReminders   — () => void  (force-reschedule with current settings + lang)
 *   cancelReminders     — () => void  (clear all pending timers)
 *   permissionState     — "granted"|"denied"|"default"|"unsupported"
 *   settings            — { enabled, morningTime, morningOn, eveningTime, eveningOn }
 *   updateSettings      — (patch) => void  (merges, persists, re-applies schedule)
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  loadNotifPrefs,
  saveNotifPrefs,
  requestNotifPermission,
} from "../lib/notifications.js";
import { applyNotifSchedule } from "../lib/notif-schedule.js";
import { logError }           from "../lib/logger.js";

export function useNotifications(lang) {
  const [permissionState, setPermissionState] = useState(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
    return Notification.permission; // "granted" | "denied" | "default"
  });

  const [settings, setSettings] = useState(() => loadNotifPrefs());

  // Keep langRef current so visibilitychange handler has latest lang without re-subscribing
  const langRef = useRef(lang);
  useEffect(() => { langRef.current = lang; }, [lang]);

  // Apply schedule whenever settings or lang changes
  useEffect(() => {
    applyNotifSchedule(settings, lang);
  }, [settings, lang]);

  // Re-apply schedule when tab becomes visible (covers browser backgrounding)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        applyNotifSchedule(loadNotifPrefs(), langRef.current);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  // AC1: called once on first login. Browser enforces single-dialog-per-origin.
  const requestPermission = useCallback(async () => {
    try {
      const result = await requestNotifPermission();
      setPermissionState(result);
      return result;
    } catch (e) {
      logError("useNotifications.requestPermission", e);
      return "denied";
    }
  }, []);

  // Merge patch into settings, persist, and re-apply schedule (via the useEffect above)
  const updateSettings = useCallback((patch) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      saveNotifPrefs(next);
      return next;
    });
  }, []);

  // Cancel all pending notification timers (e.g., on sign-out)
  const cancelReminders = useCallback(() => {
    if (window.__mf_timers) {
      Object.values(window.__mf_timers).forEach(id => clearTimeout(id));
      window.__mf_timers = {};
    }
  }, []);

  // Force-reschedule with current settings (exposed for edge-case callers)
  const scheduleReminders = useCallback(() => {
    applyNotifSchedule(settings, langRef.current);
  }, [settings]);

  return {
    requestPermission,
    scheduleReminders,
    cancelReminders,
    permissionState,
    settings,
    updateSettings,
  };
}
