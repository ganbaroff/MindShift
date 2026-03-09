# Bolt 6.6 — TaskCard + RecoveryProtocol Polish

## Goal
Add micro-interactions to TaskCard (complete slide-out, amber carry-over).
Make RecoveryProtocol feel warmer with Avatar presence and improved gradient.

## Acceptance Criteria
- [x] AC1: TaskCard migrated from useReducedMotion → useMotion() (centralized)
- [x] AC2: Complete animation: slide-left + fade-out (250ms spring)
- [x] AC3: Carry-over badge: warm amber (#FFE66D) glow instead of gray
- [x] AC4: All whileTap gated by shouldAnimate
- [x] AC5: RecoveryProtocol: SVG Avatar replaces 🌱 emoji (size 80px)
- [x] AC6: RecoveryProtocol: warmer gradient (deep blue → warm purple)
- [x] AC7: RecoveryProtocol: all transitions use centralized t()

## Changes
- `src/features/tasks/TaskCard.tsx` — useMotion(), slide-out x:-40, amber badge
- `src/features/tasks/RecoveryProtocol.tsx` — Avatar import, useMotion(), warm gradient

## Score: 8/10
## Notes
- Carry-over badge now warm amber (#FFE66D) — consistent with "gentle reminder" not punishment
- Recovery gradient: deep blue → warm purple with teal accent = "safe space" feeling
- Avatar in recovery shows current level — plant is always waiting happily (ADR: never regresses)
