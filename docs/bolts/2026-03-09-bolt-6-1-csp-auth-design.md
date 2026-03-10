# Bolt 6.1 — CSP Fix + Auth & Onboarding Redesign

## Goal
Fix Service Worker CSP error (fonts.gstatic.com blocked in connect-src), redesign
AuthScreen with glassmorphism polish and smoother UX, improve OnboardingFlow with
segmented progress bar, directional transitions, and interactive card glow.

## Acceptance Criteria
- [x] AC1: No CSP errors for fonts.gstatic.com in Service Worker
- [x] AC2: AuthScreen — glassmorphism card, animated logo, gradient CTA button
- [x] AC3: AuthScreen — animated checkbox, focus-glow on email input
- [x] AC4: AuthScreen — "Check email" state with animated CheckCircle2
- [x] AC5: OnboardingFlow — segmented progress bar with % complete label
- [x] AC6: OnboardingFlow — directional slide transitions (forward/back)
- [x] AC7: OnboardingFlow — card hover glow matching each mode's accent colour
- [x] AC8: OnboardingFlow — Back button on steps 2 and 3
- [x] AC9: `npm run build` — 0 TypeScript errors, 0 lint errors

## Root Cause (CSP error)
Service Worker (Workbox) uses `fetch()` to cache Google Fonts woff2 files.
`fetch()` in SW context is subject to `connect-src`, not `font-src`.
`fonts.gstatic.com` was in `font-src` but missing from `connect-src`.
Fix: added `https://fonts.gstatic.com` and `https://fonts.googleapis.com` to
`connect-src` in `vercel.json`.
Also replaced `https://api.anthropic.com` with `https://generativelanguage.googleapis.com`
(Gemini migration from Bolt 5.x).

## Changes
- `vercel.json` — `connect-src` now includes `https://fonts.gstatic.com`,
  `https://fonts.googleapis.com`, `https://generativelanguage.googleapis.com`
- `src/features/auth/AuthScreen.tsx` — full redesign: MochiLogo SVG, BgOrbs,
  glassmorphism card, animated checkbox, gradient CTA, CheckStep with
  CheckCircle2 animation, footer privacy link
- `src/features/onboarding/OnboardingFlow.tsx` — ProgressBar component
  (segmented + %), directional AnimatePresence, card hover glow with per-mode
  accent colours, Back button on steps 2+3, EnergyScreen wrapper

## Score: 9/10
## Notes
- Plausible blocked by ad blocker: expected, not our error
- Perplexity font CSP: browser extension conflict, not our app
- Research #1 received (attention residue / micro-interaction timing) —
  will implement in Bolt 6.2 (interaction timing audit)
