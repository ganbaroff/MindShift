# MindShift — Claude Working Memory

## Project
**MindShift** — ADHD-aware productivity PWA. Mobile-first, React + TypeScript + Supabase.
Owner: **Yusif** (ganbarov.y@gmail.com). Branch: `main` @ latest. Status: **production-ready v1.0**. Google Play launch pending account verification.

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
| BATCH-2026-04-04-N "S-5 Ghosting Grace" | `16db3ec` | S-5: lastRoomCode+lastRoomLeftAt persisted in store + partialize. useFocusRoom.leave() saves room code before clearing. wasRecentlyInRoom derived in useOverlayState (24h window). ContextRestore warm teal re-entry card with room code. ghosting_grace_shown dim on context_restore_shown event. 2 new i18n keys × 6 locales. tsc -b ✅ |
| BATCH-2026-04-04-M "analytics+a11y" | `8af4bae` | manifest.json og-image removed from screenshots (Play Store). ContextRestore + NatureBuffer button focus rings. nature_buffer_skipped/recovery_lock_bypassed/autopsy_picked/share/progress_page_viewed events. CI bundle gate 400 KB exit 1. screenshots:prod npm script. tsc -b ✅ |
| BATCH-2026-04-04-L "retention signals" | `6924fbd` | session_energy_delta deferred event. user_returned → App.tsx + entry_route. NatureBuffer role=timer. AchievementGrid aria-expanded+role=region+aria-disabled. HistoryPage role=status i18n. tutorial elapsed_sec+reached_flow. deploy-edge-functions per-function isolation. supabase/config.toml. tsc -b ✅ |
| BATCH-2026-04-04-K "ARIA + CI guardrails" | `aebeef0` | BurnoutGauge role=meter + HomePage progress bar role=progressbar (BLOCKS_LAUNCH cleared). manifest.json → stable alias. deploy-edge-functions workflow_run + CI success gate. Quick Start sets ADHD defaults. ArcTimer tap hint i18n (6 locales). CI bundle size threshold. tsc -b ✅ |
| BATCH-2026-04-02-N "Analytics closure" | `HEAD` | energy_logged event upgraded with energy_before + energy_delta (cohort retention signal). TASK-PROTOCOL.md + CLAUDE.md backlog synced (6 items closed). tsc -b ✅ |
| BATCH-2026-04-02-M "VOLAURA crystal chip + installDate" | `476f098` | NatureBuffer shows 💎 +N chip when VOLAURA configured (sessionMinutes × 5). installDate added to store (device-level, never reset). days_since_install in session_started + session_completed events. i18n in 6 locales. tsc -b ✅ |
| BATCH-2026-04-02-L "A11y P1s + edge fn timeout" | `[prev]` | (1) OnboardingPage keyboard trap fixed — Continue button visible on steps 0-2 when option selected. (2) FocusRoomSheet role=dialog + aria-labelledby. (3) SessionControls audio/end/park focus-visible:ring-2 + aria-pressed. (4) weekly-insight timeout 15s → 8s (Supabase platform limit). (5) session_completed analytics: energy_before added. tsc -b ✅ |
| Sprint BC "Decomposition" | `6b9acb3` | FocusScreen split → FocusScreen.tsx (orchestrator ~450 lines) + FocusSetup.tsx (~459 lines). dateUtils.ts centralised. useSessionHistory optimised with React Query. tsc -b ✅ |
| Sprint BB "Hardening" | `e33f31c` | (1) Dead code removal: App.css, OnboardingFlow.tsx, useReducedMotion.ts, CoachMark.tsx (655 lines). (2) CORS hardened: ngrok wildcard → Vercel preview regex + stable production URL. (3) Store fix: cognitiveMode removed from partialize, energyLevel added. (4) Component updates: TaskCard/EnergyPicker/Fab/AddTaskModal a11y + motion fixes. (5) database.ts types extended. tsc -b ✅ |
| Sprint AA "Google Auth + AI Mochi + User Memory" | pending | (1) Google OAuth — AuthScreen: "Continue with Google" button via `supabase.auth.signInWithOAuth({ provider: 'google' })`. Consent persisted before redirect. Requires Supabase Dashboard Google provider config. (2) User Behavior Memory — `useUserBehavior(sessions)` hook: aggregates focus_sessions into `UserBehaviorProfile` (avgSessionMinutes, flowRate, struggleDropRate, peakHour, energyTrend, recentStruggles, completedToday). (3) AI Mochi — `mochi-respond` edge function: Gemini 2.5 Flash generates personalized mascot messages using psychotype + behavior profile + session context + ADHD signals. 10 calls/day rate limit. (4) MochiSessionCompanion upgraded: shows hardcoded fallback instantly, then replaces with AI response when available. Guest users use hardcoded only. `encouraging` mascot state added. tsc ✅ |
| Sprint Z "Session Log + S-7 + Rooms" | pending | (1) `/history` route — `HistoryPage.tsx`: session timeline grouped by date (duration/phase/energy delta emojis), summary strip (total sessions/min/flow count). Linked from ProgressPage "Session Log →". (2) S-7 Anti-scroll friction — `SessionFrictionNudge` in AppShell: 5s auto-dismiss nudge when user navigates away from /focus during active session. (3) Lazy `/history` route in App.tsx. tsc ✅ |
| Sprint Y "Task Reordering" | pending | Drag-to-reorder tasks in NOW and NEXT pools. `SortableTaskCard` wrapper + `DndContext`/`SortableContext` in TasksPage. `reorderPool(pool, ordered[])` in store updates `position`. TouchSensor with 200ms delay. "hold to reorder" hint in header. tsc ✅ |
| Sprint X "Focus Rooms" | pending | Supabase Realtime presence rooms (S-3/S-4/S-11). `useFocusRoom` hook: create (4-char code) / join / broadcast phase / leave. `FocusRoomSheet` bottom sheet: create/join UI, copy code, live peer list with phase dots. In-session: replaces Ambient Orbit with "🤝 N in room" peer indicators + S-11 anonymous encouragement text. No DB table needed. tsc ✅ |
| Sprint W "Adaptive Focus Setup" | pending | FocusScreen setup: (1) Today's Progress strip — shows completedTotal + today's focused minutes + weeklyIntention chip. (2) Adaptive ADHD tip card — 4 variants from timeBlindness/emotionalReactivity; teal-tinted, non-blocking. Both hidden when no data yet. tsc ✅ |
| Sprint V "Task Notes" | pending | `note?: string` on Task interface. AddTaskModal: collapsible "Add context" textarea (hidden by default, "+ Add context" link expands it). TaskCard: shows `📝 {note}` preview line (truncated 1 line) when note present. Memo comparator updated. tsc ✅ |
| Sprint U "Weekly Planning Ritual" | pending | `WeeklyPlanning.tsx` (lazy z-50): 3 steps — wins recap with completedTotal + streak → intention chip picker (4 options) → closing affirmation. Triggers Sunday 18pm+ or Monday before noon, once per ISO week. Store: `weeklyPlanShownWeek: string\|null`, `weeklyIntention: string\|null` (both persisted). App.tsx: mutually exclusive with Recovery/ContextRestore/Shutdown/Monthly. Weekly intention displayed in FocusScreen setup strip (Sprint W). tsc ✅ |
| Sprint T "Daily Brief" | `3bf45d4` | Personalised ADHD tip card on HomePage: 6 variants from timeBlindness/emotionalReactivity/medicationTime; shows top NOW task as "Start with →"; visible before 17h; dismiss-per-session; hidden in low-energy mode. tsc ✅ |
| Sprint S "XP Levels + Focus Score" | `39cd4fb` | Named XP tiers (Seedling→Sprout→Grower→Bloomer→Flourisher…); Focus Health Score 0-100 composite card (sessions/consistency/tasks) with Planting/Growing/Thriving label + gradient bar. tsc ✅ |
| Sprint R "Achievement Auto-Unlock" | `51a0fc6` | completeTask unlocks first_seed/task_sniper/micro_master/night_owl/morning_mind/gentle_start via get() post-set + notifyAchievement toast; ProgressPage achievement grid: click badge → description tooltip + unlock date; unlocked/total counter. tsc ✅ |
| Sprint Q "Ambient Orbit" | `adff249` | S-2 Ambient Orbit — `useAmbientOrbit` hook queries focus_sessions from last 30 min as active-users proxy; refreshes every 5 min; teal pill fades in after 10s of active session ("🌍 X people focusing now"); pointer-events:none, opacity 55% — non-distracting body-doubling signal. tsc ✅ |
| Sprint P "Task Intelligence" | `e28d153` | (1) Task search — live filter bar in TasksPage (Search/X icons from lucide); filters NOW/NEXT/SOMEDAY simultaneously by title. (2) Recurring tasks — `repeat: 'none'\|'daily'\|'weekly'` on Task type; completeTask auto-creates next occurrence in NEXT pool with +1/+7 day dueDate; Once/Daily/Weekly picker in AddTaskModal. tsc ✅ |
| Sprint O "Focus Goal" | `ced6719` | P-1 Daily focus goal — `dailyFocusGoalMin` (default 60) + `goalCelebratedDate` persisted in store; progress bar card on HomePage showing today's focused minutes vs goal (teal when reached); one-time celebration toast per day; Settings: 30/45/60/90 min chips. ArcTimer: fixed isSurprise hoisting bug. tsc ✅ |
| Sprint N "Surprise Timer & Psychotype Evolution" | `cbba8c3` | (1) O-9 Full surprise timer — ArcTimer: progress arc stroke set to `transparent` in surprise mode (no time cue, only background ring + ambient orb). FocusScreen setup: DURATION section replaced with "🎲 Surprise mode — no digits, no arc" card when timerStyle=surprise. (2) O-7 Psychotype re-derivation — `src/shared/lib/psychotype.ts`: `deriveFromSessions(sessions)` scores achiever/explorer/connector/planner from 4 signals (deep-focus rate, duration variance, active days, hour consistency). Requires ≥10 sessions. ProgressPage "Your Focus Style" card: shows current type; when derived≠current shows "Your patterns suggest {type}" amber nudge with Update button → `setPsychotype` + `resetGridToDefaults`. `useSessionHistory` now exposes `sessions: FocusSessionRow[]`. Store: `psychotypeLastDerived: string|null` persisted. tsc ✅ |
| Sprint M "Onboarding & Energy Intelligence" | pending | (1) O-6 Expanded ADHD signal — 2 new onboarding steps: Time Blindness (3 chips: often/sometimes/rarely) + Emotional Reactivity (3 chips: high/moderate/steady); store fields timeBlindness + emotionalReactivity persisted; TOTAL_STEPS now 6. (2) O-11 Revisit mode — OnboardingPage detects onboardingCompleted; shows "Refreshing your profile 🔧" banner; pre-fills selections from store; on finish skips setOnboardingCompleted + navigate(-1) instead of '/'; option cards auto-advance with 160ms delay. (3) O-12 Peak Focus Window — ProgressPage shows "⚡ Peak focus window: {peakFocusTime} + X/7 days active" card using weeklyStats.peakFocusTime/consistencyScore from useSessionHistory (already computed). (4) energy_after Known Gap resolved — was already implemented in useFocusSession.ts (savedSessionIdRef + handlePostEnergy). tsc ✅ |
| Sprint L "i18n & Rituals" | pending | (1) Medication peak window badge (B-12) — FocusScreen setup shows ⚡ pill when current hour falls in med peak window (morning/afternoon/evening); wired to medicationEnabled + medicationTime from store. (2) Monthly Reflection ritual (B-5) — MonthlyReflection.tsx: 3-step flow (recap stats → set 1-word intention → closing auto-dismiss); triggers first 5 days of month, once/month; monthlyReflectionShownMonth persisted in store. (3) Settings: Medication section + Preferences > Re-run setup wizard. (4) i18n foundation — src/shared/lib/i18n/{en,ru,index}.ts + src/shared/hooks/useI18n.ts; resolves from navigator.language, fallback to en; EN+RU strings for greetings, home, focus, tasks, settings; wired to greeting in HomePage. tsc ✅ |
| Sprint K "ADHD Patterns & Native" | pending | (1) Surprise timer ambient orb — pulsing radial gradient in arc center when timerStyle=surprise (O-9). (2) Hyperfocus Autopsy — NatureBuffer shows 3-option reflection card after sessions ≥45min: 🌊 flow / 🌱 steady / 🌀 scattered (B-6). (3) Two-Thirds guardrail — "filling up" badge in TasksPage NEXT header + gentle warning in AddTaskModal when nextPool ≥4 (B-9). (4) Native bridge — src/shared/lib/native.ts: Capacitor runtime detection, nativeHapticImpact/Notification/Selection, nativeStatusBarHide/Show/Dark, nativeShare + canShare; all with web fallbacks. FocusScreen hides status bar during active sessions. (5) Web Share — "Share this week" button in ProgressPage using nativeShare. (6) PWA manifest — public/manifest.json with 4 shortcuts (Focus/Quick Focus/Tasks/Progress), categories, screenshots, edge_side_panel; linked from index.html. tsc ✅ |
| Sprint J "Voice & Rituals" | pending | (1) Voice input in AddTaskModal — Web SpeechRecognition → classify-voice-input edge fn → auto-fill title/difficulty/duration/dueDate; mic button with listening/classifying states + AI confidence feedback. (2) ShutdownRitual component — 3-step evening wind-down (9pm+, once/day): wins review → set ONE thing for tomorrow (creates NEXT task) → goodnight message; triggered from App.tsx. (3) Smart duration — difficulty-linked defaults (Easy=15m/Medium=25m/Hard=45m), "✨ smart" badge, resets on manual pick. (4) Auto-reschedule banner in TasksPage — gold non-shaming banner links to /calendar when active tasks have past dueDate. (5) Capacitor scaffold — capacitor.config.ts (iOS/Android/StatusBar/Keyboard/Notifications) + package.json cap: scripts. tsc ✅ |
| Sprint I "Sensory UX" | pending | 10 neuroinclusive features from Deep Research sessions: (1) IndexedDB migration via idbStorage adapter (transparent localStorage→IDB migration), (2) Invisible streaks (shown only when ≥2 days, reset-shame-free), (3) Haptic engine expanded to 9 ADHD-safe patterns (tap/done/wow/warning/breathe/phase/start/end/park/add), (4) Pink noise UI + Sound section in Settings (5 presets: brown/pink/nature/lofi/gamma, preview + lock as anchor, volume slider), (5) Phase-adaptive audio (struggle=100%/release=80%/flow=60% gain, 1.5s ramp), (6) Focus Breathwork Ritual (3×inhale+exhale cycles, SVG orb, haptic sync, skip always visible), (7) Low-energy auto-simplify (energyLevel≤2 or burnoutScore>60 → 1 NOW task, hide NEXT, gentle banner), (8) Mochi energy reactions (speech bubble on HP change, psychotype-specific, 5s auto-dismiss), (9) Locale injection in all AI edge functions (decompose-task/recovery-message/weekly-insight), (10) Spiciness meter in RecoveryProtocol (1-5 overwhelm chips → step count + granularity in AI decomposition). tsc ✅ |
| Sprint H "Final QA" | `4f3bec1` | 20 new e2e tests: due date picker (Today/Tomorrow chips, toggle, upcoming hint), NEXT pool empty state, home empty state CTA, Settings Reminders section. Feedback link in Settings. CLAUDE.md updated. 132/132 e2e passing. |
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
| `src/features/focus/MonthlyReflection.tsx` | Monthly reflection ritual (B-5) — recap + intention + closing |
| `src/features/focus/WeeklyPlanning.tsx` | Weekly planning ritual (Sprint U) — recap + intention chips + closing |
| `src/shared/lib/i18n/en.ts` | i18n source strings (English, typed I18nKey) |
| `src/shared/lib/i18n/ru.ts` | i18n Russian overrides (partial) |
| `src/shared/lib/i18n/index.ts` | resolveLocale() + t() translation function |
| `src/shared/hooks/useI18n.ts` | React hook: `{ t, locale }` |
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
| `mochi-respond` | AI Mochi mascot — personalized messages from psychotype + behavior profile + ADHD signals. 10/day free, unlimited pro. Gemini 2.5 Flash, 8s timeout, 0.9 temp. |
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

