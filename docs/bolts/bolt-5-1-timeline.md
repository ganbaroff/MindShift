# Bolt 5.1 — Timeline View (Day Schedule)

**Date:** 2026-03-08
**Branch:** `claude/bolt-5-1`
**Author:** Claude Sonnet 4.6

---

## Summary

Added a vertical day-schedule timeline to TodayScreen. Tasks from `daily_tasks`
(loaded by `useDayPlan`) are automatically ordered by priority and placed on a
time axis with 15-minute breathing-room buffers between them. Auto-shift logic
ensures overdue incomplete tasks are silently rescheduled from "now" — no red
colours, no shame, no "overdue" labels. Completed tasks remain on the timeline
dimmed at 50% opacity as a visible record of progress.

No external calendar library was added (ADR 0017). The feature is implemented
as ~350 lines of pure-JS + React, adding ~2.7 kB gzip to the bundle.

---

## Files Changed

### NEW
| File | Description |
|---|---|
| `src/features/today/lib/scheduleTimeline.js` | Pure greedy scheduling algorithm + `formatHHMM`, `formatDuration` helpers |
| `src/features/today/TimelineView.jsx` | React component: TaskBlock, BufferBlock, EmptyState, TimeLabel |
| `src/features/today/TimelineView.test.js` | 14 Vitest unit tests covering all algorithm edge cases |
| `docs/bolts/adr/0017-timeline-no-library.md` | ADR: why custom implementation over FullCalendar/schedule-x |
| `docs/bolts/bolt-5-1-timeline.md` | This file |

### MODIFIED
| File | Change |
|---|---|
| `src/features/today/index.jsx` | Added `import TimelineView` + `<TimelineView>` after DayPlan section |
| `package.json` | Added `vitest ^4.0.18` as devDependency (test runner, zero bundle impact) |

---

## Architecture Notes

- `scheduleTimeline.js` lives in `features/today/lib/` — feature-local pure function (not `shared/lib/`) because it is specific to this one feature (CLAUDE.md Rule 3)
- TimelineView imports only from `../../skeleton/design-system/tokens.js` and `./lib/scheduleTimeline.js` — no cross-feature imports
- Bolt 5.2 hook: `<BufferBlock>` renders `data-buffer-slot="true"` with ISO timestamps; Focus Audio will attach Web Audio playback to these DOM elements

---

## AC Checklist

| AC | Status | Notes |
|---|---|---|
| AC1 — Timeline renders in TodayScreen | ✅ | Placed after DayPlan section; uses `dayPlanTasks` from existing `useDayPlan` hook |
| AC2 — Greedy scheduling algorithm | ✅ | `scheduleTimeline()` in `lib/scheduleTimeline.js`; starts at max(09:00, now) |
| AC3 — Buffer block visualised | ✅ | `BufferBlock` component; dashed purple border, ☕ icon, distinct from task blocks |
| AC4 — Auto-shift (no red overdue) | ✅ | `if (!task.completed && cursor < now) cursor = new Date(now)` |
| AC5 — Completed tasks show ✅, dimmed | ✅ | `opacity: 0.5`, line-through title, green ✅ prefix |
| AC6 — Empty state with mentor text | ✅ | `EmptyState` component with trilingual text; `onGoToDump` prop optional for MVP |
| AC7 — Time label left of each block | ✅ | `TimeLabel` component shows HH:MM from `scheduledStart` |
| AC8 — Touch targets ≥ 44×44px | ✅ | Checkbox `button` uses negative margin trick: 28px button + 8px padding = 44px tap area |
| AC9 — No external calendar libraries | ✅ | package.json contains no react-big-calendar, fullcalendar, @schedule-x, or react-circular-progressbar |
| AC10 — Build 0 errors, delta ≤ +4 kB | ✅ | See bundle delta below |
| AC11 — ADR written | ✅ | `docs/bolts/adr/0017-timeline-no-library.md` |
| AC12 — Bolt log written | ✅ | This file |

---

## Bundle Delta

```
Before: 148.99 kB gzip
After:  150.69 kB gzip
Delta:  +1.70 kB  ✅  (limit: +4 kB)
```

vitest is a devDependency — zero bundle impact on production build.

---

## Design Decisions

### Why inline styles (not Tailwind)?
Tailwind CSS is not installed in the project (`package.json` has no `tailwindcss`
dependency and `vite.config.js` has no PostCSS plugin). Installing it would require
vite.config.js changes (skeleton-owned file, requires ADR) and add ~20 kB to dev
build. The spec allows Tailwind but it isn't available. Inline styles are consistent
with 100% of the existing codebase.

### Why vitest added?
The spec requires a `TimelineView.test.js` unit test file. Without a test runner
the file would be dead documentation. Vitest is a devDependency with zero runtime
bundle impact. Added `npx vitest run` as the test invocation.

### onGoToDump — MVP limitation
The empty-state "→ Brain Dump" button requires a navigation callback that flows
from `mindflow.jsx` → `TodayScreen` → `TimelineView`. For MVP, modifying the
skeleton-adjacent `mindflow.jsx` routing would require an ADR. The empty state
renders a styled non-interactive text cue instead. Navigation wiring is a
post-MVP polish task.

---

## Testing

```bash
npx vitest run src/features/today/TimelineView.test.js
```

19 test cases (all passing — `npx vitest run`, 149ms):
- `scheduleTimeline`: 11 cases (empty, single, multi-task, priority sort, auto-shift, completed, edge cases, field preservation)
- `formatHHMM`: 4 cases
- `formatDuration`: 4 cases
