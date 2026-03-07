# Bolt 2.6 — Push Notifications (PWA Local Reminders)

**Date:** 2026-03-08
**Branch:** claude/bolt-2-6
**Build:** ✅ 0 errors · 137.45 kB gzip (↑ ~0.3 kB from 2.5)

---

## Goal

Local notifications (Web Notifications API + setTimeout) for morning ritual and evening
review reminders. No VAPID/FCM for MVP — foreground-only, explicitly disclosed to users.

---

## Acceptance Criteria

| # | Criterion | Status |
|---|-----------|--------|
| AC1 | Single permission request on first login after auth; if denied — soft inline hint in Settings | ✅ |
| AC2 | Settings: morning time (default 09:00), evening time (default 21:00), per-type toggles; saved in localStorage | ✅ |
| AC3 | Morning notification (EN/RU/AZ strings) | ✅ |
| AC4 | Evening notification (EN/RU/AZ strings) | ✅ |
| AC5 | Schedule on mount via `useNotifications` hook, cancel on unmount (`clearTimeout`) | ✅ |
| AC6 | `useNotifications` hook in `shared/hooks/` — `{ requestPermission, scheduleReminders, cancelReminders, permissionState, settings, updateSettings }` | ✅ |
| AC7 | Browser unsupported → silent fallback, neutral "not supported" message in Settings | ✅ |
| AC8 | NO Service Worker push for MVP | ✅ |
| AC9 | Settings screen — inline section, two time pickers, two toggles, Save button, no modal | ✅ |
| AC10 | ADR 0010 documenting why localStorage, why foreground-only, upgrade path to VAPID | ✅ |
| CRITICAL | Disclosed "Notifications work while app is open" in `NotifDisclosure` component | ✅ |

---

## Files Created

| File | Purpose |
|------|---------|
| `src/shared/hooks/useNotifications.js` | Hook: permission state, settings, schedule lifecycle |
| `docs/bolts/0010-notifications-adr.md` | ADR: localStorage, foreground-only, upgrade path |
| `docs/bolts/2026-03-08-bolt-2-6-push-notifications.md` | This file |

---

## Files Modified

| File | Change |
|------|--------|
| `src/features/settings/index.jsx` | Reminders Card: modal button → `NotifInline` component; added `useState` import; `NotifInline` + `NotifDisclosure` sub-components; new props: `notifSettings`, `notifPermission`, `onUpdateNotifSettings`, `onRequestNotifPermission`; removed `onNotif` prop |
| `src/mindflow.jsx` | Added `useNotifications` import; removed `NotifPanel` import; replaced two notification `useEffect`s with hook call; removed `showNotif` state; added AC1 permission request on sign-in (800ms delay); updated `SettingsScreen` props |

---

## Architecture Notes

- `useNotifications` placed in `shared/hooks/` — cross-cutting (used by app shell + settings feature)
- `NotifPanel.jsx` preserved (not deleted) — just not rendered from `mindflow.jsx`
- `notifications.js` + `notif-schedule.js` primitives unchanged — hook wraps them
- `visibilitychange` handler moved from `mindflow.jsx` into hook (single responsibility)
- `lang` change effect moved from `mindflow.jsx` into hook (schedule re-applies on lang change)
- Foreground-only limitation never hidden from user — `NotifDisclosure` shown in all states

---

## ADHD Design Compliance

| Principle | How met |
|-----------|---------|
| P1 — No shame | No red for "denied" state; neutral "Enable in browser settings" |
| P3 — Time blindness | Notifications serve as external time anchors for ADHD users |
| P6 — Soft rituals | Morning + evening reminders ≤ 2 min each, opt-in, no consequences for ignoring |
| P7 — No dark patterns | Inline settings (not modal); permission dialog has 800ms context delay |
| P9 — Ethical monetisation | Notifications are free — ADR P9 explicitly bars paywall on basic reminders |
| P12 — No countdown timers | No countdowns, no urgency language in notification settings |

---

## User-Visible Disclosure (CRITICAL)

The `NotifDisclosure` component renders in all notification states (unsupported, denied,
default, granted) with neutral styling (`C.surfaceHi` background, `C.textDim` text, ℹ️ icon):

> EN: "Notifications only work while the app is open in your browser."
> RU: "Уведомления работают, пока приложение открыто в браузере."
> AZ: "Bildirişlər yalnız proqram brauzerdə açıq olduğunda işləyir."

---

## Build Stats

```
dist/assets/index-D0qrK9Ua.js  471.08 kB │ gzip: 137.45 kB
Built in 973ms — 0 errors, 0 warnings
```
