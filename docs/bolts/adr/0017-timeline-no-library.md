# ADR 0017 — Custom Timeline View; No External Calendar Library

**Date:** 2026-03-08
**Status:** Accepted
**Bolt:** 5.1

---

## Context

MindFocus needs a visual day-schedule strip for the TodayScreen — a "Timeline View" that
renders today's `daily_tasks` as proportionally-sized blocks ordered by priority, with
15-minute buffer gaps between tasks.

Available options evaluated:

| Library | Bundle delta | Notes |
|---|---|---|
| `react-big-calendar` | +30–40 kB | Month/week views we don't need; requires Moment.js or date-fns |
| `FullCalendar` + React adapter | +40–60 kB | Enterprise features; advanced Timeline is commercial |
| `@schedule-x/react` | +15–25 kB | Temporal API requires polyfill; signals architecture mismatch |
| **Custom CSS + pure-JS algorithm** | **< 3 kB** | Exactly what we need, nothing more |

The app's current bundle is 148.99 kB gzip. AC10 mandates delta ≤ +4 kB. All three
library options would exceed this budget for a feature that only needs:
- One vertical column (no multi-day, no resource view)
- Today only (no month/week navigation)
- Proportional block heights based on `estimated_minutes`

---

## Decision

**Implement `scheduleTimeline()` as a pure-JS function (`src/features/today/lib/`)
and render the timeline with plain React + inline styles.**

No calendar library is added. The algorithm is ~90 lines. The React component is
~250 lines of JSX with inline styles — consistent with the existing codebase pattern.

---

## Algorithm — Greedy Scheduler (ADHD-aware)

```
1. Sort tasks: high → medium → low priority (stable sort preserves insertion order within bucket)
2. cursor = max(09:00 today, now)
3. For each task:
   a. if task.completed == false AND cursor < now → cursor = now  (auto-shift, no "overdue")
   b. place task block: [cursor, cursor + estimated_minutes]
   c. advance cursor to task end
   d. if not last task: insert 15-min buffer block, advance cursor
4. Return ScheduledItem[]
```

**Key ADHD properties:**
- **No red "overdue" state** — auto-shift silently moves late tasks forward
- **15-min buffers** — breathing room between tasks, not "lost time"
- **High priority first** — reduces decision paralysis ("what next?")
- **Completed tasks are dimmed, not removed** — visible progress anchors

---

## Consequences

### Positive
- Bundle delta: **+2.7 kB gzip** (well within +4 kB limit)
- Zero new runtime dependencies
- 100% offline-capable (no CDN assets)
- Full styling control — design tokens applied consistently
- Bolt 5.2 hook point: `data-buffer-slot="true"` on buffer blocks for Web Audio attachment
- Unit-tested via Vitest (14 test cases covering all algorithm edge cases)

### Trade-offs
- No drag-and-drop for MVP (acceptable — not in AC)
- No multi-day view (by design — ADHD planning horizon is today only)
- Tailwind CSS not used despite spec mention — not installed in the project.
  Inline styles used instead, consistent with the existing codebase.

### Limitations noted
- `onGoToDump` navigation callback in TimelineView's empty state requires
  mindflow.jsx to pass it through TodayScreen. For MVP this prop is omitted;
  the empty state shows a styled text cue instead of a live button.
  To be wired in a future polish bolt.

---

## Alternatives Rejected

- **`react-big-calendar`** — too heavy (+30–40 kB), wrong abstraction level
- **`FullCalendar`** — commercial license for resource timeline, excessive surface area
- **`@schedule-x/react`** — Temporal API polyfill overhead, introduces Preact Signals
  which conflicts with our React-only architecture guideline

---

## References

- AC9: no external calendar libraries in package.json
- AC10: delta ≤ +4 kB gzip
- Bolt 5.1 spec — greedy algorithm description
- External AI analysis (2026-03-08): confirms custom CSS + Web Audio API approach
  is optimal for ADHD PWA with strict bundle budget
