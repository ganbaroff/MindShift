# MindShift — Claude Working Memory

## Project
**MindShift** — ADHD-aware productivity PWA. Mobile-first, React + TypeScript + Supabase.
Owner: **Yusif** (ganbarov.y@gmail.com). Branch: `main` @ `c31f321`. Status: **production-ready**.

## Stable Production URL
**`https://mind-shift-git-main-yusifg27-3093s-projects.vercel.app`**
- This URL never changes — always the latest `main` branch production build
- Auto-updates on every `git push origin main` (Vercel GitHub integration)
- Works from any device / network without auth
- Custom domain: add via Vercel Dashboard → Project Settings → Domains

## E2E Testing
- Framework: `@playwright/test` (already in package.json)
- Local: `npx playwright test` (starts dev server automatically)
- Production: `PLAYWRIGHT_BASE_URL=https://mind-shift-git-main-yusifg27-3093s-projects.vercel.app npx playwright test`
- CI auto-run: `.github/workflows/e2e-production.yml` fires after every successful Vercel deploy via `deployment_status` event
- Browsers: Chromium + iPhone 14 (mobile)
- All Supabase API calls are mocked via `page.route()` — tests run offline

## Sprint History
| Sprint | Commit | What landed |
|--------|--------|-------------|
| Sprint H "Final QA" | `(current)` | 20 new e2e tests: due date picker (Today/Tomorrow chips, toggle, upcoming hint), NEXT pool empty state, home empty state CTA, Settings Reminders section. CLAUDE.md updated. 132/132 e2e tests passing. |
| Sprint G "Polish & Harden" | `c31f321` | Accessibility: EnergyPicker aria-label+aria-pressed, Fab aria-label+focus-visible ring, CollapsibleSection aria-expanded+aria-label. Performance: TaskCard React.memo (custom comparator), useMemo for all filtered task lists in TasksPage + HomePage. Error handling: useTaskSync surfaces Supabase fetch errors as toast. Empty states: TasksPage NEXT pool "Queue tasks here" hint. |
| Sprint F "Push & Remind" | `e34b345` | SW push+notificationclick handlers. OnboardingPage 5-step flow (step 5 = notification permission + skip). SettingsPage Reminders section. AddTaskModal due date picker (Today/Tomorrow chips + native input) + auto-schedules reminder. TaskCard 🔔 badge + 📅 due date pill. |
| Sprint E "Real Data Pipeline" | `42b8996` | useTaskSync: bidirectional Supabase↔store sync, server-wins on login, local-push on first device. useSessionHistory: last-30-days focus_sessions, computes WeeklyStats (dailyMinutes, totalFocusMinutes, peakFocusTime, consistencyScore), energyTrend from energy_after, calls weekly-insight edge function. ProgressPage wired to real data. |
| Sprint D "Clean Slate" | `f77504d` | Removed 1,648 lines dead code (duplicate TaskCard/AddTaskModal in features/tasks/, unused lib/utils.ts). Fixed AddTaskModal aria-label="Close modal". FocusScreen restored (was routing to Lovable prototype FocusPage). |
| Sprint B "Finish What You Started" | `4f7f9aa` | 10 UX fixes from ux-dead-ends-audit: cognitiveMode removed from UI (C-3), psychotype wired to Mochi messages (C-4), appMode change resets BentoGrid (C-4), SEASONAL_MODE_CONFIG + getNowPoolMax compose both mode configs (H-4), DueDateScreen task rows → bottom-sheet reschedule (M-1), FirstTaskPrompt resets when NOW pool empties (M-8), carry-over badge → actionable button with popover (M-9), taskType badge (idea/reminder emoji) on TaskCard (M-12), DIFFICULTY_MAP single source of truth replacing difficultyLevel (A-2), /audio orphaned route removed (A-4). e2e tests: seasonalMode toast + FirstTaskPrompt reset. |
| Sprint A "Nothing Should Lie" | `e2f2220` | 28-issue UX dead-end audit → 6 fixes: "Done recently" section for completed tasks (7-day history + 30-day pruning), APP_MODE_CONFIG drives pool visibility/limits (minimal/habit/system), ProBanner removed (no Stripe yet), energy_before now written + ProgressScreen energy trends, Health & Rhythms fields removed (sleep/chrono/medication — unused), BurnoutAlert CTA fix ("Take a breather" for burnout tier), rest-mode banner, QuickSetupCard toast, BurnoutNudge cooldown copy. e2e tests synced. |
| Copy audit | `bd1d8b1` | UX copy audit 4 waves: canonical ENERGY_LABELS/EMOJI in constants.ts, tone/emoji (AuthScreen/FocusScreen/PostSessionFlow/OnboardingFlow/SettingsScreen), jargon removal (micro-win/micro-focus/Generate/Feels native/CoachMark), polish (stats counters, Mochi milestone_60, CookieBanner, HomeScreen skip). e2e tests synced to new copy. GitHub Actions e2e-production.yml (deployment_status trigger). Stable URL documented. |
| Sprint 9 | `e54f751` | Design & accessibility pass: WCAG AA compliance (focus rings, motion system universalised), Calendar tab → DueDateScreen, timer style picker in Settings, energy picker on first load, undo task completion (4s), offline indicator in AppShell, BurnoutAlert CTA → /focus?quick=1, snooze/park/thought toasts, BentoGrid min-2 feedback, ArcTimer tap hint, Mochi message randomization, text overflow protection, BentoGrid error fallback, pushWelcomeBack() wired, ADR-0007 |
| Sprint 8 | `4fe6a19` | Architecture optimization: bundle splitting (lazy RecoveryProtocol/ContextRestore/BentoGrid), FocusScreen decomposition (1180→~350 lines), React.memo (4 components), CSS design tokens (:root vars + [data-mode="calm"]), per-route ErrorBoundary, Sentry deferred init, 5 new ADRs |
| Sprint 7 | `44e175c` | 3-axis neuroinclusive features: Burnout Radar, Health Profile, Timer modes, Seasonal Modes, Traffic Light tasks, Mochi body-double, Lifetime Stats widget, Flexible Pause |
| Sprint 6 | — | VR XP, Analytics, Notifications, Energy Level picker, Subtask grouping |
| Sprint 5 | — | Mobile UX bugs, BottomNav, safe-area, AddTaskModal |