## Architecture (Sprint AA additions)
- **Google OAuth:** `AuthScreen.tsx` — "Continue with Google" button using `supabase.auth.signInWithOAuth({ provider: 'google' })`. Consent persisted to localStorage before redirect (same pattern as magic link). `prompt: 'select_account'` query param forces Google account picker. Requires: Supabase Dashboard → Authentication → Providers → Google (enable + set OAuth credentials). `googleLoading` state prevents double-clicks.
- **User Behavior Memory:** `src/shared/hooks/useUserBehavior.ts` — `useUserBehavior(sessions: FocusSessionRow[]): UserBehaviorProfile`. Computes from existing focus_sessions: avgSessionMinutes, flowRate, struggleDropRate (0-1), peakHour, avgEnergy, energyTrend (improving/stable/declining from first-5 vs last-5 energy_after), completedToday (from store pools), recentStruggles (human-readable string combining up to 4 patterns: struggle drop, short sessions, low flow rate, declining energy). Memoized on [sessions, pools].
- **AI Mochi (mochi-respond):** `supabase/functions/mochi-respond/index.ts` — Gemini 2.5 Flash edge function. Receives trigger + full user context (psychotype, ADHD signals, behavior profile, seasonal mode). Returns `{ message, mascotState }`. System prompt positions Mochi as warm ADHD-aware companion (not coach, not therapist). Psychotype-specific tone guidance. 8s timeout, 0.9 temperature, 150 max tokens. Rate limit: 10/day free. Structured output: `MESSAGE: .../STATE: ...` format with parsing.
- **MochiSessionCompanion upgrade:** Shows hardcoded fallback message immediately on trigger, then fires async AI request. If AI responds before bubble is dismissed (8s window), replaces the text seamlessly via `setActiveBubble` callback. Guest users → hardcoded only (no API call). New `behaviorProfile` prop fed from `useUserBehavior` in FocusScreen.
- **Mascot `encouraging` state:** `src/shared/ui/Mascot.tsx` — new visual state: warm purple+teal gradient with teal glow, cheeks visible, wider smile. Used by AI Mochi for comeback/struggle triggers.

