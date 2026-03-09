# MindShift — Claude Working Memory

## Project
**MindShift** — ADHD-aware productivity PWA. Mobile-first, React + TypeScript + Supabase.
Owner: **Yusif** (ganbarov.y@gmail.com). Branch: `fix/mobile-ux-bugs`. Status: **beta-ready**.

## Stack (hot cache)
| Term | Meaning |
|------|---------|
| **store** | Zustand v5 store @ `src/store/index.ts` — 6 slices + persist |
| **partialize** | The `partialize` fn in store = what survives page reload |
| **AppShell** | Layout wrapper — BottomNav, InstallBanner, safe-area pb |
| **BentoGrid** | dnd-kit drag grid on HomeScreen — 5 widget types |
| **ArcTimer** | SVG progress ring in FocusScreen — 3 phases: struggle/release/flow |
| **useAudioEngine** | Web Audio API hook — AudioWorklet (brown) + buffers (others) |
| **RecoveryProtocol** | Full-screen overlay when user absent 72h+ (z-50) |
| **ContextRestore** | Half-screen overlay when user absent 30–72h (z-40) |
| **CookieBanner** | z-50, inline `bottom: calc(64px + env(safe-area-inset-bottom) + 8px)` |
| **palette** | `usePalette()` hook — desaturated colors in calm/focused mode |
| **psychotype** | Derived from onboarding: planner/achiever/explorer/connector |
| **offline queue** | `enqueue()`/`dequeue()` pattern for Supabase writes when offline |

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
| `src/shared/lib/constants.ts` | All numeric constants (XP, phases, audio) |
| `src/app/App.tsx` | Router, auth, RecoveryProtocol detection |
| `src/app/AppShell.tsx` | Layout, pb safe area calc |
| `src/features/focus/FocusScreen.tsx` | 6-state machine: setup/session/interrupt/bookmark/recovery-lock/nature-buffer |
| `docs/full-audit-2026-03-09.md` | Latest QA audit (all 7 flows, 9 fixes applied) |
| `docs/ui-audit-2026-03-09.md` | Previous UI audit (78 tests pass, build clean) |

## Supabase Edge Functions
| Function | Does |
|----------|------|
| `decompose-task` | AI breaks 1 task into subtasks |
| `recovery-message` | AI welcome back message after 72h+ |
| `weekly-insight` | AI weekly summary from session data |
| `gdpr-export` | JSON data export |
| `gdpr-delete` | Full account deletion |

## Design Tokens (hardcoded — migration pending)
| Token | Value | Usage |
|-------|-------|-------|
| `primary` | `#7B72FF` | CTA, FAB, accent |
| `teal` | `#4ECDC4` | Easy tasks, release/flow phase |
| `gold` | `#F59E0B` | Hard tasks, carry-over badge, recovery phase |
| `surface` | `#1E2136` | Card background |
| `surface-raised` | `#252840` | Input, disabled state |
| `text-primary` | `#E8E8F0` | Body text |
| `text-muted` | `#8B8BA7` | Secondary text |

## Build Notes (important!)
- node_modules installed on **Windows** → `@rollup/rollup-linux-x64-gnu` binary absent
- `tsc --noEmit` ✅ works fine
- `npm run build` / `npx vitest run` ❌ blocked (rollup binary missing)
- Fix: `npm install` on Linux/Mac to get correct binaries
- Pre-built `dist/` exists from last clean build

## Preferences (Yusif)
- Commits on branch `fix/mobile-ux-bugs`
- Russian comms OK in conversation; commit messages in English
- ADHD-aware design = non-punitive, calm palette, no red/urgency
- Always: `tsc --noEmit` before commit
→ Full details: memory/

