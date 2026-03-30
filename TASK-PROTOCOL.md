# TASK-PROTOCOL v5.0 — MindShift Swarm Execution Standard

> **Owner:** Yusif Ganbarov
> **Project:** MindShift — ADHD-aware productivity PWA
> **Adapted:** 2026-03-30 from VOLAURA swarm methodology
> **Status:** ACTIVE — all Claude Code sessions must follow this protocol

---

## WHAT THIS IS

A self-organizing protocol for Claude Code agents working on MindShift. Instead of one agent doing everything sequentially, the **team reads in parallel, proposes together, then executes in coordinated batches**. This eliminates "I'll try this and see", prevents architecture regressions, and produces auditable work logs.

This is not a suggestion. This is the operating system.

---

## THE FIVE STEPS (non-negotiable order)

```
0.5  FLOW DETECTION    → classify task type, pick agent(s)
1.0  TEAM READS        → parallel reads, all relevant files
1.5  TEAM PROPOSES     → each agent returns ranked findings
2.0  DEBATE + LOCK     → triage, priority vote, declare BATCH-ID
3.0  EXECUTE           → implement, tsc -b, commit
4.0  CLOSE             → update docs, memory, "what's next"
```

**MICRO fastpath (≤10 lines, zero arch risk):** skip steps 1.5–2.0, execute directly.
**LARGE (>400 lines):** mandatory architect review before touching a line of code.

---

## STEP 0.5 — FLOW DETECTION

Before anything else, classify the incoming task:

| Signal | → Route to |
|--------|-----------|
| "bug" / error / crash / test failing | `build-error-resolver` agent |
| "E2E" / Playwright / spec failing | `e2e-runner` agent |
| audit / security / performance / analyze | `Explore` agent × 4 (swarm) |
| new feature | `Plan` agent → then `general-purpose` |
| refactor > 200 lines | `Plan` → mandatory architect review → `general-purpose` |
| copy / UX text | `humanizer` skill |
| ≤10 lines, obvious fix | MICRO fastpath → `Edit` directly |

---

## STEP 1.0 — TEAM READS (parallel)

All agents read their domain files simultaneously. Never read sequentially.

### Agent Roster

| Agent ID | Domain | Primary Files |
|----------|--------|---------------|
| **ARCH** | Architecture, store, decomposition | [`src/store/index.ts`](src/store/index.ts) · [`src/app/App.tsx`](src/app/App.tsx) · [`src/app/AppShell.tsx`](src/app/AppShell.tsx) · [`src/types/index.ts`](src/types/index.ts) · [`src/types/database.ts`](src/types/database.ts) |
| **SEC** | Security, auth, edge functions, GDPR | [`src/shared/lib/supabase.ts`](src/shared/lib/supabase.ts) · [`src/app/AuthGuard.tsx`](src/app/AuthGuard.tsx) · [`supabase/functions/`](supabase/functions/) · [`.env.example`](.env.example) |
| **PERF** | Bundle, React perf, hooks, memoization | [`vite.config.ts`](vite.config.ts) · [`src/features/focus/useFocusSession.ts`](src/features/focus/useFocusSession.ts) · [`src/shared/hooks/useAudioEngine.ts`](src/shared/hooks/useAudioEngine.ts) · [`src/features/focus/MochiSessionCompanion.tsx`](src/features/focus/MochiSessionCompanion.tsx) |
| **UX** | ADHD safety, copy, a11y, motion | [`src/features/home/HomePage.tsx`](src/features/home/HomePage.tsx) · [`src/features/focus/FocusScreen.tsx`](src/features/focus/FocusScreen.tsx) · [`src/features/tasks/TasksPage.tsx`](src/features/tasks/TasksPage.tsx) · [`src/components/TaskCard.tsx`](src/components/TaskCard.tsx) |
| **TEST** | E2E, unit, coverage gaps | [`e2e/`](e2e/) · [`src/store/__tests__/store.test.ts`](src/store/__tests__/store.test.ts) · [`src/shared/lib/__tests__/`](src/shared/lib/__tests__/) · [`playwright.config.ts`](playwright.config.ts) |
| **INFRA** | PWA, SW, push, deploy, Capacitor | [`src/sw.ts`](src/sw.ts) · [`public/manifest.json`](public/manifest.json) · [`vercel.json`](vercel.json) · [`capacitor.config.ts`](capacitor.config.ts) · [`supabase/migrations/`](supabase/migrations/) |

---

## STEP 1.5 — TEAM PROPOSES

Each agent reads their domain and returns proposals in this format:

```
AGENT: {ID}
FINDING: {one line — what's wrong}
SEVERITY: P0 | P1 | P2 | P3
EFFORT: MICRO (≤10 lines) | SMALL (1-4h) | MEDIUM (4-8h) | LARGE (2+ days)
FILE: {exact path}
FIX: {exact change in plain English}
BLOCKS_LAUNCH: yes | no
```