## Architecture (Sprints X–Z additions)
- **Focus Rooms (Sprint X):** `src/shared/hooks/useFocusRoom.ts` — `useFocusRoom()` hook manages Supabase Realtime channel `focus-room:{code}` with presence protocol. States: idle/connecting/connected/error. `create()` → 4-char code via `Math.random().toString(36)`. `join(code)` → subscribes. `broadcast(phase)` → `channel.track({ phase })`. `leave()` → `untrack` + `removeChannel`. `src/features/focus/FocusRoomSheet.tsx` — bottom sheet with create/join/copy-code UI and live peer list. FocusScreen: "🤝 Focus with someone" button (idle state) → opens sheet. Room active chip shows peer count. In-session: peer phase dots + S-11 encouragement text replaces Ambient Orbit pill when room active.
- **Task Reordering (Sprint Y):** `TasksPage.tsx` — `DndContext` + `SortableContext` wraps NOW and NEXT pool lists. `SortableTaskCard` uses `useSortable` from `@dnd-kit/sortable`. `handleDragEnd` calls `reorderPool(pool, arrayMove(tasks, oldIdx, newIdx))`. Store: `reorderPool(pool, ordered)` updates `position` field on each task. PointerSensor (distance: 6) + TouchSensor (delay: 200ms) for mobile hold-to-drag.
- **Session History (Sprint Z):** `src/features/history/HistoryPage.tsx` — `/history` route (lazy). Groups raw sessions from `useSessionHistory` by date. Shows duration / phase (color-coded) / energy before→after emojis per session. Summary strip: total sessions / total minutes / flow-session count. Guest → sign-in prompt. Empty → encouraging empty state. Linked from ProgressPage via "📋 Session Log →" row. S-7 `SessionFrictionNudge` component in `AppShell.tsx` — detects `prevPath === '/focus' && currPath !== '/focus' && isInFocus` → shows 5s auto-dismiss teal pill.

