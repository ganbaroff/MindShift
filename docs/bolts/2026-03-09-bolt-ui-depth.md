# Bolt: Visual Polish — Premium Dark Mode Overhaul

**Date:** 2026-03-09
**Type:** UI/UX polish
**Scope:** Global — all screens

---

## Problem

App looked like a wireframe prototype with 92+ visible `#2D3150` borders on every card and panel. Only 2 surface levels (bg + surface) created a flat, unpolished aesthetic. User feedback: "looks terrible."

**Root causes:**
1. **92 visible borders** (`1.5px solid #2D3150`) on every card
2. **Flat surface hierarchy** — only 2 levels (bg + surface)
3. **Cramped spacing** — `gap-3` (12px), `p-4` (16px)
4. **No depth cues** — dark mode needs surface elevation, not borders

## Solution

**Strategy: "Remove Borders, Add Depth"** — inspired by Spotify, Tiimo, Finch, Bearable.

### New Surface Elevation System (Spotify-style)

| Level | Old | New | Role |
|-------|-----|-----|------|
| L0 bg | `#0F1117` | `#0F1117` | Page background (unchanged) |
| L1 surface | `#1A1D2E` | `#171A2B` | Nav bar, bottom sheet bg |
| L2 card | — | `#1E2136` | **NEW: Main cards, panels** |
| L3 elevated | `#252840` | `#252840` | Inputs, chips, progress tracks |

### Border Rules

| Element | Old | New |
|---------|-----|-----|
| Static cards | `1.5px solid #2D3150` | `1px solid rgba(255,255,255,0.06)` |
| Interactive (inactive) | `1.5px solid #2D3150` | `1px solid rgba(255,255,255,0.06)` |
| Interactive (active) | `1.5px solid #7B72FF` | `1.5px solid #7B72FF` (kept) |
| Dashed empty states | `1.5px dashed #2D3150` | `1px dashed rgba(255,255,255,0.08)` |

### Spacing Improvements

- BentoGrid cards gap: `gap-3` (12px) -> `gap-4` (16px)
- Widget padding: `p-4` (16px) -> `p-5` (20px)

## Files Changed

| File | Changes |
|------|---------|
| `src/index.css` | New `--color-surface: #171A2B`, `--color-card: #1E2136`, updated `.glass` border |
| `src/features/home/BentoGrid.tsx` | Card bg, border, gap-4, p-5, arrange button |
| `src/features/home/HomeScreen.tsx` | Card bg, border softening |
| `src/features/home/widgets/*.tsx` | Energy number color, progress bar track, audio presets |
| `src/features/focus/FocusScreen.tsx` | 7 interactive borders, chip bg, button bg |
| `src/features/focus/ArcTimer.tsx` | Idle color, track stroke |
| `src/features/audio/AudioScreen.tsx` | Preset borders, volume slider track |
| `src/features/progress/ProgressScreen.tsx` | Stats cards, achievement borders, chart card |
| `src/features/settings/SettingsScreen.tsx` | All section cards, mode selectors, toggle switch |
| `src/features/tasks/AddTaskModal.tsx` | Modal handle, input borders, difficulty buttons, submit |
| `src/features/tasks/TaskCard.tsx` | Card border, difficulty dots, complete button |
| `src/features/tasks/RecoveryProtocol.tsx` | Micro-win borders, submit button |
| `src/features/onboarding/OnboardingFlow.tsx` | Progress bar track, mode option borders |
| `src/app/BottomNav.tsx` | Nav surface color |
| `src/shared/ui/InstallBanner.tsx` | Gradient, inline code chips |
| `src/features/tasks/ContextRestore.tsx` | Border softening |
| `src/shared/ui/CookieBanner.tsx` | Border softening |
| `src/shared/ui/ErrorBoundary.tsx` | Border softening |
| `src/features/home/EnergyCheckin.tsx` | Border softening |

## Verification

- `npm run build` — 0 errors
- `npx vitest run` — 78/78 tests pass
- Visual: All 5 screens verified via preview screenshots
- Active/selected states (`#7B72FF`) still clearly distinguishable
- No WCAG contrast regressions

## Not Changed

- Active/selected borders (`#7B72FF`) — interactive feedback, stays
- CTA buttons — gradient/solid primary, stays
- Mascot SVG fills — decorative, stays
- `--color-border: #2D3150` token in CSS — kept as reference
