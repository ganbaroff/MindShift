---
name: spec
description: Mini-spec gate before non-trivial work. Write a 6-element ≤15-line spec into the backlog item BEFORE starting any task > ~30 min or anything touching the live content pipeline. Invoke on /spec, "спека", "spec this", or before opening a batch/sprint. Reversible small fixes are exempt.
---

# spec — pin the variables before you build

## Why this exists
Every run diverged because no spec pinned the variables (CEO 2026-07-04: «нет законов, рамок»). A spec is not a plan doc to admire — it is the frame the work is checked against. No spec, no start.

## When it's REQUIRED
- Any task estimated > ~30 min of real work, OR
- Anything touching the live pipeline (`make-clip.mjs`, `kapibara-daily.yml`, gen_voice/render, publisher, edge functions in prod).

## When it's EXEMPT
- Small, reversible fixes (typo, copy tweak, one-line bug, a test). Just do them — a spec here is overhead.

## The template (6 elements, ≤15 lines TOTAL — paste into the backlog item)
```
SPEC <short-name> — <date>
1. Outcome:    <1 line — the real thing that will be true when done>
2. Scope:      IN: <a,b>  OUT: <c,d — explicitly not this>
3. Constraints: <prior decisions + link: Factory Law §N / backlog #N / Constitution law>
4. Steps:      1) … 2) … 3) …            (3–7, each shippable + checkable)
5. DoD:        - WHEN <x> the system SHALL <y>   (3–5 MEASURABLE criteria, EARS where it fits)
               - <metric with a number, e.g. tsc -b exit 0 / 135 wpm / critic ship_ready:true>
6. Rollback:   <1 line — how to undo if it goes wrong (git revert <sha> / disable flag / prior asset)>
```

## Rules
- The spec pastes **INTO** the `memory/marketing-backlog.md` item (or the wip file). Work starts only AFTER the spec exists — spec first, code second.
- DoD criteria must be MEASURABLE: a number, an exit code, a gate verdict — never "looks good". Prefer EARS `WHEN X the system SHALL Y` for behavior, a bare metric for build/quality gates.
- Constraints must LINK the prior decision (Factory Law line, backlog #, Constitution law), not re-argue it.
- One spec ≤ 15 lines. If it needs more, the task is too big — split it into two backlog items, each with its own spec.

## Anti-patterns
- A second plan doc instead of the action. → spec is 15 lines, then build.
- DoD = "it works". → give a number / exit code / gate.
- Skipping Scope OUT. → naming what you will NOT do prevents scope creep.
- Spec-ing a one-line reversible fix. → exempt, just ship it.