## Architecture (Sprints U–W additions)
- **Weekly Planning Ritual (Sprint U):** `src/features/focus/WeeklyPlanning.tsx` — lazy z-50. 3 steps: recap (completedTotal + currentStreak mini-cards) → intention chip picker (4 options: consistent/challenge/recover/explore) → closing affirmation. Auto-advances on chip pick (220ms). `finish()` calls `setWeeklyIntention('emoji label')`. Store: `weeklyPlanShownWeek: string|null`, `weeklyIntention: string|null` (both persisted). Trigger in `App.tsx`: Sunday 18pm+ or Monday before noon; ISO week key computed with Sunday→next-week offset. Mutually exclusive with all other overlays (lowest priority).
- **Task Notes (Sprint V):** `note?: string` added to `Task` interface (`types/index.ts`). `AddTaskModal`: `showNote` state; initially shows "+ Add context (optional)" link; click expands animated textarea. `note.trim() || undefined` written to task. `TaskCard`: shows `📝 {note}` 1-line preview below title when present. Memo comparator includes `note` field.
- **Adaptive Focus Setup (Sprint W):** `FocusScreen.tsx` setup screen: (1) Today's Progress strip — shows `completedTotal` + `todayFocusMin` (from weeklyStats.dailyMinutes[(day+6)%7]) + weeklyIntention chip; only renders when any value >0 or intention set. (2) Adaptive ADHD tip card — 4 variants from `timeBlindness` (often/sometimes) + `emotionalReactivity` (high/moderate); teal-tinted card; returns null for non-ADHD profiles. Both values come from new store destructure in `FocusScreen.tsx`.

