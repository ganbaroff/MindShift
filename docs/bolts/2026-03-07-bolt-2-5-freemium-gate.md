# Bolt 2.5 — Freemium Gate

**Date:** 2026-03-07
**Branch:** claude/romantic-archimedes
**Build:** ✅ 0 errors · 137.18 kB gzip (↑ ~1 kB from 2.4)

---

## Goal

Limit free-tier AI calls for `parseDayPlan` (3/day) and `generateEveningReview` (1/day)
without aggressive upsell mechanics, shame-loops, or countdown timers.
Pro users (`user_profiles.is_pro = true`) bypass all limits.

---

## Acceptance Criteria

| # | Criterion | Status |
|---|-----------|--------|
| AC1 | `usage_limits` table with RLS — one row per (user, date) | ✅ |
| AC2 | Free limits: 3 parseDayPlan/day, 1 generateEveningReview/day | ✅ |
| AC3 | Soft inline banner, not modal, not blocking (ADHD P7) | ✅ |
| AC4 | Counter incremented BEFORE Claude API call (race-condition protection) | ✅ |
| AC5 | `useUsageLimits` hook — `canUseDayPlan`, `canUseEveningReview`, `dayPlanLeft`, `checkAndIncrement` | ✅ |
| AC6 | `user_profiles` table — `is_pro` bool, Pro bypasses all limits | ✅ |
| AC7 | No countdown timers, no aggressive upsell (ADHD P12) | ✅ |
| AC8 | Limits reset at UTC midnight (date-based, not rolling 24h) | ✅ |
| AC9 | ADR 0009 documenting rationale | ✅ |

---

## Files Created

| File | Purpose |
|------|---------|
| `docs/migrations/004_usage_limits.sql` | `usage_limits` + `user_profiles` tables with RLS |
| `src/shared/hooks/useUsageLimits.js` | Cross-cutting hook: limits state + `checkAndIncrement` |
| `docs/bolts/0009-freemium-limits-adr.md` | ADR: why 3/1, date-based reset, fail-open |
| `docs/bolts/2026-03-07-bolt-2-5-freemium-gate.md` | This file |

---

## Files Modified

| File | Change |
|------|--------|
| `src/shared/services/supabase.js` | Section 8: `sbGetUsage`, `sbCheckAndIncrementUsage`, `sbGetUserProfile` |
| `src/features/today/useDayPlan.js` | Accepts `checkAndIncrement` opt; `limitMsg` state; check in `submitDayPlan` |
| `src/features/today/DayPlanDump.jsx` | `limitMsg` prop; soft banner; button disabled when limited |
| `src/features/today/index.jsx` | Imports `useUsageLimits`; wires `checkAndIncrement` + `limitMsg` |
| `src/features/evening/index.jsx` | Imports `useUsageLimits`; check in `handleGenerate`; soft banner |

---

## Architecture Notes

- `useUsageLimits` placed in `shared/hooks/` (cross-cutting — used by both today/ and evening/)
- Features do NOT import each other — correct vertical slice discipline maintained
- `checkAndIncrement` is fail-open: infra errors never block the user (INVARIANT 7)
- Banner uses `C.surfaceHi` + `C.textSub` — neutral tones, no `C.high` (red) anywhere
- Button disabled via `isLimited` flag when `limitMsg` is set

---

## ADHD Design Compliance

| Principle | How met |
|-----------|---------|
| P1 — No shame | Neutral banner text ("Available again tomorrow"), no red, no ❌ |
| P7 — No dark patterns | Inline banner, never modal, never full-screen gate |
| P9 — Ethical monetisation | Limit is honest, message is clear, no bait-and-switch |
| P12 — No countdown timers | Date-based reset described in human terms ("tomorrow") |

---

## Build Stats

```
dist/assets/index-COErKp3V.js  470.57 kB │ gzip: 137.18 kB
Built in 877ms — 0 errors, 0 warnings
```
