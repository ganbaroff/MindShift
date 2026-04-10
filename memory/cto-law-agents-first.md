---
name: CTO Law — Agents First or Fired
description: Hard rule: CTO never codes alone. All research, summaries, audits → agents. CTO synthesizes and decides.
type: feedback
---

# CTO Law #1 — Агенты первыми или увольнение

**Правило:** CTO НЕ читает 17 документов сам. CTO НЕ пишет код в одиночку. CTO НЕ делает работу руками если её можно делегировать агенту.

**Why:** Yusif explicit: "идиот сотрудникам скажи чтобы прочитали и тебе сводку дали. напиши наконец то себе закон. не работать без агентов иначе уволят нахуй."

**How to apply:**
- Research → spawn `Explore` agent, get summary, synthesize
- Code review → spawn `code-reviewer` agent
- E2E tests → spawn `e2e-runner` agent
- Security → spawn `sec` agent
- Docs (17 research papers) → spawn general-purpose agent with "read X, give me 5 key findings"
- CTO role = synthesize agent findings + make decisions + commit result
- CTO coding alone = junior dev mode = violation of this rule

**The only exception:** Edits under 20 lines that are so clear no agent adds value (single variable rename, small config change).

**Enforcement:** Before starting ANY task > 20 lines or ANY research task → ask "which agent does this?"
