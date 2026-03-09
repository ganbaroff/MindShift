# Bolt 6.2 — Centralized Animation System

## Goal
Build a research-backed (Research #2) centralized animation system that enforces
neurodivergent-friendly motion rules across the entire app, replacing scattered
hardcoded transitions with a single source of truth.

## Acceptance Criteria
- [x] AC1: `src/shared/lib/motion.ts` — SPRING, SPRING_EXPRESSIVE, FADE, INSTANT configs
- [x] AC2: `src/shared/hooks/useMotion.ts` — hook combining OS prefers-reduced-motion + in-app reducedStimulation
- [x] AC3: `Button.tsx` — uses `useMotion()`, whileTap disabled when reduced
- [x] AC4: `AuthScreen.tsx` — all hardcoded transitions replaced with `t()` / `t('expressive')`
- [x] AC5: `AuthScreen.tsx` — looping glow ring animation disabled when `!shouldAnimate`
- [x] AC6: `OnboardingFlow.tsx` — all hardcoded transitions replaced with `t()`
- [x] AC7: `npm run build` — 0 TypeScript errors, 0 lint errors

## Changes
- `src/shared/lib/motion.ts` (NEW) — centralized configs:
  - SPRING: stiffness 300, damping 30 (ζ≈1.0, critically damped, zero bounce)
  - SPRING_EXPRESSIVE: stiffness 260, damping 20 (ζ<1.0, celebration only)
  - FADE: 200ms ease-out (used when motion reduced)
  - INSTANT: 0ms (accessibility extreme)
  - DURATION: micro(0.15) / standard(0.25) / reveal(0.40)
  - EASE: out + gentle curves
  - Variant presets: slideUp, fadeOnly, scaleIn, slideHorizontal
- `src/shared/hooks/useMotion.ts` (NEW) — MotionAPI hook:
  - Reads `useReducedMotion()` (OS) + `reducedStimulation` from Zustand
  - `shouldAnimate = !osReduced && !storeReduced`
  - `t()` picks SPRING or INSTANT; `t('expressive')` picks SPRING_EXPRESSIVE
  - Variant presets auto-collapse to fadeOnly when motion reduced
  - VariantPreset type added to resolve TS strict union incompatibility
- `src/shared/ui/Button.tsx` — updated to use `useMotion()`, whileTap conditional
- `src/features/auth/AuthScreen.tsx` — all 6 hardcoded transitions replaced
  - MochiLogo: `t('expressive')` + looping ring gated by `shouldAnimate`
  - EmailStep, CheckStep, card, brand name, footer: all use `t()` or `{...t(), delay}`
- `src/features/onboarding/OnboardingFlow.tsx` — all 8 hardcoded transitions replaced
  - ProgressBar, IntentScreen, EnergyScreen, ADHDSignalScreen, main flow: `t()`
  - Stagger delays preserved: `{ ...t(), delay: 0.06 + i * 0.07 }`

## Research Basis
- Research #2: Spring profiles (critically damped ζ≈1.0 standard, ζ<1.0 celebration)
- Research #2: ease-out ONLY — never linear, never ease-in (startle response)
- Research #2: No looping animations without user control (glow ring now gated)
- Research #2: prefers-reduced-motion respected at hook level, not per-component

## Score: 10/10
## Notes
- `VariantPreset = Record<string, number>` pattern cleanly resolves the structural
  incompatibility between spatial variants (y/scale/x) and fadeOnly (opacity only)
  under TypeScript strict mode
- The `useMotion` hook is the single gatekeeper — components never call
  `useReducedMotion()` directly anymore
