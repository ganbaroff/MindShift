# ADR 0007 — Day Plan AI Prompt & daily_tasks Separation

**Date:** 2026-03-07
**Status:** Accepted
**Bolt:** 2.2

---

## Context

Bolt 2.2 adds an AI-powered daily planner to `/today`. The AI takes a free-form brain dump and returns a focused list of tasks (≤7) with time estimates and microsteps.

Two architectural decisions were needed:

1. **Should daily plan tasks live in the existing `thoughts` table or a new table?**
2. **What prompt constraints ensure ADHD-safe, actionable output?**

---

## Decision 1 — Separate `daily_tasks` Table

**Rejected:** Reuse `thoughts` table with a `daily_plan: true` flag.

**Accepted:** New `daily_tasks` table with schema:
```
id, user_id, date (text 'YYYY-MM-DD'), title, priority, estimated_minutes, microsteps (jsonb), completed, created_at, updated_at
```

**Reasons:**
- Thoughts are open-ended captures; daily tasks are structured, date-scoped plan items.
- `thoughts` has no `completed` concept (it uses `archived` + `isToday`). Merging these would create a confusing dual-meaning for `archived`.
- Daily tasks need a `date` key (text, local timezone) for multi-day history. Adding this to `thoughts` would require a schema migration and audit of all existing queries.
- Separation gives clean RLS policies and a clean API (`sbGetDailyTasks`, `sbSaveDailyTasks`, `sbToggleDailyTask`).
- Future: daily task history, streaks-free analytics, evening review can join on `date`.

---

## Decision 2 — Prompt Design for `parseDayPlan`

**Constraint:** Output array, not object with `{ items, response }` (unlike `parseDump`).

**Reasoning:** Day planning doesn't need an AI "response" sentence. The UI confirms tasks visually. A plain array is simpler to parse and less likely to fail.

**Max 7 tasks rule** — adhd-aware-planning Principle 5 (soft cap). The AI is explicitly instructed to pick the most important if more are provided. Users with ADHD are protected from an overwhelming list.

**Time estimates with ADHD tax** — AI instructions include: *"estimated_minutes must be realistic — account for context-switching and ADHD tax."* The UI then displays a ±25% range (rounded to 5 min) to reduce time-blindness anxiety.

**Microsteps[0] = step_one** — The first microstep is always the most concrete immediately-doable action. This follows adhd-aware-planning Principle 4 (first step is always visible).

**Graceful empty return** — If no tasks are found, `parseDayPlan` returns `[]`. The UI shows a helpful "write more detail" message. No crash, no shame.

**No shame language rule** in prompt: *"Never use shame, guilt, or 'you should' language in any field."*

---

## Consequences

- `sbSaveDailyTasks` deletes existing tasks for the date before inserting (re-planning scenario). This is intentional — one plan per day, easily replaced.
- Unauthenticated users get a local-only plan (no Supabase persistence). Tasks are stored in React state with `id: "local-N"`. Toggle calls skip Supabase.
- The `set_updated_at()` Postgres function may already exist (from `001_dumps_tasks.sql`). Migration uses `CREATE OR REPLACE` to be idempotent.
- `callClaude` max_tokens = 1000 (existing default). For 7 tasks × ~70 tokens each = ~490 tokens + prompt overhead ≈ ~800 total. Sufficient.

---

## Alternatives Considered

| Option | Rejected Because |
|--------|-----------------|
| Reuse `thoughts` table | Schema mismatch, `completed` vs `archived` confusion |
| Single-string microsteps | Harder to render as steps; JSONB gives ordered list |
| LLM picks priority automatically | Kept — ADHD users benefit from AI prioritisation as a starting point; human-in-the-loop review allows overrides |
| Streaming response | Complexity not justified; 10s timeout is sufficient for ≤7 tasks |