**P0** = data loss / security breach / crash
**P1** = user-facing bug / compliance gap / launch blocker
**P2** = performance / technical debt
**P3** = polish / nice-to-have

---

## STEP 2.0 — DEBATE + BATCH LOCK

### Priority rules (non-negotiable)
1. P0 always executes first, regardless of effort
2. MICRO items batch together (≤5 per batch)
3. LARGE items require Yusif approval before execution
4. Nothing ships without `tsc -b` passing

### Batch naming
```
BATCH-{YYYY-MM-DD}-{LETTER}
Example: BATCH-2026-03-30-G
```

Each batch gets a commit with the batch ID in the message.

### Veto rules
- Any item touching `src/store/index.ts` beyond adding a field → architect review
- Any item adding a dependency → bundle size check first
- Any item modifying edge functions → check rate limit logic untouched
- Any item with red color, shame language, urgency copy → rejected immediately

---

## STEP 3.0 — EXECUTE

```bash
# Before starting any item:
npx tsc -b   # must be clean before you touch anything

# After every item:
npx tsc -b   # must pass before moving to next item

# Before commit:
npx tsc -b && npm run build   # both must pass
```

### Commit format (Sentry convention)
```
{type}: {description} ({BATCH-ID})

- item 1: what changed and why
- item 2: what changed and why

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

Types: `fix` · `feat` · `perf` · `refactor` · `test` · `chore` · `docs`

---

## STEP 4.0 — CLOSE

After every batch:
1. Update [`docs/SHIPPED.md`](docs/SHIPPED.md) with batch summary
2. Update [`memory/projects/mindshift.md`](memory/projects/mindshift.md) if tech debt changed
3. Update [`docs/AUDIT-v1.md`](docs/AUDIT-v1.md) if security/perf items resolved
4. Run `npx playwright test` — must stay green
5. Report "what's next" from remaining backlog

---

## AUDIT PROTOCOL — MindShift Standard v2.0

Run this before every launch gate. 6 domains, parallel agents.

### Domain Map

| Domain | Standard | Agent | Key Files |
|--------|----------|-------|-----------|
| **SEC-1** OWASP Top 10 | OWASP 2021 | SEC | Edge functions, SW, auth flow |
| **SEC-2** Data leakage | GDPR Art. 17/20 | SEC | `.env`, supabase client init, Sentry config |
| **PERF-1** Core Web Vitals | Google CWV 2024 | PERF | Bundle size, lazy loads, LCP path |
| **PERF-2** React perf | Vercel React guidelines | PERF | Re-render counts, memo usage, effect deps |
| **INT-1** Data integrity | Internal MindShift standard | ARCH | Store mutations, task sync, session save |
| **PWA-1** Install + offline | PWA Checklist 2024 | INFRA | manifest.json, SW scope, offline.html |
| **A11Y-1** Accessibility | WCAG 2.2 AA | UX | aria attrs, focus rings, motion gates |
| **ADHD-1** Neuroinclusion | MindShift guardrails | UX | Color palette, shame language, urgency copy |

### Stress Test Checklist

```
□ 500 tasks in store — does TasksPage lag?
□ 90-min session — does timer drift? does phase not fire at 7/15 min?
□ Offline → complete task → go online → did task sync?
□ Tab close at 30 min into session → reopen → does ms_pending_session show toast?
□ IDB quota exceeded → does state survive via localStorage backup?
□ Auth token expired mid-session → does app recover gracefully?
□ Service worker update available → does user get prompted?
□ Push notification while app is in background → does it open correct route?
□ Low energy mode (energyLevel=1) → does UI simplify correctly?
□ RecoveryProtocol after 72h → does it not override non-absent sessions?
```

---

## FILE REGISTRY (all source files)

### App Shell
- [`src/app/App.tsx`](src/app/App.tsx) — Router, auth, overlay orchestration
- [`src/app/AppShell.tsx`](src/app/AppShell.tsx) — Layout, BottomNav, offline bar, friction nudge
- [`src/app/AuthGuard.tsx`](src/app/AuthGuard.tsx) — Route protection, onboarding redirect
- [`src/app/BottomNav.tsx`](src/app/BottomNav.tsx) — Navigation tabs (Today/Tasks/Focus/Progress/Settings)
- [`src/main.tsx`](src/main.tsx) — App entry, Sentry init, auth state → setUser

### State
- [`src/store/index.ts`](src/store/index.ts) — **949 lines** — Zustand v5, 6 slices, persist via idbStorage ⚠️ OVER GUARDRAIL
- [`src/types/index.ts`](src/types/index.ts) — Domain types, ACHIEVEMENT_DEFINITIONS, WIDGET_DEFAULTS, DIFFICULTY_MAP
- [`src/types/database.ts`](src/types/database.ts) — Supabase table types

### Features
- [`src/features/auth/AuthScreen.tsx`](src/features/auth/AuthScreen.tsx) — Magic link + Google OAuth
- [`src/features/onboarding/OnboardingPage.tsx`](src/features/onboarding/OnboardingPage.tsx) — 3-step onboarding + revisit mode
- [`src/features/today/TodayPage.tsx`](src/features/today/TodayPage.tsx) — Smart daily view (default route `/today`)
- [`src/features/home/HomePage.tsx`](src/features/home/HomePage.tsx) — BentoGrid, daily brief, focus goal progress
- [`src/features/home/BurnoutAlert.tsx`](src/features/home/BurnoutAlert.tsx) — Amber/purple burnout card (score 41+)
- [`src/features/home/BurnoutGauge.tsx`](src/features/home/BurnoutGauge.tsx) — Burnout gauge widget
- [`src/features/home/BurnoutNudgeCard.tsx`](src/features/home/BurnoutNudgeCard.tsx) — Proactive 48h-cooldown nudge
- [`src/features/home/EnergyCheckin.tsx`](src/features/home/EnergyCheckin.tsx) — Energy picker on homepage
- [`src/features/tasks/TasksPage.tsx`](src/features/tasks/TasksPage.tsx) — NOW/NEXT/SOMEDAY pools, drag-reorder, search
- [`src/features/tasks/RecoveryProtocol.tsx`](src/features/tasks/RecoveryProtocol.tsx) — Full-screen 72h+ return overlay (z-50)
- [`src/features/tasks/ContextRestore.tsx`](src/features/tasks/ContextRestore.tsx) — Half-screen 30-72h return overlay (z-40)
- [`src/features/tasks/contextRestoreUtils.ts`](src/features/tasks/contextRestoreUtils.ts) — Absence duration helpers
- [`src/features/focus/FocusScreen.tsx`](src/features/focus/FocusScreen.tsx) — Focus orchestrator (~350 lines)
- [`src/features/focus/FocusSetup.tsx`](src/features/focus/FocusSetup.tsx) — Task picker + duration selector + ADHD tips
- [`src/features/focus/useFocusSession.ts`](src/features/focus/useFocusSession.ts) — **627 lines** — Timer FSM, phases, Supabase save ⚠️ OVER GUARDRAIL
- [`src/features/focus/ArcTimer.tsx`](src/features/focus/ArcTimer.tsx) — SVG arc: countdown/countup/surprise modes
- [`src/features/focus/SessionControls.tsx`](src/features/focus/SessionControls.tsx) — Audio toggle, end session, park-thought FAB
- [`src/features/focus/PostSessionFlow.tsx`](src/features/focus/PostSessionFlow.tsx) — NatureBuffer, energy check-in, hyperfocus autopsy
- [`src/features/focus/MochiSessionCompanion.tsx`](src/features/focus/MochiSessionCompanion.tsx) — AI body-double companion
- [`src/features/focus/BreathworkRitual.tsx`](src/features/focus/BreathworkRitual.tsx) — 3-cycle breathwork overlay (lazy z-50)
- [`src/features/focus/ShutdownRitual.tsx`](src/features/focus/ShutdownRitual.tsx) — Evening wind-down 9pm+ (lazy z-50)
- [`src/features/focus/WeeklyPlanning.tsx`](src/features/focus/WeeklyPlanning.tsx) — Weekly planning ritual (lazy z-50)
- [`src/features/focus/MonthlyReflection.tsx`](src/features/focus/MonthlyReflection.tsx) — Monthly reflection ritual (lazy z-50)
- [`src/features/focus/FocusRoomSheet.tsx`](src/features/focus/FocusRoomSheet.tsx) — Realtime presence room UI
- [`src/features/history/HistoryPage.tsx`](src/features/history/HistoryPage.tsx) — Session log grouped by date
- [`src/features/mochi/MochiChat.tsx`](src/features/mochi/MochiChat.tsx) — AI chat bottom-sheet (20 msg limit, crisis detection)
- [`src/features/progress/ProgressPage.tsx`](src/features/progress/ProgressPage.tsx) — XP, streaks, achievements, psychotype
- [`src/features/progress/AchievementGrid.tsx`](src/features/progress/AchievementGrid.tsx) — Achievement grid with tooltips
- [`src/features/progress/Avatar.tsx`](src/features/progress/Avatar.tsx) — User avatar component
- [`src/features/settings/SettingsPage.tsx`](src/features/settings/SettingsPage.tsx) — **868 lines** ⚠️ OVER GUARDRAIL
- [`src/features/settings/AccountSection.tsx`](src/features/settings/AccountSection.tsx) — Auth, GDPR, data export
- [`src/features/settings/AudioSection.tsx`](src/features/settings/AudioSection.tsx) — Sound presets, volume
- [`src/features/settings/IntegrationsSection.tsx`](src/features/settings/IntegrationsSection.tsx) — Google Calendar, Telegram
- [`src/features/settings/SettingsPrimitives.tsx`](src/features/settings/SettingsPrimitives.tsx) — Toggle, chip, section primitives
- [`src/features/tutorial/FirstFocusTutorial.tsx`](src/features/tutorial/FirstFocusTutorial.tsx) — 4-step new-user overlay (lazy z-50)
- [`src/features/calendar/DueDateScreen.tsx`](src/features/calendar/DueDateScreen.tsx) — Tasks grouped by deadline
- [`src/features/legal/PrivacyPage.tsx`](src/features/legal/PrivacyPage.tsx)
- [`src/features/legal/TermsPage.tsx`](src/features/legal/TermsPage.tsx)
- [`src/features/legal/CookiePolicyPage.tsx`](src/features/legal/CookiePolicyPage.tsx)
- [`src/features/preview/PreviewScreen.tsx`](src/features/preview/PreviewScreen.tsx)

### Shared UI
- [`src/shared/ui/Button.tsx`](src/shared/ui/Button.tsx)
- [`src/shared/ui/Card.tsx`](src/shared/ui/Card.tsx)
- [`src/shared/ui/Mascot.tsx`](src/shared/ui/Mascot.tsx) — Mochi states: idle/focused/celebrating/resting/encouraging
- [`src/shared/ui/ErrorBoundary.tsx`](src/shared/ui/ErrorBoundary.tsx)
- [`src/shared/ui/LoadingScreen.tsx`](src/shared/ui/LoadingScreen.tsx)
- [`src/shared/ui/InstallBanner.tsx`](src/shared/ui/InstallBanner.tsx)
- [`src/shared/ui/CookieBanner.tsx`](src/shared/ui/CookieBanner.tsx)
- [`src/shared/ui/EmptyState.tsx`](src/shared/ui/EmptyState.tsx)
- [`src/shared/ui/Confetti.tsx`](src/shared/ui/Confetti.tsx)
- [`src/shared/ui/QuickCapture.tsx`](src/shared/ui/QuickCapture.tsx)
- [`src/shared/ui/ShareCard.tsx`](src/features/../shared/ui/ShareCard.tsx)
- [`src/shared/ui/DiscoveryCard.tsx`](src/shared/ui/DiscoveryCard.tsx)
- [`src/shared/ui/WelcomeWalkthrough.tsx`](src/shared/ui/WelcomeWalkthrough.tsx)
- [`src/shared/ui/TransitionNudge.tsx`](src/shared/ui/TransitionNudge.tsx)
- [`src/shared/ui/FeatureHint.tsx`](src/shared/ui/FeatureHint.tsx)
- [`src/shared/ui/PageTransition.tsx`](src/shared/ui/PageTransition.tsx)
- [`src/shared/ui/Input.tsx`](src/shared/ui/Input.tsx)

### Shared Components (legacy — src/components/)
- [`src/components/TaskCard.tsx`](src/components/TaskCard.tsx) — React.memo, drag handle, due date pill, reminder badge
- [`src/components/AddTaskModal.tsx`](src/components/AddTaskModal.tsx) — Voice input, due date, notes, difficulty
- [`src/components/EnergyPicker.tsx`](src/components/EnergyPicker.tsx) — 1-5 energy selector, aria-pressed
- [`src/components/Fab.tsx`](src/components/Fab.tsx) — Floating action button
- [`src/components/MochiAvatar.tsx`](src/components/MochiAvatar.tsx)
- [`src/components/addTaskFields.tsx`](src/components/addTaskFields.tsx)

### Hooks
- [`src/shared/hooks/useAudioEngine.ts`](src/shared/hooks/useAudioEngine.ts) — **522 lines** — Web Audio, 5 presets, phase-adaptive gain
- [`src/shared/hooks/useCalendarSync.ts`](src/shared/hooks/useCalendarSync.ts) — Google Calendar sync
- [`src/shared/hooks/useDeadlineReminders.ts`](src/shared/hooks/useDeadlineReminders.ts) — Gentle due-date toasts
- [`src/shared/hooks/useFocusRoom.ts`](src/shared/hooks/useFocusRoom.ts) — Supabase Realtime presence rooms
- [`src/shared/hooks/useI18n.ts`](src/shared/hooks/useI18n.ts) — React hook: `{ t, locale }`
- [`src/shared/hooks/useInAppReview.ts`](src/shared/hooks/useInAppReview.ts) — In-app review trigger after 3rd session
- [`src/shared/hooks/useInstallPrompt.ts`](src/shared/hooks/useInstallPrompt.ts) — PWA beforeinstallprompt
- [`src/shared/hooks/useMotion.ts`](src/shared/hooks/useMotion.ts) — `shouldAnimate` + `t()` transition helper
- [`src/shared/hooks/useOfflineSync.ts`](src/shared/hooks/useOfflineSync.ts) — Offline queue drain on reconnect
- [`src/shared/hooks/useOverlayState.ts`](src/shared/hooks/useOverlayState.ts) — Overlay priority logic (recovery/shutdown/monthly/weekly)
- [`src/shared/hooks/usePalette.ts`](src/shared/hooks/usePalette.ts) — Desaturated palette in calm/focused mode
- [`src/shared/hooks/usePendingSessionRecovery.ts`](src/shared/hooks/usePendingSessionRecovery.ts) — Toast on app load if session was interrupted
- [`src/shared/hooks/usePushSubscription.ts`](src/shared/hooks/usePushSubscription.ts) — Web Push subscription → Supabase
- [`src/shared/hooks/useSessionHistory.ts`](src/shared/hooks/useSessionHistory.ts) — React Query: last 30 days of focus_sessions
- [`src/shared/hooks/useTaskSync.ts`](src/shared/hooks/useTaskSync.ts) — Bidirectional Supabase↔store sync
- [`src/shared/hooks/useUITone.ts`](src/shared/hooks/useUITone.ts) — UI tone (gen_z/millennial/gen_x/neutral)
- [`src/shared/hooks/useUserBehavior.ts`](src/shared/hooks/useUserBehavior.ts) — Behavior profile for Mochi AI
- [`src/shared/hooks/useVoiceInput.ts`](src/shared/hooks/useVoiceInput.ts) — SpeechRecognition + classify-voice-input
- [`src/shared/hooks/__tests__/useUserBehavior.test.ts`](src/shared/hooks/__tests__/useUserBehavior.test.ts)

### Libs
- [`src/shared/lib/burnout.ts`](src/shared/lib/burnout.ts) — `computeBurnoutScore(behaviors[])` — 4-signal formula
- [`src/shared/lib/constants.ts`](src/shared/lib/constants.ts) — All numeric constants (XP, phases, audio, session stops)
- [`src/shared/lib/cn.ts`](src/shared/lib/cn.ts) — clsx/tailwind-merge helper
- [`src/shared/lib/crisisDetection.ts`](src/shared/lib/crisisDetection.ts) — Crisis keyword detection for MochiChat
- [`src/shared/lib/crisisHotlines.ts`](src/shared/lib/crisisHotlines.ts) — Regional crisis hotline data
- [`src/shared/lib/dateUtils.ts`](src/shared/lib/dateUtils.ts) — Centralised date helpers
- [`src/shared/lib/haptic.ts`](src/shared/lib/haptic.ts) — 9 ADHD-safe haptic patterns
- [`src/shared/lib/idbStorage.ts`](src/shared/lib/idbStorage.ts) — Zustand StateStorage adapter (IDB + localStorage backup)
- [`src/shared/lib/logger.ts`](src/shared/lib/logger.ts) — logError → Sentry
- [`src/shared/lib/mochiDiscoveries.ts`](src/shared/lib/mochiDiscoveries.ts) — Discovery/tip pool for Mochi
- [`src/shared/lib/motion.ts`](src/shared/lib/motion.ts) — Animation presets (spring configs)
- [`src/shared/lib/native.ts`](src/shared/lib/native.ts) — Capacitor runtime bridge (haptic, statusbar, share)
- [`src/shared/lib/notify.ts`](src/shared/lib/notify.ts) — Push notification scheduling
- [`src/shared/lib/offlineQueue.ts`](src/shared/lib/offlineQueue.ts) — `enqueue()`/`dequeue()` for offline writes
- [`src/shared/lib/psychotype.ts`](src/shared/lib/psychotype.ts) — `deriveFromSessions()` — 4-axis psychotype re-derivation
- [`src/shared/lib/quickParse.ts`](src/shared/lib/quickParse.ts) — Natural language task parsing
- [`src/shared/lib/reminders.ts`](src/shared/lib/reminders.ts) — Local notification scheduling
- [`src/shared/lib/supabase.ts`](src/shared/lib/supabase.ts) — Supabase client init
- [`src/shared/lib/uiTone.ts`](src/shared/lib/uiTone.ts) — UI tone resolver
- [`src/shared/lib/vapid.ts`](src/shared/lib/vapid.ts) — VAPID key helpers
- [`src/shared/lib/voiceClassify.ts`](src/shared/lib/voiceClassify.ts) — Voice input classification logic
- [`src/shared/lib/volaura-bridge.ts`](src/shared/lib/volaura-bridge.ts) — VOLAURA API event bridge (session/task/streak)
- [`src/shared/lib/zIndex.ts`](src/shared/lib/zIndex.ts) — z-index constants
- [`src/shared/lib/i18n/en.ts`](src/shared/lib/i18n/en.ts) — i18n English strings
- [`src/shared/lib/i18n/ru.ts`](src/shared/lib/i18n/ru.ts) — i18n Russian strings
- [`src/shared/lib/i18n/index.ts`](src/shared/lib/i18n/index.ts) — `resolveLocale()` + `t()`

### i18n locales
- [`src/locales/en.js`](src/locales/en.js) · [`src/locales/ru.js`](src/locales/ru.js) · [`src/locales/tr.js`](src/locales/tr.js) · [`src/locales/az.js`](src/locales/az.js)

### Service Worker + PWA
- [`src/sw.ts`](src/sw.ts) — Push handler, notification click (origin-validated), offline cache
- [`src/i18n.ts`](src/i18n.ts) — i18next setup
- [`src/index.css`](src/index.css) — CSS design tokens (`:root` vars), `[data-mode="calm"]` overrides
- [`public/manifest.json`](public/manifest.json) — PWA manifest: 4 shortcuts, screenshots, categories
- [`public/offline.html`](public/offline.html) — Offline fallback page
- [`public/audio-worklets/brown-noise-processor.js`](public/audio-worklets/brown-noise-processor.js)

### Supabase Edge Functions
- [`supabase/functions/decompose-task/index.ts`](supabase/functions/decompose-task/index.ts) — AI task breakdown (20/hr free, unlimited pro)
- [`supabase/functions/mochi-respond/index.ts`](supabase/functions/mochi-respond/index.ts) — AI mascot (Gemini 2.5 Flash, 10/day free)
- [`supabase/functions/recovery-message/index.ts`](supabase/functions/recovery-message/index.ts) — 72h return message
- [`supabase/functions/weekly-insight/index.ts`](supabase/functions/weekly-insight/index.ts) — Weekly summary
- [`supabase/functions/classify-voice-input/index.ts`](supabase/functions/classify-voice-input/index.ts) — Voice → task fields
- [`supabase/functions/gdpr-export/index.ts`](supabase/functions/gdpr-export/index.ts) — Data export (3/day, Article 20)
- [`supabase/functions/gdpr-delete/index.ts`](supabase/functions/gdpr-delete/index.ts) — Full erasure (Article 17)
- [`supabase/functions/gcal-store-token/index.ts`](supabase/functions/gcal-store-token/index.ts) — Google Calendar token storage
- [`supabase/functions/gcal-sync/index.ts`](supabase/functions/gcal-sync/index.ts) — Calendar event sync
- [`supabase/functions/scheduled-push/index.ts`](supabase/functions/scheduled-push/index.ts) — Server-side push (needs pg_cron)
- [`supabase/functions/telegram-webhook/index.ts`](supabase/functions/telegram-webhook/index.ts) — Telegram bot webhook
- [`supabase/functions/_shared/rateLimit.ts`](supabase/functions/_shared/rateLimit.ts) — DB-backed rate limiter
- [`supabase/functions/_shared/cors.ts`](supabase/functions/_shared/cors.ts) — CORS headers (Vercel origin regex)

### Migrations
- [`supabase/migrations/001_init.sql`](supabase/migrations/001_init.sql) — Core tables: tasks, focus_sessions, user_behavior, profiles
- [`supabase/migrations/002_subscriptions.sql`](supabase/migrations/002_subscriptions.sql)
- [`supabase/migrations/003_dashboard_config.sql`](supabase/migrations/003_dashboard_config.sql)
- [`supabase/migrations/004_edge_rate_limits.sql`](supabase/migrations/004_edge_rate_limits.sql) — `edge_rate_limits` + `increment_rate_limit` RPC
- [`supabase/migrations/005_consent.sql`](supabase/migrations/005_consent.sql) — terms_accepted_at, age_confirmed
- [`supabase/migrations/006_audit_fixes.sql`](supabase/migrations/006_audit_fixes.sql)
- [`supabase/migrations/007_health_profile.sql`](supabase/migrations/007_health_profile.sql) — energy_logs, burnout_score
- [`supabase/migrations/008_telegram_links.sql`](supabase/migrations/008_telegram_links.sql)
- [`supabase/migrations/009_google_calendar.sql`](supabase/migrations/009_google_calendar.sql)
- [`supabase/migrations/010_push_subscriptions.sql`](supabase/migrations/010_push_subscriptions.sql)
- [`supabase/migrations/011_push_cron.sql`](supabase/migrations/011_push_cron.sql)

### Tests
- [`e2e/helpers.ts`](e2e/helpers.ts) — `seedStore()`, `mockSupabase()`, `expandEmailInput()`
- [`e2e/auth.spec.ts`](e2e/auth.spec.ts)
- [`e2e/focus.spec.ts`](e2e/focus.spec.ts)
- [`e2e/onboarding.spec.ts`](e2e/onboarding.spec.ts)
- [`e2e/recovery.spec.ts`](e2e/recovery.spec.ts)
- [`e2e/reorder.spec.ts`](e2e/reorder.spec.ts)
- [`e2e/settings.spec.ts`](e2e/settings.spec.ts)
- [`e2e/sprint-bd.spec.ts`](e2e/sprint-bd.spec.ts)
- [`e2e/tasks.spec.ts`](e2e/tasks.spec.ts)
- [`e2e/tutorial.spec.ts`](e2e/tutorial.spec.ts)
- [`src/store/__tests__/store.test.ts`](src/store/__tests__/store.test.ts)
- [`src/shared/lib/__tests__/burnout.test.ts`](src/shared/lib/__tests__/burnout.test.ts)
- [`src/shared/lib/__tests__/constants.test.ts`](src/shared/lib/__tests__/constants.test.ts)
- [`src/shared/lib/__tests__/dateUtils.test.ts`](src/shared/lib/__tests__/dateUtils.test.ts)
- [`src/shared/lib/__tests__/getNowPoolMax.test.ts`](src/shared/lib/__tests__/getNowPoolMax.test.ts)
- [`src/shared/lib/__tests__/psychotype.test.ts`](src/shared/lib/__tests__/psychotype.test.ts)

### Config
- [`vite.config.ts`](vite.config.ts) — Bundle splitting, aliases, PWA plugin
- [`tsconfig.json`](tsconfig.json) · [`tsconfig.app.json`](tsconfig.app.json) · [`tsconfig.node.json`](tsconfig.node.json)
- [`playwright.config.ts`](playwright.config.ts) — Chromium + iPhone 14, dev server auto-start
- [`capacitor.config.ts`](capacitor.config.ts) — iOS/Android: StatusBar, Keyboard, LocalNotifications
- [`vercel.json`](vercel.json) — SPA rewrites, CORS headers
- [`eslint.config.js`](eslint.config.js)
- [`package.json`](package.json) — Scripts incl. `cap:sync`, `cap:ios`, `cap:android`
- [`.env.example`](.env.example) — All required env vars documented

### Claude AI Toolchain
- [`CLAUDE.md`](CLAUDE.md) — Full working memory (sprint history, stack, architecture, gaps)
- [`TASK-PROTOCOL.md`](TASK-PROTOCOL.md) — This file
- [`.claude/rules/guardrails.md`](.claude/rules/guardrails.md) — 10 hard rules: ADHD-safe, motion, a11y, store, copy
- [`.claude/rules/typescript.md`](.claude/rules/typescript.md) — TS/React patterns, imports, CSS
- [`.claude/rules/security.md`](.claude/rules/security.md) — Secrets, auth, GDPR, edge functions
- [`.claude/rules/testing.md`](.claude/rules/testing.md) — E2E/unit test patterns
- [`.claude/rules/never-delete.md`](.claude/rules/never-delete.md) — NEVER remove features without explicit approval
- [`.claude/agents/code-reviewer.md`](.claude/agents/code-reviewer.md)
- [`.claude/agents/build-error-resolver.md`](.claude/agents/build-error-resolver.md)
- [`.claude/agents/e2e-runner.md`](.claude/agents/e2e-runner.md)
- [`.claude/commands/verify.md`](.claude/commands/verify.md) — `/verify` — tsc + build + e2e pipeline
- [`.claude/commands/build-fix.md`](.claude/commands/build-fix.md)
- [`.claude/commands/e2e.md`](.claude/commands/e2e.md)
- [`.claude/commands/tdd.md`](.claude/commands/tdd.md)
- [`.claude/commands/code-review.md`](.claude/commands/code-review.md)
- [`.claude/hooks.json`](.claude/hooks.json) — Auto-typecheck on edit, console.log detection, git safety
- [`.claude/skills/humanizer/SKILL.md`](.claude/skills/humanizer/SKILL.md) — AI text decontamination

### Memory
- [`memory/MEMORY.md`](memory/MEMORY.md) — Index of all memory files
- [`memory/glossary.md`](memory/glossary.md)
- [`memory/mistakes.md`](memory/mistakes.md) — Anti-patterns: what NOT to do
- [`memory/patterns.md`](memory/patterns.md) — Validated implementation patterns
- [`memory/context/architecture.md`](memory/context/architecture.md)
- [`memory/context/design-rules.md`](memory/context/design-rules.md)
- [`memory/people/yusif.md`](memory/people/yusif.md)
- [`memory/projects/mindshift.md`](memory/projects/mindshift.md)

### Docs
- [`docs/SHIPPED.md`](docs/SHIPPED.md) — Running log of shipped features
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — Architecture decision log
- [`docs/EXECUTION-PLAN.md`](docs/EXECUTION-PLAN.md) — Sprint execution notes
- [`docs/AUDIT-v1.md`](docs/AUDIT-v1.md) — Security/perf/PWA/launch audit (2026-03-29)
- [`docs/adr/0001-db-backed-rate-limiting.md`](docs/adr/0001-db-backed-rate-limiting.md)
- [`docs/adr/0002-state-management-zustand.md`](docs/adr/0002-state-management-zustand.md)
- [`docs/adr/0003-offline-first-pattern.md`](docs/adr/0003-offline-first-pattern.md)
- [`docs/adr/0004-pwa-service-worker-strategy.md`](docs/adr/0004-pwa-service-worker-strategy.md)
- [`docs/adr/0005-adhd-safe-color-system.md`](docs/adr/0005-adhd-safe-color-system.md)
- [`docs/adr/0006-ai-edge-functions-gemini.md`](docs/adr/0006-ai-edge-functions-gemini.md)
- [`docs/adr/0007-accessibility-motion-system.md`](docs/adr/0007-accessibility-motion-system.md)

---

## KNOWN TECHNICAL DEBT (as of 2026-03-30)

| File | Lines | Limit | Action |
|------|-------|-------|--------|
| [`src/store/index.ts`](src/store/index.ts) | ~949 | 400 | Split into 6 domain slices in next LARGE batch |
| [`src/features/focus/useFocusSession.ts`](src/features/focus/useFocusSession.ts) | ~627 | 400 | Extract `useSessionTimer` + `useSessionPhase` |
| [`src/features/settings/SettingsPage.tsx`](src/features/settings/SettingsPage.tsx) | ~868 | 400 | Already has section components — move logic into them |
| [`src/shared/hooks/useAudioEngine.ts`](src/shared/hooks/useAudioEngine.ts) | ~522 | 400 | Acceptable for audio domain complexity |

---

## LAUNCH GATE CHECKLIST

```
Infrastructure
□ .env removed from git history (git rm --cached .env)
□ SENTRY_AUTH_TOKEN rotated
□ supabase functions list → all 11 functions deployed
□ Google OAuth configured in Supabase Dashboard
□ pg_cron enabled → migrations 010+011 pushed

