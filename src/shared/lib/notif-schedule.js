/**
 * shared/lib/notif-schedule.js
 * Language-aware notification scheduling (morning/evening rituals).
 * Depends on notification primitives from notifications.js.
 *
 * Bolt 1.2: extracted from mindflow.jsx lines 2308–2334.
 */

import { scheduleNotification } from "./notifications.js";

export function applyNotifSchedule(prefs, lang) {
  // Cancel existing timers
  Object.values(window.__mf_timers).forEach(id => clearTimeout(id));
  window.__mf_timers = {};
  if (!prefs.enabled || Notification.permission !== "granted") return;

  const morningMessages = {
    en: { title: "\u{1F305} Morning Ritual", body: "Good morning! Time to dump your thoughts and plan your day." },
    ru: { title: "\u{1F305} Утренний ритуал", body: "Доброе утро! Время выгрузить мысли и спланировать день." },
    az: { title: "\u{1F305} Səhər ritualu", body: "Sabahınız xeyir! Fikirlərini tök və günü planla." },
  };
  const eveningMessages = {
    en: { title: "\u{1F319} Evening Review", body: "How did today go? Take 2 minutes for your evening check-in." },
    ru: { title: "\u{1F319} Вечерний обзор", body: "Как прошёл день? Потрать 2 минуты на вечерний обзор." },
    az: { title: "\u{1F319} Axşam icmalı", body: "Bu gün necə keçdi? Axşam yoxlaması üçün 2 dəqiqə ayır." },
  };

  if (prefs.morningOn) {
    const msg = morningMessages[lang] || morningMessages.en;
    window.__mf_timers.morning = scheduleNotification(msg.title, msg.body, prefs.morningTime);
  }
  if (prefs.eveningOn) {
    const msg = eveningMessages[lang] || eveningMessages.en;
    window.__mf_timers.evening = scheduleNotification(msg.title, msg.body, prefs.eveningTime);
  }
}
