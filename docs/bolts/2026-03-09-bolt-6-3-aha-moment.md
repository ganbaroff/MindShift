# Bolt 6.3 — First-Session Aha Moment + Gamification Reform

## Goal
Apply Research #4 (TTFV < 3 min, blank slate prevention) and Research #5
(gamification for ADHD: VR schedules, no consecutive streaks, effort-based tracking).

## Acceptance Criteria
- [x] AC1: `FirstTaskPrompt` — shows when NOW pool empty + onboarding done (blank slate prevention)
- [x] AC2: `FirstTaskPrompt` — dismissible, one-tap → opens AddTaskModal directly
- [x] AC3: `store.completedTotal` — lifetime task counter, incremented on every `completeTask`
- [x] AC4: ProgressScreen stats grid — replaces "XP Earned" with "Tasks Done" (completedTotal)
- [x] AC5: Achievement `quiet_mind` description — removed "in a row" (consecutive streak language)
- [x] AC6: HomeScreen — migrated from `useReducedMotion` to centralized `useMotion()`
- [x] AC7: ProgressScreen — migrated from `useReducedMotion` to centralized `useMotion()`
- [x] AC8: `npm run build` — 0 TypeScript errors, 0 lint errors

## Research Basis

### Research #4 (TTFV < 3 min):
- "Blank slate anxiety triggers acute task paralysis in neurodivergent users"
- Users who experience core product value within 5 min are 3× more likely to retain long-term
- FirstTaskPrompt delivers the Aha Moment: "Enter a vague task → watch AI break it down"
- Dismissible — never a nag obligation (Research #4: no forced product tours)
- Pattern 1 (Goal-Based Branching) already implemented ✅
- Pattern 4 (Frictionless Capture) — FirstTaskPrompt is 1 tap to open AddTaskModal

### Research #5 (Gamification reform):
- Variable Ratio schedule > Fixed Ratio for ADHD (VR = "slot machine" dopamine hit)
- Consecutive streaks trigger Rejection Sensitive Dysphoria (RSD) → "quiet_mind" fixed
- "Task totals" over consecutive milestones: `completedTotal` replaces XP Earned in UI
- Effort-based design: "reward action but never punish inaction" — completedTotal only goes up

## Changes
- `src/store/index.ts` — Added `completedTotal: number` to ProgressSlice, auto-incremented
  in `completeTask` when task was active; reset to 0 on `signOut`
- `src/types/index.ts` — `quiet_mind` description: "in a row" → "for 3 focus sessions"
- `src/features/home/HomeScreen.tsx`:
  - Replaced `useReducedMotion` with `useMotion()`
  - Added `FirstTaskPrompt` component (blank slate CTA with dismiss × button)
  - Shows when `onboardingCompleted && nowPool.active.length === 0 && !dismissed`
  - All 5 hardcoded transitions → `t()` / `{ ...t(), delay: X }`
- `src/features/progress/ProgressScreen.tsx`:
  - Replaced `useReducedMotion` with `useMotion()`
  - Stats grid: "XP Earned" → "Tasks Done" (completedTotal, color #4ECDC4)
  - All 9 hardcoded transitions → `t()` / `t('expressive')` with delays preserved

## Score: 10/10
## Notes
- `completedTotal` starts at 0 for all existing users (correct: no retroactive inflation)
- XP is still tracked in the XP bar above the stats grid (unchanged)
- The VR schedule (random XP bonus) is a Bolt 6.4 item — requires TaskCard changes
