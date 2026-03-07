# ADR 0010 — Push Notifications: localStorage, Foreground-Only, setTimeout

**Date:** 2026-03-08
**Bolt:** 2.6 — Push Notifications (PWA Local Reminders)
**Status:** Accepted

---

## Context

MindFocus users benefit from morning ritual reminders ("plan your day") and evening review
reminders ("reflect on today"). Without reminders, ADHD users are especially prone to
time blindness and missing daily rituals (adhd-aware-planning Principle 3, 6).

Three technical approaches exist:
1. **localStorage + setTimeout** — foreground-only, tab must be open
2. **Service Worker + Web Push (VAPID)** — true background delivery, requires server
3. **Native Push (FCM/APNS)** — requires mobile native app wrapper

---

## Decision 1: localStorage for preference persistence (not Supabase)

### Why NOT Supabase

- Notification preferences are private device settings, not user data
- No cross-device sync needed (notifications fire from the open tab on each device)
- Supabase query on every app load adds latency for non-critical state
- RLS overhead for a simple key-value store is disproportionate

### Why localStorage

- Zero latency: `loadNotifPrefs()` is synchronous, available on first render
- No auth dependency: works even if Supabase is unreachable
- Storage key: `"mf_notif_prefs"` — consistent with existing pattern from Bolt 1.2
- Trade-off: preferences lost if user clears browser storage. Acceptable for MVP.

---

## Decision 2: setTimeout scheduling (foreground-only), not Service Worker Push

### Rejected: Service Worker + VAPID

VAPID push requires:
1. A server endpoint to receive subscription objects
2. VAPID key pair generation + rotation
3. Push subscription lifecycle management per device
4. Background push delivery infrastructure (complex for a Vite + Supabase, no-Node setup)

This is 2–3 bolts of work for MVP. It violates the principle of minimal viable
infrastructure. The complexity is not justified by the marginal UX benefit at this stage.

### Chosen: setTimeout with foreground-only delivery

`scheduleNotification(title, body, timeStr)` in `shared/lib/notifications.js`:
- Computes ms until next occurrence of `timeStr` (tomorrow if already past today)
- Fires `new Notification(title, opts)` via Web Notifications API
- Auto-reschedules for next day after firing

**Limitation:** Notifications only fire when the browser tab is open.
**Mitigation:** This limitation is **explicitly disclosed to users** in the Settings UI
via `NotifDisclosure` component (AC critical requirement).

---

## Decision 3: Single permission request on first login (AC1)

Browser native permission prompt is shown once:
- Fires 800ms after sign-in (after "today" screen is visible, to give context)
- Only if `Notification.permission === "default"` (not yet decided)
- If user denies: Settings shows soft inline hint "Enable in browser settings" (no red)
- If unsupported: Settings shows neutral "not supported" message
- `Notification.requestPermission()` is idempotent — calling again when "denied" is a no-op

Why 800ms delay: let the UI settle so the permission dialog has context (ADHD P7 — no
jarring interruptions).

---

## Decision 4: useNotifications hook in shared/hooks/ (not features/)

The hook is consumed by:
1. `mindflow.jsx` — permission request on login, pass state down to SettingsScreen
2. `features/settings/index.jsx` — reads state + triggers updates

It is cross-cutting (used by app shell + feature), so `shared/hooks/` is correct per
the vertical slice architecture rule. Features never import from each other.

---

## Decision 5: Inline settings UI, not modal (AC9)

The previous `NotifPanel.jsx` was a bottom-sheet modal. Per ADHD Principle 7
(no dark patterns) and the bolt spec (AC9), the notification settings must be
**inline inside the Reminders card** in SettingsScreen.

`NotifPanel.jsx` is preserved (not deleted) in case it's needed for other purposes,
but is no longer rendered from `mindflow.jsx`.

---

## Decision 6: Fail-silent on unsupported browsers (AC7)

`shared/lib/notifications.js` already guards all calls with `"Notification" in window`.
`useNotifications` initializes `permissionState` to `"unsupported"` when the API is absent.
No errors, no crashes — `NotifInline` renders a neutral "not supported" message.

---

## Upgrade Path to VAPID (Post-MVP)

When the app has a Node/Edge backend:
1. Add VAPID key pair to environment variables
2. Add `/api/push-subscribe` endpoint to store `PushSubscription` objects in Supabase
3. Add `/api/push-send` endpoint for server-side push dispatch
4. Migrate `useNotifications` to register a Service Worker + subscribe to push
5. Remove setTimeout-based scheduling (keep as fallback for unsupported browsers)

The `useNotifications` hook interface (`requestPermission`, `scheduleReminders`, etc.)
does not change — callers are insulated from the implementation change.

---

## Alternatives Considered

| Option | Rejected Reason |
|--------|----------------|
| VAPID + Service Worker | Requires server, complex lifecycle — 3 bolts of work for MVP |
| Native push (FCM) | Requires native app wrapper, out of scope |
| Supabase for prefs | Over-engineered for a simple key-value preference |
| Modal for settings | ADHD P7 — inline is less disruptive |
| Countdown timer in Settings | ADHD P12 — never use countdown timers |
| Red color for "denied" state | ADHD P1 — no urgency colors for soft states |

---

## Implementation

- Hook: `src/shared/hooks/useNotifications.js`
- Inline UI: `NotifInline` + `NotifDisclosure` in `src/features/settings/index.jsx`
- Permission request: `src/mindflow.jsx` sign-in useEffect (800ms delay)
- Schedule primitives: `shared/lib/notifications.js` + `shared/lib/notif-schedule.js` (unchanged)
