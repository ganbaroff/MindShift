# MindShift Architecture Context
Updated: 2026-03-20 (Sprint BC complete)

## Tech Stack
| Layer | Technology | Notes |
|-------|-----------|-------|
| UI | React 19 + TypeScript 5.9 + Vite 7 | Strict mode, tsc -b |
| Styling | Tailwind CSS v4 | @theme + @import "tailwindcss" |
| Animation | motion/react v12 | useMotion() wraps prefers-reduced-motion |
| State | Zustand v5 | 7 slices + persist + subscribeWithSelector |
| Backend | Supabase | Auth + DB + Edge Functions (Deno) + Realtime |
| Audio | Web Audio API | AudioWorklet for brown noise, buffer for others |
| PWA | vite-plugin-pwa + Workbox | injectManifest, offline-first |
| Persistence | IndexedDB (idbStorage) + Supabase | 2-tier (migrated from localStorage Sprint I) |
| Unit tests | vitest v4 | src/**/__tests__/*.test.ts |
| E2E | Playwright | chromium + mobile (iPhone 14), 132+ tests |
| DnD | dnd-kit | TouchSensor 200ms, PointerSensor 6px |
| Data fetching | @tanstack/react-query | Deduplication for Supabase queries |
| Routing | react-router v7 | Lazy-loaded screens |

## Directory Structure (current)
```
src/
  app/           App.tsx, AppShell.tsx
  features/
    auth/        AuthScreen.tsx (magic link + Google OAuth)
    onboarding/  OnboardingPage.tsx (6-step wizard)
    home/        HomePage.tsx, BentoGrid widgets/
    tasks/       TasksPage.tsx, AddTaskModal.tsx, TaskCard.tsx
                 RecoveryProtocol.tsx, ContextRestore.tsx
    focus/       FocusScreen.tsx (thin orchestrator ~450 lines)
                 FocusSetup.tsx (setup UI ~459 lines)
                 useFocusSession.ts (FSM hook ~280 lines)
                 SessionControls.tsx, PostSessionFlow.tsx
                 ArcTimer.tsx, MochiSessionCompanion.tsx
                 BreathworkRitual.tsx, ShutdownRitual.tsx
                 WeeklyPlanning.tsx, MonthlyReflection.tsx
                 FocusRoomSheet.tsx
    history/     HistoryPage.tsx (session log)
    calendar/    DueDateScreen.tsx
    progress/    ProgressPage.tsx, Avatar.tsx
    settings/    SettingsPage.tsx
    preview/     PreviewScreen.tsx
  components/    TaskCard, AddTaskModal, EnergyPicker, Fab, MochiAvatar, BottomNav
  shared/
    hooks/       useMotion, usePalette, useAudioEngine, useSessionHistory,
                 useTaskSync, useFocusRoom, useUserBehavior, useI18n
    ui/          CookieBanner, InstallBanner, Mascot, Confetti, ShareCard,
                 ErrorBoundary, LoadingScreen, Card, Input, Button
    lib/         constants.ts, haptic.ts, native.ts, tokens.ts,
                 burnout.ts, psychotype.ts, dateUtils.ts,
                 idbStorage.ts, offlineQueue.ts, logger.ts,
                 i18n/{en,ru,index}.ts
  store/         index.ts (7 slices, all state)
  types/         index.ts (domain), database.ts (Supabase)
supabase/
  functions/     7 Edge Functions (Deno): decompose-task, classify-voice-input,
                 recovery-message, weekly-insight, mochi-respond, gdpr-export, gdpr-delete
  migrations/    001_init.sql, 007_health_profile.sql
```

## State Machine: FocusScreen
```
setup → [breathwork?] → session → interrupt-confirm → bookmark-capture → (back to session)
                                                     ↘ end session
session → nature-buffer (2min) → recovery-lock (10min) → done
session → hard-stop (90/120min) → nature-buffer → recovery-lock → done
```

## Auth Flow
```
Magic link: Email → Supabase sendOTP → "Check inbox" → link → onAuthStateChange → consent check
Google OAuth: signInWithOAuth({ provider: 'google' }) → redirect → onAuthStateChange → consent check
Guest mode: ms_signed_out flag, local-only store
```

## Persistence (2-tier, migrated Sprint I)
```
1. IndexedDB via idbStorage adapter (Zustand persist):
   - All partialize() fields: userId, email, appMode, energyLevel, psychotype,
     xpTotal, achievements, audioVolume, focusAnchor, gridWidgets,
     completedTotal, weeklyIntention, monthlyReflectionShownMonth,
     shutdownShownDate, weeklyPlanShownWeek, etc.
   - Transparent migration from localStorage on first load

2. Supabase (server, logged-in users):
   - tasks, focus_sessions, profiles, energy_logs
   - edge_rate_limits (AI rate limiting)
   - useTaskSync: bidirectional sync, server-wins-on-login
   - useSessionHistory: React Query deduplication
```

## Key Design Decisions (ADRs in docs/adr/)
- ADR-0001: DB-backed rate limiting for Edge Functions
- ADR-0002: Zustand over Redux/Jotai
- ADR-0003: Offline-first pattern (enqueue/dequeue)
- ADR-0004: PWA service worker (injectManifest)
- ADR-0005: ADHD-safe color system (Research #8)
- ADR-0006: AI edge functions via Gemini 2.5 Flash
- ADR-0007: Accessibility (Sprint 9)

## Build & Deploy
- Build: `tsc -b && vite build` (both must pass)
- Deploy: Vercel auto-deploy on push to main
- Stable URL: https://mind-shift-git-main-yusifg27-3093s-projects.vercel.app
- CI: GitHub Actions e2e-production.yml (fires on Vercel deployment_status)
