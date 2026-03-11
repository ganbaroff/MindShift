# MindShift — Claude Working Memory

## Project
**MindShift** — ADHD-aware productivity PWA. Mobile-first, React + TypeScript + Supabase.
Owner: **Yusif** (ganbarov.y@gmail.com). Branch: `main` @ `4fe6a19`. Status: **production-ready**.

## Sprint History
| Sprint | Commit | What landed |
|--------|--------|-------------|
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
| **timerStyle** | countdown/countup/surprise — set in onboarding screen 3.5 |
| **MochiSessionCompanion** | Active body-double during focus: phase bubbles, 20-min accountability prompts |
| **BurnoutAlert** | Amber card (score 41-65) or purple card (66+) on ProgressScreen |
| **LifetimeStatsWidget** | Bento widget: completedTotal + totalFocusMinutes + "You keep showing up 💫" |
| **flexiblePauseUntil** | ISO date: planned break gate in App.tsx. Clears silently on date pass. |
| **Traffic Light** | Task difficulty: easy(teal)/medium(gold)/hard(purple) — never red |

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
- **Error boundaries:** Per-route `<ErrorBoundary fallback={<RouteError />}>` wrapping all lazy routes
- **ADRs:** 6 documented in `docs/adr/` (rate-limiting, Zustand, offline, PWA, colors, AI)

## Build Notes (important!)
- Sprint 8: `npm run build` ✅, `vitest` 82/82 ✅, `tsc` ✅
- Cowork session: `tsc --noEmit` ✅ only (no rollup Linux binary in Cowork sandbox)
- Always run `tsc --noEmit` before any commit from Cowork
- Branch: `main` @ `4fe6a19`

## Production Status (as of Sprint 8)
| Item | Code | Deployed | Notes |
|------|------|----------|-------|
| Vercel hosting | ✅ vercel.json | ✅ live | Verified by Yusif. App opens. |
| Supabase DB | ✅ migrations exist | ✅ live | Verified by Yusif. Auth works. |
| Edge functions | ✅ 6 functions written | ❓ unconfirmed | Need: `supabase functions list` to verify |
| Env vars (Vercel) | ✅ .env exists | ✅ assumed | App works → vars must be set |
| Data persistence (tasks etc.) | ✅ code ready | ❓ untested | Only 1 user (Yusif). Needs real session test. |
| Sentry | ✅ DSN configured, deferred init | ❓ unconfirmed | Check sentry.io → Issues |
| Analytics | ✅ @vercel/analytics + web-vitals | ❓ unconfirmed | Check Vercel dashboard → Analytics tab |
| Stripe / Payments | ❌ not implemented | ❌ planned | ProBanner UI exists. Stripe account to be set up. |
| Real users | 1 (Yusif only) | — | Design + auth issues resolved. Ready for beta invites. |

## Known Gaps (not yet implemented)
- **energy_after** — field exists in DB but never written from UI after focus sessions
- **Server-side reminders** — browser setTimeout only (lost on tab close). Need SW push or Supabase cron.
- **Stripe integration** — subscriptionTier exists in store + ProBanner UI, but zero payment logic. Planned next.
- **classify-voice-input** — code audit shows it IS wired in AddTaskModal (not "pending" as noted). Status: working in code, unconfirmed in production.

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