## Stack (hot cache)
| Term | Meaning |
|------|---------|
| **store** | Zustand v5 store @ `src/store/index.ts` — 6 slices + persist |
| **partialize** | The `partialize` fn in store = what survives page reload |
| **AppShell** | Layout wrapper — BottomNav, InstallBanner, safe-area pb |
| **BentoGrid** | dnd-kit drag grid on HomeScreen — 7 widget types (incl. LifetimeStatsWidget) |
| **ArcTimer** | SVG progress ring in FocusScreen — 3 modes: countdown/countup/surprise |
| **useAudioEngine** | Web Audio API hook — AudioWorklet (brown) + buffers (others) |
| **RecoveryProtocol** | Full-screen overlay when user absent 72h+ (z-50) |
| **ContextRestore** | Half-screen overlay when user absent 30–72h (z-40) |
| **CookieBanner** | z-50, inline `bottom: calc(64px + env(safe-area-inset-bottom) + 8px)` |
| **palette** | `usePalette()` hook — desaturated colors in calm/focused mode |
| **psychotype** | Derived from onboarding: planner/achiever/explorer/connector |
| **offline queue** | `enqueue()`/`dequeue()` pattern for Supabase writes when offline |
| **burnoutScore** | 0-100 score from snooze/completion/session/energy trends (computed, not persisted) |
| **seasonalMode** | launch/maintain/recover/sandbox — persisted, drives pool limits + AI tone |
| **timerStyle** | countdown/countup/surprise — now settable in SettingsScreen (Sprint 9) |
| **MochiSessionCompanion** | Active body-double during focus: phase bubbles, 20-min accountability prompts |
| **BurnoutAlert** | Amber card (score 41-65) or purple card (66+) on ProgressScreen |
| **LifetimeStatsWidget** | Bento widget: completedTotal + totalFocusMinutes + "You keep showing up 💫" |
| **flexiblePauseUntil** | ISO date: planned break gate in App.tsx. Clears silently on date pass. |
| **Traffic Light** | Task difficulty: easy(teal)/medium(gold)/hard(purple) — never red |
| **DIFFICULTY_MAP** | `types/index.ts` — `1→Easy/teal, 2→Medium/gold, 3→Hard/purple`. Single source of truth (Sprint B A-2). |
| **cognitiveMode** | DEPRECATED (Sprint B). Store field kept for localStorage compat. Not set from UI. |
| **SEASONAL_MODE_CONFIG** | `constants.ts` — per-seasonalMode `nowPoolMaxOverride`. Composed with `APP_MODE_CONFIG` via `getNowPoolMax()`. |