PWA / Play Store
□ 192×192 maskable icon present in public/
□ assetlinks.json at /.well-known/assetlinks.json
□ Feature graphic 1024×500 created
□ 8 phone + 4 tablet screenshots captured
□ bubblewrap init → AAB build generated

Code Quality
□ tsc -b → 0 errors
□ npm run build → 0 errors
□ npx playwright test → 230/230 (or current total) passing
□ No files over 400 lines limit (except useAudioEngine — approved)
□ No console.log in src/ (hooks.json auto-checks)

Security
□ No secrets in committed files
□ All edge functions have rate limiting
□ SW notificationclick validates URL origin
□ GDPR export/delete endpoints tested end-to-end
```

---

## WHAT THE TEAM DOES BETWEEN SESSIONS

Claude Code reads this file at the start of every session. The last 4 lines of every batch close tell the next agent exactly where to start. No context loss, no repeated work.

**"Next batch" entry format (written at end of every session):**
```
NEXT: {BATCH-ID-next} | Priority: {item1}, {item2} | Blocked by: {blocker or 'none'}
```

---

## CURRENT NEXT (as of 2026-03-30)

```
COMPLETED: BATCH-2026-03-30-G
- store/index.ts: 949 → 163 lines (6 slice files: user/task/session/audio/progress/preferences)
- useFocusSession.ts: 627 → 588 lines (+useSessionTimer.ts 159L +useSessionPhase.ts 83L)
- SettingsPage.tsx: 868 → 48 lines (5 new sections: Plan/Appearance/Behavior/Notifications/Wellbeing)
- e2e/stress.spec.ts: 13 stress tests (500 tasks, offline sync, pending session, low energy, etc.)
- public/.well-known/assetlinks.json + apple-app-site-association created
- Security batch (I): Gemini key→header, CORS fix, VAPID JWK, race conditions, DB migration 012

NEXT: BATCH-2026-03-30-H | Production config + Play Store prep
Priority:
  1. Apply migration 012 in Supabase Dashboard (repeat/category/gamma) — MANUAL by Yusif
  2. Add STRIPE_SECRET_KEY + STRIPE_PRO_PRICE_ID + STRIPE_WEBHOOK_SECRET to Supabase env — MANUAL by Yusif
  3. Enable pg_cron in Supabase Dashboard → run migrations 010+011 — MANUAL by Yusif
  4. Generate release keystore → replace SHA256 placeholder in assetlinks.json — MANUAL by Yusif
  5. bubblewrap init → AAB build for Play Store — MANUAL by Yusif
  6. Feature graphic 1024×500 + 8 phone screenshots — DESIGN by Yusif
  7. Fix useFocusSession.ts to < 400 lines (still 588 — needs deeper extraction)
  8. Add getCalendarAuthUrl() null-check in IntegrationsSection
Blocked by: Stripe keys, Supabase manual steps (items 1-4 above)
```