## Architecture (Sprint N additions)
- **O-9 Full surprise timer:** `ArcTimer.tsx` — `progressStroke = isSurprise ? 'transparent' : arcColor`. Progress arc becomes invisible; background ring track still renders as passive visual anchor. `FocusScreen.tsx` — wraps entire duration preset block in `{timerStyle !== 'surprise' && ...}`. In surprise mode renders "🎲 Surprise mode" info card instead. Digits were already hidden (Sprint K). Now truly time-blind: no arc, no digits, only orb.
- **O-7 Psychotype re-derivation:** `src/shared/lib/psychotype.ts` (NEW) — `deriveFromSessions(sessions: FocusSessionRow[]): Psychotype | null`. 4 scoring axes: achiever (deep-focus rate + avg session length), explorer (duration stdDev + hour stdDev), connector (unique active days / 30 + energy delta), planner (hour stdDev < 5 + duration consistency). Returns null if score < 2 or < 10 sessions. `useSessionHistory` exposes `sessions: FocusSessionRow[]`. Store: `psychotypeLastDerived: string|null`, `setPsychotype`, `setPsychotypeLastDerived` (all persisted). `ProgressPage` "Your Focus Style" card: current type emoji+desc always shown; amber evolution nudge + Update CTA when derived ≠ current.

## Architecture (Sprint M additions)
- **O-6 ADHD signal:** `OnboardingPage.tsx` — 2 new steps (index 3 & 4) replace deprecated cognitiveMode step. `TIME_BLINDNESS_MAP: ['often','sometimes','rarely']`, `EMOTIONAL_REACTIVITY_MAP: ['high','moderate','steady']`. Store: `timeBlindness`, `emotionalReactivity` (both persisted). `setTimeBlindness`, `setEmotionalReactivity` setters. Option cards auto-advance with 160ms delay (removes need for Continue button on card-select steps).
- **O-11 Revisit mode:** `OnboardingPage.tsx` reads `onboardingCompleted` from store. `isRevisit = onboardingCompleted`. `initialSelections` pre-fills from store values via `modeToIdx/tbToIdx/erToIdx` helpers (run once at mount). `finish()` skips `setOnboardingCompleted()` and calls `navigate(-1)` on revisit. "Refreshing your profile 🔧" banner shown at top.
- **O-12 Peak Focus Window:** `ProgressPage.tsx` — new card between Energy Trends and Share button. Shows `weeklyStats.peakFocusTime` (teal) + `weeklyStats.consistencyScore × 7` days active (indigo). Only renders when `peakFocusTime !== 'Not enough data'`. Data already computed by `useSessionHistory` → `computeWeeklyStats`.
- **energy_after (Known Gap resolved):** `useFocusSession.ts` — `savedSessionIdRef.current` captures DB row ID after session save. `handlePostEnergy` calls `supabase.from('focus_sessions').update({ energy_after: level }).eq('id', savedSessionIdRef.current)`. This was already implemented; marking as resolved.