## Pools & Core Concepts
| Term | Meaning |
|------|---------|
| **NOW pool** | Max 3 tasks — what user does right now |
| **NEXT pool** | Max 6 tasks — queued up |
| **SOMEDAY** | Collapsible archive — parked tasks, no pressure |
| **park it** | Snooze: moves task NOW→NEXT, no penalty |
| **carry-over** | Badge on tasks >24h old — non-shaming, warm amber |
| **VR / variable ratio** | XP bonus schedule: 8%=2×, 17%=1.5×, 75%=1× (dopamine bridge) |
| **struggle/release/flow** | Focus phases: 0–7m / 7–15m / 15m+ — arc shrinks, digits vanish |
| **recovery lock** | 10-min mandatory rest after session (NATURE_BUFFER_SECONDS=120) |
| **quick=1** | URL param `?quick=1` → 5-min auto-start on FocusScreen |

## Research Numbers (when cited in code)
| # | Topic |
|---|-------|
| Research #2 | Struggle→release→flow phase thresholds (neuroscience) |
| Research #3 | Pink noise LPF 285Hz (HF fatigue) |
| Research #5 | Variable ratio XP (dopamine transfer deficit in ADHD) |
| Research #7 | RSD spiral peaks at 3+ days absence → 72h threshold |
| Research #8 | Palette: teal/indigo/gold — never red. Calm colors only. |

## Key Files
| File | Purpose |
|------|---------|
| `src/store/index.ts` | All state, slices, persistence |
| `src/types/index.ts` | Domain types + ACHIEVEMENT_DEFINITIONS + WIDGET_DEFAULTS |
| `src/shared/lib/constants.ts` | All numeric constants (XP, phases, audio, session stops) |
| `src/shared/lib/burnout.ts` | `computeBurnoutScore(behaviors[])` — 4-signal weighted formula |
| `src/app/App.tsx` | Router, auth, RecoveryProtocol + FlexiblePause detection |
| `src/app/AppShell.tsx` | Layout, pb safe area calc |
| `src/features/focus/FocusScreen.tsx` | Thin orchestrator (~350 lines) — delegates to useFocusSession + SessionControls + PostSessionFlow |
| `src/features/focus/useFocusSession.ts` | Timer/FSM logic hook (~280 lines) — phases, 90/120min stops, energy delta |
| `src/features/focus/SessionControls.tsx` | Audio toggle + end session + park-thought FAB |
| `src/features/focus/PostSessionFlow.tsx` | NatureBuffer + RecoveryLock screens |
| `src/features/focus/ArcTimer.tsx` | countdown/countup/surprise timer modes |
| `src/features/home/BurnoutAlert.tsx` | Amber/purple alert card (score 41+) |
| `src/features/home/BurnoutNudgeCard.tsx` | Proactive in-app burnout nudge (3-gate, 48h cooldown) |
| `src/features/home/widgets/LifetimeStatsWidget.tsx` | Cumulative progress bento widget |
| `src/features/focus/MochiSessionCompanion.tsx` | Active body-double bubbles during sessions |
| `docs/neuroinclusive-ux-audit-2026-03-11.md` | 6-domain UX audit (Motion/Color/Focus/Shame-free/AI) |
| `docs/3-axis-audit-2026-03-11.md` | 3-axis audit (Onboarding/Social/Burnout) + 35-item backlog |
| `docs/claude-code-prompt-3axis.md` | Sprint 7 implementation prompt (reference) |
| `docs/devops-architecture-audit-2026-03-11.md` | DevOps audit: bundle, FocusScreen split, memo, tokens, ADRs |
| `docs/adr/0001-db-backed-rate-limiting.md` | ADR: PostgreSQL-backed rate limiting for edge functions |
| `docs/adr/0002-state-management-zustand.md` | ADR: Why Zustand over Redux/Jotai |
| `docs/adr/0003-offline-first-pattern.md` | ADR: Optimistic mutations + enqueue/dequeue |
| `docs/adr/0004-pwa-service-worker-strategy.md` | ADR: injectManifest, NavigationRoute, CacheFirst |
| `docs/adr/0005-adhd-safe-color-system.md` | ADR: No red, teal/gold/indigo, Research #8 |
| `docs/adr/0006-ai-edge-functions-gemini.md` | ADR: Gemini 2.5 Flash via Supabase edge functions |

