# SHIPPED — Feature Shipping Log

**Purpose:** Single source of truth for what has landed in production. Read before starting any sprint to avoid re-implementing things that already exist.
**Updated:** After every sprint commit.
**Rule:** If it's not here — it may still be in CLAUDE.md sprint history. This file focuses on high-level feature areas.

---

## Sprint CG+ (2026-03-29) — Google Calendar Sync + Telegram + MochiChat + TodayPage

| Feature | Location | Notes |
|---------|----------|-------|
| TodayPage (Smart Daily View) | `src/features/today/TodayPage.tsx` | Adapts to time of day + energy. Default route (/) redirects to /today. Reduces decision fatigue. |
| MochiChat (Interactive AI Chat) | `src/features/mochi/MochiChat.tsx` | Bottom-sheet chat with Mochi. Session-only history (never persisted). Crisis detection on every message. Max 20 messages/session. Guest users see sign-in prompt. |
| Crisis detection | `src/shared/lib/crisisDetection.ts`, `crisisHotlines.ts` | Detects crisis text in MochiChat, shows hotline resources. Safety-critical. |
| Google Calendar Sync | `supabase/functions/gcal-store-token/`, `gcal-sync/` | OAuth with calendar.events scope. Settings section. `calendarSyncEnabled` + `calendarFocusBlocks` in store. |
| Telegram integration | `supabase/functions/telegram-webhook/` | `telegramLinkCode` + `telegramLinked` in store. Links Telegram account to MindShift. |
| mochiChatOpenCount | `src/store/index.ts` | Pulse indicator shown on Mochi button until opened 3 times. |

## Sprint CF (2026-03-29) — VOLAURA Bridge + UX Gates

| Feature | Location | Notes |
|---------|----------|-------|
| VOLAURA character event bridge | `src/shared/hooks/useVOLAURABridge.ts` | Fires events (focus_session_complete, task_done, streak_milestone) to VOLAURA API when user has linked account |
| In-App Review gate | `src/shared/lib/review.ts` | Triggers after 3rd successful session, not in low energy |
| Pool explanation guide | `src/features/tasks/PoolGuide.tsx` | i18n for all 6 locales |
| VOLAURA env var documented | `src/shared/lib/volaura.ts` | `VITE_VOLAURA_API_URL` + `VITE_VOLAURA_ANON_KEY` |

## Sprint CE (2026-03-21) — Server-Side Push Notifications

| Feature | Location | Notes |
|---------|----------|-------|
| VAPID public key constant | `src/shared/lib/vapid.ts` | Client-side key constant |
| Push subscription hook | `src/shared/hooks/usePushSubscription.ts` | Subscribe + upsert to Supabase |
| Push subscriptions table | `supabase/migrations/010_push_subscriptions.sql` | + RLS |
| pg_cron every 15 min | `supabase/migrations/011_push_cron.sql` | Requires extension in Supabase Dashboard |
| Scheduled push edge function | `supabase/functions/scheduled-push/index.ts` | Query deadlines → Web Push API |
| AppShell wiring | `src/app/AppShell.tsx` | `usePushSubscription` hook wired |

## Sprint CD (pre-CE) — First-Focus Interactive Tutorial

| Feature | Location | Notes |
|---------|----------|-------|
| `firstFocusTutorialCompleted` store field | `src/store/index.ts` | Persisted |
| FirstFocusTutorial component | `src/features/tutorial/FirstFocusTutorial.tsx` | 4-step overlay, lazy-loaded |
| App.tsx trigger | `src/app/App.tsx` | `onboardingCompleted && !firstFocusTutorialCompleted` |
| WelcomeWalkthrough guard | `src/shared/ui/WelcomeWalkthrough.tsx` | Doesn't show until tutorial complete |

## Sprint CC (pre-CD) — Mochi i18n (220 strings)