## Architecture (Sprint L additions)
- **Medication peak window (B-12):** `FocusScreen.tsx` — `MED_PEAK_HOURS` map (morning=[8,11], afternoon=[13,16], evening=[17,20]). `getMedPeakLabel()` returns pill string if current hour is in window and `medicationEnabled`. `medPeakLabel` via `useMemo`. Badge renders above Start button in indigo-tinted pill. Non-blocking, no DB write.
- **Monthly Reflection (B-5):** `src/features/focus/MonthlyReflection.tsx` — lazy loaded, z-50. 3 steps: recap (completedTotal + longestStreak) → 1-word intention (quick-pick chips + free input) → closing auto-dismiss 3s. `monthlyReflectionShownMonth: string | null` in store (persisted as 'YYYY-MM'). `setMonthlyReflectionShownMonth`. Triggers in App.tsx when `currentDay <= 5 && monthlyReflectionShownMonth !== currentMonth`. Mutually exclusive with all other overlays (lowest priority).
- **Settings Medication section:** Toggle + 3 time chips (morning/afternoon/evening). Wired to `medicationEnabled/setMedicationEnabled` + `medicationTime/setMedicationTime` from store.
- **Settings Preferences section:** "Re-run setup wizard" button → `navigate('/onboarding')`.
- **i18n foundation:** `src/shared/lib/i18n/en.ts` (source of truth, typed `I18nKey`), `ru.ts` (partial override), `index.ts` (resolveLocale + t() with `{{placeholder}}` interpolation, auto-fallback to en). `src/shared/hooks/useI18n.ts` — `{ t, locale }`, locale resolved once per mount from `navigator.language`. Greeting in `HomePage` wired to `t('home.greeting.*')`. EN+RU strings cover: greetings, home, focus, tasks, settings, generic.

## Architecture (Sprint K additions)
- **Surprise timer orb:** `ArcTimer.tsx` — in surprise mode, center shows `motion.div` with radial-gradient pulsing animation (scale 0.7→1.15→0.7, opacity 0.2→0.55→0.2, 3.5s loop). Respects `reducedMotion`.
- **Hyperfocus Autopsy:** `PostSessionFlow.tsx` `NatureBuffer` — accepts `sessionMinutes?: number` prop. When ≥45: shows 3-option reflection card above energy check-in. Local state `autopsyPick` tracks selection. Non-blocking, no DB write yet (future sprint).
- **Two-Thirds guardrail:** TasksPage NEXT header shows "filling up" amber badge when `nextTasks.length >= 4`. AddTaskModal shows gentle warning when `nextCount >= 4 && isFull`. Never blocking.
- **native.ts:** `src/shared/lib/native.ts` — zero TS imports of @capacitor. Uses `window.Capacitor.Plugins` for runtime access. Exports: `isNativeApp`, `nativeHapticImpact/Notification/Selection`, `nativeStatusBarHide/Show/Dark`, `nativeShare`, `canShare`. FocusScreen calls hide/show on screen state changes.
- **Web Share:** ProgressPage imports `nativeShare + canShare`. Share button conditionally shown. Shares weekly focus minutes + completedTotal.
- **PWA manifest:** `public/manifest.json` — 4 shortcuts, categories, screenshots, edge_side_panel. Linked via `<link rel="manifest">` in index.html.

## Architecture (Sprint J additions)
- **Voice input:** `AddTaskModal` has mic button (Lucide `Mic`/`MicOff`/`Loader2`). Uses `window.SpeechRecognition || window.webkitSpeechRecognition`. On transcript: calls `classify-voice-input` edge function → auto-fills title, difficulty, duration, dueDate. Falls back to raw transcript if API fails. `voiceSupported` flag hides button if API unavailable.
- **Smart duration:** `SMART_DURATION: Record<1|2|3, number> = {1:15, 2:25, 3:45}`. Auto-applied when difficulty changes unless user manually picked a duration (`minutesManuallySet` ref). "✨ smart" badge shown when auto-mode active.
- **ShutdownRitual:** `src/features/focus/ShutdownRitual.tsx` — lazy loaded, z-50. 3 steps: wins review / set tomorrow's ONE thing / goodnight. Creates NEXT task with tomorrow's dueDate. Store field: `shutdownShownDate` (ISO date, persisted). Triggered once per day after 9pm from App.tsx useEffect. All three overlays (Recovery / ContextRestore / Shutdown) are mutually exclusive.
- **Auto-reschedule banner:** `TasksPage` detects `[...nowPool, ...nextPool].filter(active && dueDate < TODAY)`. Gold `<button>` navigates to `/calendar`. Non-shaming copy.
- **Capacitor:** `capacitor.config.ts` at project root. `appId: com.mindshift.app`. Config includes SplashScreen/StatusBar/Keyboard/LocalNotifications/PushNotifications. `package.json` scripts: `cap:sync`, `cap:ios`, `cap:android`, `cap:run:android`. Install step: `npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android` (not committed — user runs once).