## Supabase Edge Functions
| Function | Does |
|----------|------|
| `decompose-task` | AI breaks 1 task into subtasks |
| `recovery-message` | AI welcome back message after 72h+ (accepts seasonalMode context) |
| `weekly-insight` | AI weekly summary from session data (accepts seasonalMode context) |
| `classify-voice-input` | AI routes voice → task / idea / reminder (⚠️ defined, UI wiring pending) |
| `gdpr-export` | JSON data export |
| `gdpr-delete` | Full account deletion |

## Supabase Migrations
| File | What it adds |
|------|-------------|
| `001_init.sql` | Core tables: tasks, focus_sessions, user_behavior, profiles |
| `007_health_profile.sql` | energy_logs table, difficulty_level on tasks, burnout_score on user_behavior |

## Design Tokens (CSS variables — Sprint 8 migration done)
| Token | Value | Usage |
|-------|-------|-------|
| `primary` | `#7B72FF` | CTA, FAB, accent |
| `teal` | `#4ECDC4` | Easy tasks, release/flow phase |
| `gold` | `#F59E0B` | Hard tasks, carry-over badge, recovery phase |
| `surface` | `#1E2136` | Card background |
| `surface-raised` | `#252840` | Input, disabled state |
| `text-primary` | `#E8E8F0` | Body text |
| `text-muted` | `#8B8BA7` | Secondary text |

## Architecture (Sprint 8)
- **Bundle:** RecoveryProtocol, ContextRestore, BentoGrid lazy-loaded. Sentry deferred. vendor-dnd isolated.
- **FocusScreen:** Decomposed into orchestrator + useFocusSession hook + SessionControls + PostSessionFlow
- **React.memo:** TaskCard (custom comparator), ArcTimer, MochiSessionCompanion, BurnoutAlert
- **CSS tokens:** `:root` vars + `[data-mode="calm"]` overrides. App.tsx sets data-mode from reducedStimulation.
- **Error boundaries:** Per-route `<ErrorBoundary fallback={<RouteError />}>` + BentoGrid chunk fallback (Sprint 9)
- **ADRs:** 7 documented in `docs/adr/` (rate-limiting, Zustand, offline, PWA, colors, AI, accessibility)

## Architecture (Sprint 9 additions)
- **Motion system:** All components now wired to `useMotion()`. No bypasses. All `animate-spin` gated by `motion-reduce:animate-none`.
- **Focus rings:** Button.tsx + all interactive elements have `focus-visible:ring-2` (WCAG 2.4.7 AA)
- **DueDateScreen:** Replaces non-functional CalendarScreen. Groups tasks by Today/Tomorrow/This Week/Later.
- **Offline indicator:** AppShell shows gold bar when offline, teal confirmation on reconnect.
- **Undo completion:** TaskCard holds completion for 4s with toast. Confetti fires immediately.
- **Timer style UI:** Now settable in SettingsScreen (was only in store with no UI).

