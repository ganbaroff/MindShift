# MindShift Architecture Context

## Tech Stack
| Layer | Technology | Notes |
|-------|-----------|-------|
| UI | React 19 + TypeScript + Vite 7 | Strict mode |
| Styling | Tailwind CSS v4 | Arbitrary values supported |
| Animation | motion/react (Framer Motion) | Respects prefers-reduced-motion |
| State | Zustand v5 | 6 slices + persist middleware |
| Backend | Supabase | Auth + DB + Edge Functions (Deno) |
| Audio | Web Audio API | AudioWorklet for brown noise |
| PWA | vite-plugin-pwa + Workbox | Offline support |
| Persistence | localStorage (Zustand) + IndexedDB (idb-keyval) + Supabase | 3-tier |
| Testing | vitest v4 | 4 files, 78 tests |
| E2E | Playwright | 6 spec files |
| DnD | dnd-kit | TouchSensor 150ms delay, KeyboardSensor |
| Forms | Native | No form library |
| Routing | react-router-dom v7 | Lazy-loaded screens |

## Directory Structure
```
src/
  app/           App.tsx, AppShell.tsx, BottomNav.tsx
  features/
    auth/        AuthScreen.tsx
    onboarding/  OnboardingFlow.tsx (3 steps)
    home/        HomeScreen.tsx, BentoGrid.tsx, EnergyCheckin.tsx
                 widgets/ (5 widget types)
    tasks/       TaskCard.tsx, TasksScreen.tsx, AddTaskModal.tsx
                 RecoveryProtocol.tsx, ContextRestore.tsx
    focus/       FocusScreen.tsx (6-state machine), ArcTimer.tsx
    audio/       AudioScreen.tsx
    progress/    ProgressScreen.tsx
    settings/    SettingsScreen.tsx
  shared/
    hooks/       useAudioEngine, useMotion, usePalette, useInstallPrompt
    ui/          CookieBanner, InstallBanner, Mascot, Confetti, CoachMark
                 ErrorBoundary, LoadingScreen
    lib/         constants.ts, haptic.ts, notify.ts, logger.ts
                 offlineQueue.ts, motion.ts, cn.ts
  store/         index.ts (all state)
  types/         index.ts (domain), database.ts (Supabase generated)
supabase/
  functions/     5 Edge Functions (Deno)
  migrations/    6 SQL migrations
```

## State Machine: FocusScreen
```
setup → session → interrupt-confirm → bookmark-capture → (back to session)
                                    ↘ end session
session → recovery-lock → nature-buffer → done
```

## Auth Flow
```
Email input → Supabase sendOTP → "Check inbox" screen
  [email client] magic link click
  → App.tsx onAuthStateChange → checkConsentPending()
  → if !onboardingCompleted → /onboarding
  → else → /
```

## Recovery Protocol Trigger
```
App.tsx: lastSessionAt check on mount
  if (Date.now() - lastSessionAt) > 72h → showRecovery=true
  → RecoveryProtocol overlay (z-50)
  → archiveAllOverdue() on mount
  → recovery-message edge function (AI welcome)

  if 30h < elapsed < 72h → ContextRestore overlay (z-40)
```

## Audio Engine Architecture
```
useAudioEngine:
  AudioContext (singleton)
  Brown noise: AudioWorklet processor (seam-free leaky integrator)
  Others: Buffer-based (decode → loop)
  All nodes: → HPF (60Hz) → GainNode → destination
  Crossfade: constant power (sine/cos), 1.5s
  Gain mapping: logarithmic 0.001–0.10 (slider 0–1)
  iOS: ctx.resume() on play() (suspended state fix)
```

## Persistence Layers
```
1. Zustand persist (localStorage):
   - userId, email, cognitiveMode, appMode, psychotype
   - xpTotal, achievements, audioVolume, focusAnchor
   - seenHints, gridWidgets, completedTotal (added 2026-03-09)

2. IndexedDB (idb-keyval):
   - Used by offline queue

3. Supabase (server):
   - users, tasks, focus_sessions, achievements, energy_logs
   - Rate limits per user (edge_rate_limits table)
```

## Key Design Decisions (ADRs)
- ADR-0001: DB-backed rate limiting for Edge Functions
- ADR pending: Zustand over Redux (lighter, React 19 compatible)
- ADR pending: AudioWorklet for brown noise (seam-free vs buffer gaps)
- ADR pending: Bento grid with psychotype-driven defaults
- ADR pending: Variable ratio XP (VR schedule for dopamine)

## Known Platform Issue
node_modules installed on Windows. Linux binaries missing:
- @rollup/rollup-linux-x64-gnu (affects vite build + vitest)
- @esbuild/linux-x64 (affects esbuild)
Fix: `npm install` on Linux/macOS
Workaround: created lazy-throwing rollup stub in node_modules
tsc works fine (no native binary needed)
