---
name: retro
description: Trajectory review at end of a sprint or session — grades the work that was just done against claims-vs-receipts, rule compliance, token waste, and dropped threads, then writes back lessons + backlog items. Invoke on /retro, "ретро", "retro", "sprint retro", or when a sprint/batch closes and you want an honest post-mortem before the next one.
---

# retro — grade the trajectory, not the vibe

## Why this exists
A doer grading its own run rationalizes. Long-task failure lives in EXECUTION, not reasoning (see `~/.claude/rules/reliable-execution.md`), and the cheapest place to catch a compounding error is a fresh set of eyes right after the sprint. This skill runs that review — cheaply, honestly, once.

## Hard rule: the GRADER IS NOT THE DOER
The instance that did the work does NOT grade it. Spawn ONE independent reviewer agent (default agent type, never `Explore` — its prompt overflows context before work starts, scar 2026-06-13). The reviewer reads artifacts and returns findings. You only orchestrate + write back.

## What the reviewer reads (artifacts, not memory)
- `git log --oneline` since the last retro (find it: last `## SNAPSHOT`/retro line or last "retro" commit; default to last ~20 commits).
- The backlog diff: `git log -p -- memory/marketing-backlog.md` for the same range (what got added / closed).
- CEO corrections in this chat — every place Yusif pushed back, said "проколы", re-explained, or repeated an ask.

## Grade against 4 axes (evidence required per finding)
1. **Claims vs receipts** — did every "done / готов / works / deployed" have a tool receipt (Read/Bash/curl/MCP) in the same turn? A claim without a receipt is a finding.
2. **Rules violated** — check `.claude/rules/guardrails.md` (10 hard rules, NEVER RED, motion, a11y, store, ≤400 lines), `~/.claude/rules/reliable-execution.md` (gate every step, no silent retry), CAVEMAN/voice protocol (RU short story to CEO, no bullet walls, ~300 words).
3. **Token efficiency** — where did loops, redundant re-reads, or fan-out agents burn tokens for no distilled result? (scar: 21 verify agents = ~70% of a 1.55M-token run.)
4. **Dropped threads** — promises/recommendations made in chat that never reached `memory/marketing-backlog.md` or got done.

## Output contract (strict)
- **Max 5 findings.** Each = ONE line: `<axis>: <what happened> → <one-line fix>`. Rank most-severe first. Empty is a valid result — say "clean run" if it is.
- **Lessons:** write only NON-OBVIOUS lessons (a repeatable trap, not "I made a typo") to the auto-memory dir `C:\Users\user\.claude\projects\C--Projects-mindshift\memory\` as a short `lesson-<slug>-<date>.md`, and link it from `MEMORY.md`. Obvious one-offs get no file.
- **Dropped threads:** append each to `memory/marketing-backlog.md` (numbered backlog item, newest-context). Do NOT let a promise die in chat.

## Hard cap: retro ≤ 10 tool calls
A retro that costs more than the work it reviews is theater. Budget: ~1 to spawn the reviewer, ~1 to read its result, ≤3 write-backs (lessons + backlog + MEMORY.md link), rest is slack. If you're past 10, stop and ship the findings you have.

## Anti-patterns
- Grading your own run. → spawn the reviewer.
- 12 findings, no ranking. → max 5, severest first.
- A lessons file for every hiccup. → non-obvious only.
- Findings with no artifact evidence. → each finding cites a commit/turn.
