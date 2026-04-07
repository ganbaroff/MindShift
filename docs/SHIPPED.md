# SHIPPED — Feature Shipping Log

**Purpose:** Single source of truth for what has landed in production. Read before starting any sprint to avoid re-implementing things that already exist.
**Updated:** After every sprint commit.
**Rule:** If it's not here — it may still be in CLAUDE.md sprint history. This file focuses on high-level feature areas.

## Session 91 (2026-04-07) — Agent Marketplace + Sprint E2 plan

| Item | Location | Notes |
|------|----------|-------|
| Plugin Marketplace (private) | `github.com/ganbaroff/volaura-claude-plugins` | 8 production-tested agents + 5 slash commands. Setup: `.claude/settings.json` `extraKnownMarketplaces` + `enabledPlugins`. |
| 8 agents extracted + verified | telemetry: 99 invocations across 3 sessions | growth (24), code-reviewer (22), a11y-scanner (14), liveops (10), sec (9), e2e-runner (7), infra (6), guardrail-auditor (5) |
| Dead agents deleted | `.claude/agents/` | bundle-analyzer (CI gate replaces), build-error-resolver (hooks.json tsc replaces) |
| Sprint E2 Option D planned | `~/.claude/projects/C--Projects-VOLAURA/memory/mindshift-sprint-e2-plan.md` | Mapping table approach. Awaiting VOLAURA-Claude D2 backend. |
| Honesty hooks (UserPromptSubmit) | `~/.claude/hooks/honesty-prompt-guard.sh` | Forces "## Что проверено" sections on trigger words. Stop hook tried + disabled (architectural). |
| ESLint Law 1 enforcer | `eslint.config.js` | `no-restricted-syntax` blocks red Tailwind classes + red hex codes at lint time. |
| 4 background research audits | `memory/synthesis-4-audits.md`, `memory/agent-audit-mindshift-real-usage.md`, `memory/swarm-runtime-audit.md`, `memory/research-shared-agents-monorepo.md` | Found: my agents work (telemetry proof), VOLAURA swarm operational (5 successful runs), Plugin Marketplace = best extraction pattern |

## Session 88 (2026-04-06) — PWA cache fix + edge functions revival

| Item | Location | Notes |
|------|----------|-------|
| Settings crash fixed | `src/app/App.tsx` | `lazyWithReload()` wraps 13 lazy routes. SW serving stale chunks → auto-reload once via sessionStorage guard. |
| Constitution 3 fixes | `src/features/progress/XpCard.tsx`, `src/shared/ui/Confetti.tsx`, `src/shared/ui/Button.tsx` | Removed raw "2,450 XP", reduced confetti 20→12, renamed danger→warning variant |
| Lint errors fixed | 30 errors blocking CI for 5+ days | unblocked Deploy Edge Functions workflow |
| Edge functions revived | `supabase/functions/*` | All 14 functions deployed after fixing CI blockers (was broken since April 1) |
| Cross-repo sync workflows | `.github/workflows/sync-to-zeus.yml` (3 repos) | ZEUS Gateway notified on every push to main (+ GitHub Secrets configured) |
| MindShift CLAUDE.md rewrite | Top-level CLAUDE.md | Frame: Constitution + Foundation Laws table + ecosystem context + working protocol |
| 10 MindShift agents \u2192 VOLAURA | `.claude/agents/` (in both repos) | Imported MindShift agents into VOLAURA replacing 39 dead ones |

## BATCH-2026-03-30-M — Play Store Assets

| Item | Location | Notes |
|------|----------|-------|
| Play Store screenshots (8) | `public/screenshots/playstore/` | 780×1688 (390×844 @2×), dark mode, seeded demo state |
| Screenshot capture script | `scripts/capture-screenshots.ts` | `npx tsx scripts/capture-screenshots.ts` |
| icon-192-maskable.png | `public/icon-192-maskable.png` | Generated from icon-512-maskable; was missing |
| manifest.json screenshots[] | `public/manifest.json` | 8 narrow + 1 wide entry |
| DifficultyDots crash fix | `src/components/TaskCard.tsx:22` | `DIFFICULTY_MAP[difficulty] ?? DIFFICULTY_MAP[1]` |

## BATCH-2026-03-30-L — useAudioEngine Decomposition

| Item | Location | Notes |
|------|----------|-------|
| useAudioEngine (thin orchestrator) | `src/shared/hooks/useAudioEngine.ts` | 523L → 202L |
| audioGain.ts | `src/shared/lib/audioGain.ts` | Log volume mapping + FADE curves |
| audioWorklet.ts | `src/shared/lib/audioWorklet.ts` | Singleton worklet loader |
| audioBuffers.ts | `src/shared/lib/audioBuffers.ts` | Pink/nature/lofi/brown/gamma buffers |
| sonicAnchor.ts | `src/shared/lib/sonicAnchor.ts` | Cmaj9 Pavlovian focus cue |

## BATCH-2026-03-30-K — E2E Onboarding Sync

| Item | Location | Notes |
|------|----------|-------|
| Onboarding E2E (5-step) | `e2e/onboarding.spec.ts` | Was 3-step; synced to timeBlindness + emotionalReactivity steps |

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