## Architecture (Sprint I additions)
- **idbStorage:** `src/shared/lib/idbStorage.ts` — Zustand `StateStorage` adapter using `idb-keyval`. Transparent migration: reads localStorage on first load, migrates to IDB, removes from localStorage. Replaces 5MB localStorage limit.
- **Invisible streaks:** `currentStreak / longestStreak / lastActiveDate` in store. Tracked inside `completeTask`. Shown in HomePage only when `currentStreak >= 2`. Never shames on break.
- **Haptic engine:** 9 ADHD-safe patterns in `haptic.ts`. All focus-session events (start/phase/end/breathe) now have distinct patterns. Works on Android Chrome; silently fails on iOS.
- **AudioPreset + Sound section:** Settings → Sound: 5 presets (brown/pink/nature/lofi/gamma), preview button, "lock as focus anchor" button, volume slider. `focusAnchor` persisted in store.
- **Phase-adaptive audio:** `adaptToPhase(phase)` on `useAudioEngine` hook. Called from `useFocusSession` on every `sessionPhase` change. 1.5s smooth ramp via Web Audio `setTargetAtTime`.
- **BreathworkRitual:** `src/features/focus/BreathworkRitual.tsx` — 3-cycle breathwork overlay before focus session. Pulsing SVG orb, haptic sync, progress dots, skip button. Respects `reducedMotion`.
- **Low-energy auto-simplify:** `isLowEnergy = energyLevel <= 2 || burnoutScore > 60`. When true: 1 NOW task shown, NEXT pool hidden, BentoGrid hidden, gentle banner shown.
- **Mochi energy reactions:** `MOCHI_ENERGY_MESSAGES` pool (5 levels × 3 messages). Speech bubble appears on homepage when energy changes, auto-dismisses after 5s.
- **Locale injection:** `navigator.language` BCP-47 code injected into all 3 AI edge functions (decompose-task/recovery-message/weekly-insight). Gemini responds in user's language natively.
- **Spiciness meter:** 5-chip overwhelm picker in `RecoveryProtocol`. Value 1–5 maps to step count (5-7/3-5/2-3) and granularity in `decompose-task` edge function. Defaults to 3 (moderate).

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
- **Gate command: `tsc -b`** (not `tsc --noEmit` — the latter misses `noUnusedLocals` and stricter generics)
- Sprint D–H: `tsc -b` ✅, `npm run build` ✅ (38 precache entries), `npx playwright test` 132/132 ✅
- Sprint BB: `tsc -b` ✅, dead code removed (655 lines), CORS hardened, store fixed
- Sprint BC: `tsc -b` ✅, FocusScreen decomposed, dateUtils centralised
- Always run `tsc -b` before any commit. Use `/verify` command in Claude Code.

## Production Status (as of Sprint H — 16 March 2026)
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
- ~~**energy_after**~~ ✅ Resolved Sprint M — `handlePostEnergy` in `useFocusSession.ts` calls `supabase.update({ energy_after: level })` using `savedSessionIdRef.current`.
- **Server-side push (v2)** — SW showNotification works when tab is in background (Sprint F). Full push when app is closed needs VAPID keys + Supabase cron.
- **Stripe integration** — subscriptionTier exists in store, ProBanner UI removed (Sprint A). Zero payment logic. Restore ProBanner when Stripe ready.
- **classify-voice-input** — edge function written + wired in AddTaskModal. Unconfirmed in production (`supabase functions list` to verify).
- ~~**Social layer**~~ ✅ Sprint X — Focus Rooms via Supabase Realtime presence.
- **Health signals** — sleepQuality, chronotype, medicationTime removed from UI (Sprint A). Store fields remain. Re-add when wired to recommendations.
- **Google OAuth setup** — Code ready (Sprint AA). Requires: Supabase Dashboard → Authentication → Providers → Google → Enable + set Client ID/Secret from Google Cloud Console.
- **user_behavior table** — Schema defined in types/database.ts. `useUserBehavior` hook computes behavior profile client-side. Server-side aggregation (populating `user_behavior` table via cron) is a future optimization.

