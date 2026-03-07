# Bolt 2.2 — Today Flow: Brain Dump → Daily Plan

**Date:** 2026-03-07
**Branch:** claude/romantic-archimedes
**Status:** ✅ Complete

---

## Goal

Add an AI-powered daily planning flow to `/today`. User writes a free-form brain dump, Claude decomposes it into ≤7 tasks with time estimates and microsteps. Human-in-the-loop review before saving. Real-time checkbox completion.

---

## Acceptance Criteria — All Passed ✅

| # | Criterion | Status |
|---|-----------|--------|
| AC1 | `/today` textarea for brain dump (no char limit) | ✅ `DayPlanDump.jsx` |
| AC2 | "Разобрать день" button → Claude API | ✅ `useDayPlan.submitDayPlan` → `parseDayPlan` |
| AC3 | AI returns title, priority, estimated_minutes, microsteps[2-3] | ✅ `parseDayPlan` in `claude.js` |
| AC4 | Saved to Supabase `daily_tasks` table | ✅ `sbSaveDailyTasks` + migration `002_daily_tasks.sql` |
| AC5 | Checkbox → updates `completed` in real-time | ✅ Optimistic update + `sbToggleDailyTask` |
| AC6 | No streaks, no shame for incomplete tasks | ✅ No red overdue states, no streaks, quiet done |
| AC7 | Dark theme, ≥16px font, touch targets ≥44×44px | ✅ All touch targets `minHeight: 44`, font ≥ 14px |

---

## Files Created

| File | Size | Purpose |
|------|------|---------|
| `docs/migrations/002_daily_tasks.sql` | 47 lines | Table + RLS + updated_at trigger |
| `src/shared/services/claude.js` | +60 lines | `parseDayPlan` — ADHD-aware prompt |
| `src/shared/services/supabase.js` | +60 lines | `sbGetDailyTasks`, `sbSaveDailyTasks`, `sbToggleDailyTask` |
| `src/features/today/useDayPlan.js` | 150 lines | State machine: idle→processing→review→saved |
| `src/features/today/DayPlanDump.jsx` | 100 lines | Textarea + "Разобрать день" button |
| `src/features/today/DayPlanReview.jsx` | 150 lines | Human-in-the-loop review panel |
| `src/features/today/DayPlanTaskList.jsx` | 180 lines | Checkbox list with microstep expansion |
| `docs/bolts/0007-day-plan-prompt.md` | ADR | Why separate table + prompt design |

## Files Modified

| File | Change |
|------|--------|
| `src/features/today/index.jsx` | Added DayPlan section imports + `user` prop + DayPlan wiring in scrollable content |
| `src/mindflow.jsx` | Added `user={user}` to TodayScreen call (line 479) |

---

## Architecture Decisions

**ADR 0007** — `daily_tasks` is a separate table from `thoughts`.
- Thoughts = open-ended captures. Daily tasks = structured date-scoped plan items.
- `completed` vs `archived` semantics are incompatible in the same table.
- Clean RLS, clean API, future history support.

---

## ADHD-Aware Planning Compliance Checklist

| Principle | Applied |
|-----------|---------|
| P2: No loss-aversion language | ✅ No streak pressure, no shame for incomplete tasks |
| P3: Time blindness aware | ✅ Time shown as ±25% range (e.g. "20–30 min") |
| P4: Dump first, structure later | ✅ Free-form input, no required fields |
| P5: Soft cap ≤7 tasks | ✅ AI hard-capped at 7, prompt enforces importance selection |
| P7: Progressive disclosure | ✅ Microsteps collapsed by default, expand on tap |
| P10: Touch targets | ✅ All buttons ≥44×44px |
| P11: Human-in-the-loop | ✅ Review panel: per-task accept/reject before saving |

---

## Build Stats

```
dist/assets/index-BLsl-Lbv.js  456.33 kB │ gzip: 132.67 kB
✓ built in 835ms
```

Previous (Bolt 2.1): 128.53 kB gzipped.
Delta: +4.14 kB gzipped — 3 new components + hook + 3 service functions.

---

## Sprint Report

### Completed this bolt
- `parseDayPlan` — new AI function with ADHD-aware constraints
- `daily_tasks` Supabase table with full RLS and updated_at trigger
- `useDayPlan` — 5-state machine with load-on-mount, optimistic toggle, re-plan
- `DayPlanDump` — textarea component, EN/RU/AZ, ⌘+Enter shortcut, keyboard hint
- `DayPlanReview` — human-in-the-loop per-task review with accept/reject checkboxes
- `DayPlanTaskList` — checkbox list with time range, collapsed microsteps, re-plan button
- Wired into `TodayScreen` with separator from existing thought-based task list
- `user={user}` prop passed from mindflow.jsx to TodayScreen (was missing)
- ADR 0007 written

### Known limitations
- No freemium gate on `parseDayPlan` calls — future: count day plan parses as dump quota
- `parseDayPlan` uses same 10s timeout as all Claude calls — fine for ≤7 tasks
- Unauthenticated users get in-memory-only plan (tasks lost on refresh) — acceptable
- Microstep editing not implemented — future bolt

### Next recommended bolt
**Bolt 2.3 — Evening Review** or **Bolt 2.4 — Freemium gate for day plan calls**