## Architecture (Sprint D–H additions)
- **useTaskSync:** `src/shared/hooks/useTaskSync.ts` — bidirectional Supabase↔store sync. Server-wins on login. Local-push on first device. Surfaces fetch errors as sonner toast.
- **useSessionHistory:** `src/shared/hooks/useSessionHistory.ts` — fetches last 30 days of focus_sessions, computes WeeklyStats, calls `weekly-insight` edge function once per mount.
- **SW push handlers:** `src/sw.ts` — `push` renders OS notification, `notificationclick` opens app URL.
- **OnboardingPage:** 5-step flow — step 5 is notification permission with "Skip for now". TOTAL_STEPS = 5.
- **AddTaskModal:** Due date picker (Today/Tomorrow chips + native date input). Auto-schedules reminder 15 min before due date when Notification.permission === 'granted'. Reset on close via handleClose().
- **TaskCard:** React.memo with custom comparator (id/status/title/dueDate/difficulty). 🔔 badge when reminder active. 📅 due date pill.
- **Performance:** useMemo on filtered task lists in HomePage + TasksPage. React.memo on TaskCard.
- **Accessibility:** EnergyPicker aria-label+aria-pressed. Fab aria-label+focus-visible ring. CollapsibleSection aria-expanded+aria-label.

## Architecture (Sprint B additions)
- **SEASONAL_MODE_CONFIG:** `constants.ts` — each seasonalMode (launch/maintain/recover/sandbox) has `nowPoolMaxOverride` (null = defer to appMode).
- **getNowPoolMax(appMode, seasonalMode):** helper composing both configs. Used in NowPoolWidget + AddTaskModal + SettingsScreen toast.
- **cognitiveMode:** Deprecated in UI (Sprint B). Field kept in store for localStorage compat. Not set from any UI anymore.
- **DIFFICULTY_MAP:** `types/index.ts` — `1|2|3 → { label, color }`. Single source of truth. Replaces hardcoded ternaries and deprecated `difficultyLevel` string field.
- **DueDateScreen reschedule:** Task rows are `<button>` — tap opens spring-animated bottom sheet with date input, "Go to task →", and "Remove due date".
- **Carry-over badge:** Now a `<button>` with AnimatePresence popover (Park it / Move to Someday / Still on it). Outside-click closes via `useRef` + `useEffect`.
- **Mochi psychotype overlay:** `MochiSessionCompanion` now reads `psychotype` from store and picks per-psychotype messages (achiever/explorer/connector/planner × 4 milestones).
- **FirstTaskPrompt reset:** `useEffect` in HomeScreen resets `firstTaskDismissed` whenever `activeNowTasks.length === 0`.
- **/audio route removed:** `AudioScreen` lazy import + `/audio` route deleted from App.tsx (dead route, nothing linked to it).

## Architecture (Sprint A additions)
- **APP_MODE_CONFIG:** `constants.ts` — each appMode (minimal/habit/system) now drives `nowPoolMax`, `showNextOnHome`, `showSomedayOnHome`, `homeSubtitle`. Single source of truth.
- **Done recently:** TasksScreen collapsible section — `[...nowPool, ...nextPool, ...somedayPool].filter(completed, <7d)`, sorted by `completedAt` desc.
- **Store hydration pruning:** `onRehydrateStorage` callback prunes completed tasks >30d from all pools.
- **Rest-mode banner:** HomeScreen + App.tsx show banner when `flexiblePauseUntil` is in the future.
- **Energy tracking:** `energy_before` now written from current `energyLevel` on session save. `energy_after` still pending PostSessionFlow wiring.

