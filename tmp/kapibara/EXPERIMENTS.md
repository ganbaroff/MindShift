# EXPERIMENTS — the feedback→decision log

This file is where numbers become DECISIONS. metrics.mjs / weekly_report.mjs produce
the numbers; nothing here is real until an experiment has a written **verdict**.

> **Protocol (binding, 3 lines):**
> 1. Every experiment = **hypothesis → metric → deadline → verdict**. A run with no written verdict is not finished.
> 2. **ONE active (RUNNING) experiment per platform, max** — no parallel A/Bs on the same channel (they confound each other).
> 3. **A new experiment cannot start until the previous one on that platform has a verdict** — no zombie experiments.

Columns: `ID` · `Started` · `Platform` · `Hypothesis` · `Metric` · `Verdict due` · `Status` · `Verdict`.
`Status` ∈ {RUNNING, CLOSED}. weekly_report.mjs reads this file, surfaces every RUNNING row, and
shouts when a verdict is due on or before the report's Sunday.

| ID | Started | Platform | Hypothesis | Metric | Verdict due | Status | Verdict |
|----|---------|----------|------------|--------|-------------|--------|---------|
| EXP-001 | 2026-07-06 | IG+TT (Saudi) | EN voice + day-parity subs A/B: even UTC day = EN subs, odd UTC day = Arabic subs, targeting the Saudi market | views+reach per variant after 7 days, from Buffer metrics | 2026-07-14 | RUNNING | — |
| EXP-000 | 2026-07-01 | conveyor (all) | RU→EN conveyor pivot: switch the whole content conveyor from Russian to English | views/results per language | 2026-07-07 | CLOSED | RU показал ~0 результатов (CEO 2026-07-07), switched to EN |