| Feature | Location | Notes |
|---------|----------|-------|
| Mochi i18n keys | `src/locales/en.json` | ~220 keys under `mochi.*` namespace |
| MochiSessionCompanion refactor | `src/features/focus/MochiSessionCompanion.tsx` | Removed 3 const objects, now uses `useTranslation()` |
| All 5 non-English locales | `src/locales/{ru,az,tr,de,es}.json` | Auto-translated |

## Sprint BB (2026-03-18) — Hardening

| Feature | Location | Notes |
|---------|----------|-------|
| Dead code removal | — | App.css, OnboardingFlow.tsx, useReducedMotion.ts, CoachMark.tsx (655 lines) |
| CORS hardened | `supabase/functions/*/index.ts` | ngrok wildcard → Vercel preview regex + stable production URL |
| Store cognitiveMode fix | `src/store/index.ts` | Removed from partialize; energyLevel added |

## Sprint BC (2026-03-17) — Decomposition

| Feature | Location | Notes |
|---------|----------|-------|
| FocusScreen split | `src/features/focus/` | FocusScreen.tsx (orchestrator ~450 lines) + FocusSetup.tsx (~459 lines) |
| dateUtils centralized | `src/shared/lib/dateUtils.ts` | All date formatting in one place |
| useSessionHistory optimized | `src/shared/hooks/useSessionHistory.ts` | React Query deduplication |

## Sprint AA — Google Auth + AI Mochi + User Memory

| Feature | Location | Notes |
|---------|----------|-------|
| Google OAuth | `src/features/auth/AuthScreen.tsx` | `signInWithOAuth({ provider: 'google' })`. Needs Supabase Dashboard config. |
| User Behavior Memory | `src/shared/hooks/useUserBehavior.ts` | `UserBehaviorProfile` from focus_sessions |
| AI Mochi edge function | `supabase/functions/mochi-respond/index.ts` | Gemini 2.5 Flash, 10/day rate limit |
| MochiSessionCompanion upgrade | `src/features/focus/MochiSessionCompanion.tsx` | Hardcoded fallback instant, AI replaces when available |
| `encouraging` mascot state | `src/shared/ui/Mascot.tsx` | Warm purple+teal gradient |

## Sprint Z — Session Log + Anti-Scroll Friction

| Feature | Location | Notes |
|---------|----------|-------|
| `/history` route | `src/features/history/HistoryPage.tsx` | Session timeline, grouped by date |
| S-7 SessionFrictionNudge | `src/app/AppShell.tsx` | 5s auto-dismiss nudge on navigate-away during session |

## Sprint Y — Task Reordering

| Feature | Location | Notes |
|---------|----------|-------|
| Drag-to-reorder | `src/features/tasks/TasksPage.tsx` | `DndContext` + `SortableContext`, TouchSensor 200ms delay |
| `reorderPool()` store action | `src/store/index.ts` | Updates `position` field |

## Sprint X — Focus Rooms

| Feature | Location | Notes |
|---------|----------|-------|
| `useFocusRoom` hook | `src/shared/hooks/useFocusRoom.ts` | Supabase Realtime presence, 4-char code |
| FocusRoomSheet | `src/features/focus/FocusRoomSheet.tsx` | Create/join/copy/peer list |

## Sprints A–W

See `CLAUDE.md` sprint history for complete listing of Sprints A through W.

---

## Infra Status

| Item | Status |
|------|--------|
| Vercel deploy | ✅ Auto-deploys `main`. URL: `mind-shift-git-main-yusifg27-3093s-projects.vercel.app` |
| Supabase DB | ✅ Live (auth works, tasks persist) |
| Edge functions | ✅ 6 functions written. Run `supabase functions list` to confirm deployed |
| Push (client SW) | ✅ SW has push + notificationclick handlers |
| Push (server VAPID) | ✅ Sprint CE — scheduled-push edge function + migrations ready |
| Google Play | ⏳ Account verification pending |