## Remaining P2 Backlog (not yet implemented)
- ~~O-6: Expanded ADHD signal~~ ✅ Sprint M
- ~~O-7: Psychotype re-derivation from usage patterns~~ ✅ Sprint N
- ~~O-9: "Surprise me" timer (hide all digits completely)~~ ✅ Sprint N (arc hidden too)
- ~~O-11: Onboarding skip + revisit engine~~ ✅ Sprint M
- ~~O-12: Daily energy pattern detection from logs~~ ✅ Sprint M (peakFocusTime card)
- ~~S-2: Ambient Orbit (anonymous "47 people focusing now" counter)~~ ✅ Sprint Q (Supabase count proxy, 30-min window)
- ~~S-3: 1:1 Focus Partner (Model A — Supabase Realtime)~~ ✅ Sprint X (useFocusRoom + FocusRoomSheet — create/join room, peer phases)
- ~~S-4: Quiet Room (Model B — 2-4 person rooms)~~ ✅ Sprint X (same room supports up to N people via presence)
- S-5: Ghosting Grace protocol
- ~~S-7: Anti-social-scroll friction~~ ✅ Sprint Z (SessionFrictionNudge in AppShell — 5s auto-dismiss)
- S-9: Post-social cool-down ritual
- ~~S-11: Anonymous encouragement in rooms~~ ✅ Sprint X (ROOM_ENCOURAGEMENTS rotating text shown during sessions)
- ~~B-5: Monthly reflection ritual~~ ✅ Sprint L
- ~~B-6: Hyperfocus Autopsy~~ ✅ Sprint K
- ~~B-9: Two-Thirds guardrail~~ ✅ Sprint K
- ~~B-12: Medication peak window overlay~~ ✅ Sprint L

## Architecture (Sprint O–Q additions)
- **Daily focus goal (P-1):** `dailyFocusGoalMin: number` (default 60) + `goalCelebratedDate: string|null` persisted in store. `useAmbientOrbit` hook in FocusScreen queries Supabase count. HomePage: today's progress bar using `weeklyStats.dailyMinutes[(getDay()+6)%7]`; teal when goal reached; one-time toast via `setGoalCelebratedDate`. Settings: 30/45/60/90 chip picker.
- **Recurring tasks:** `repeat: 'none'|'daily'|'weekly'` on `Task` type. `completeTask` creates next occurrence with `+1/+7` day `dueDate` when `repeat !== 'none'`. AddTaskModal: Once/Daily/Weekly chips.
- **Task search:** `searchQuery` state in TasksPage; filters all three pools simultaneously via useMemo with case-insensitive `.includes()`. Lucide `Search`/`X` icons.
- **Ambient Orbit (S-2):** `useAmbientOrbit(active)` in `FocusScreen.tsx` — Supabase `count` query on `focus_sessions` WHERE `started_at > now()-30m`; refreshes every 5 min; teal pill fades in with 10s delay at 55% opacity; `pointer-events:none`.

## AI Toolchain (for any AI agent picking up this project)
| What | Where | Purpose |
|------|-------|---------|
| Rules | `.claude/rules/guardrails.md` | 10 hard rules: ADHD-safe, motion, a11y, store, copy, architecture |
| Rules | `.claude/rules/typescript.md` | TS/React patterns, imports, CSS |
| Rules | `.claude/rules/security.md` | Secrets, auth, GDPR, edge functions |
| Rules | `.claude/rules/testing.md` | E2E/unit test patterns |
| Skill | `.claude/skills/humanizer/SKILL.md` | Remove AI-isms from text (25 patterns) |
| Agents | `.claude/agents/` | code-reviewer, build-error-resolver, e2e-runner |
| Commands | `.claude/commands/` | /verify, /build-fix, /tdd, /e2e, /code-review |
| Contexts | `.claude/contexts/` | dev (ship it), review (find bugs) |
| Hooks | `.claude/hooks.json` | Auto-typecheck after edits, console.log detection |
| Memory | `memory/` | glossary, architecture, design rules, people, projects |

## Google Play Launch Status (as of 2026-03-20)
| Item | Status | Notes |
|------|--------|-------|
| App code | ✅ | Production-ready v1.0 |
| Privacy/Terms | ✅ | Public URLs |
| Play Store listing text | ✅ | Ready |
| CI/CD edge functions | ✅ | GitHub Action |
| Telegram bot | ✅ | Code ready, migration applied |
| Feature graphic 1024x500 | ❌ | Needs design |
| 8 phone + 4 tablet screenshots | ❌ | Needs capture |
| Android AAB build | ❌ | After account verification |
| Google Play account | ⏳ | Waiting verification |
| In-App Review API | ❌ | Trigger after 3rd session, not in low energy |
| Home screen widget | ❌ | Post-launch (30 days) |

## Preferences (Yusif)
- Russian comms OK in conversation; commit messages in English
- ADHD-aware design = non-punitive, calm palette, no red/urgency
- Always: `tsc -b` before commit (not `tsc --noEmit`)
- Humanizer skill on all user-facing text
→ Full details: memory/