## Build Notes (important!)
- Sprint 8: `npm run build` ✅, `vitest` 82/82 ✅, `tsc` ✅
- Sprint 9: `tsc --noEmit` ✅ (Cowork session)
- Cowork session: `tsc --noEmit` ✅ only (no rollup Linux binary in Cowork sandbox)
- Always run `tsc --noEmit` before any commit from Cowork
- Sprint A: `tsc --noEmit` ✅, deployed `e2f2220`
- Sprint B: `tsc --noEmit` ✅, committed `4f7f9aa`
- Sprint D–H: `tsc --noEmit` ✅, `npx playwright test` 132/132 ✅
- Branch: `main` @ `c31f321`

## Production Status (as of Sprint 9)
| Item | Code | Deployed | Notes |
|------|------|----------|-------|
| Vercel hosting | ✅ vercel.json | ✅ live | Verified by Yusif. App opens. |
| Supabase DB | ✅ migrations exist | ✅ live | Verified by Yusif. Auth works. |
| Edge functions | ✅ 6 functions written | ❓ unconfirmed | Need: `supabase functions list` to verify |
| Env vars (Vercel) | ✅ .env exists | ✅ assumed | App works → vars must be set |
| Data persistence (tasks etc.) | ✅ code ready | ❓ untested | Only 1 user (Yusif). Needs real session test. |
| Sentry | ✅ DSN configured, deferred init | ❓ unconfirmed | Check sentry.io → Issues |
| Analytics | ✅ @vercel/analytics + web-vitals | ❓ unconfirmed | Check Vercel dashboard → Analytics tab |
| Stripe / Payments | ❌ not implemented | ❌ planned | ProBanner UI removed (Sprint A). Store logic intact. |
| Real users | 1 (Yusif only) | — | Design + auth issues resolved. Ready for beta invites. |

## Known Gaps (not yet implemented)
- **energy_after** — `energy_before` now written (Sprint A). `energy_after` still needs PostSessionFlow picker wiring to DB UPDATE.
- **Server-side reminders** — SW showNotification works when app is in background tab (Sprint F). Full background push (app fully closed) needs Web Push API + VAPID keys + Supabase cron (v2).
- **Stripe integration** — subscriptionTier exists in store, ProBanner UI removed (Sprint A). Zero payment logic. Restore ProBanner when Stripe ready.
- **classify-voice-input** — edge function written + wired in AddTaskModal. Unconfirmed in production (run `supabase functions list` to verify).
- **Date picker on tasks** ~~FIXED Sprint F~~ — AddTaskModal now has Today/Tomorrow chips + native date input.
- **Social layer** — S-2/S-3/S-4 require Supabase Realtime design (separate sprint)
- **Health signals** — sleepQuality, chronotype, medicationTime removed from UI (Sprint A). Store fields remain. Re-add when wired to recommendations.

## Remaining P2 Backlog (not yet implemented)
- O-6: Expanded ADHD signal (time blindness, emotional reactivity scenarios)
- O-7: Psychotype re-derivation from usage patterns (Day 30+)
- O-9: "Surprise me" timer (hide all digits completely)
- O-11: Onboarding skip + revisit engine
- O-12: Daily energy pattern detection from logs
- S-2: Ambient Orbit (anonymous "47 people focusing now" counter)
- S-3: 1:1 Focus Partner (Model A — Supabase Realtime)
- S-4: Quiet Room (Model B — 2-4 person rooms)
- S-5: Ghosting Grace protocol
- S-7: Anti-social-scroll friction
- S-9: Post-social cool-down ritual
- S-11: Anonymous encouragement in rooms
- B-5: Monthly reflection ritual (first-of-month flow)
- B-6: Hyperfocus Autopsy (after 45min+ sessions)
- B-9: Two-Thirds guardrail (warn if overcommitted)
- B-12: Medication peak window overlay

## Preferences (Yusif)
- Russian comms OK in conversation; commit messages in English
- ADHD-aware design = non-punitive, calm palette, no red/urgency
- Always: `tsc --noEmit` before commit from Cowork
→ Full details: memory/

