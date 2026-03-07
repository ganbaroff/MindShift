# Prompt Log

> Archive of prompts and patterns that worked well. Add entries when you discover something reusable.
> Format: date, agent, context, what worked and why.

---

## 2026-03-07 — Cowork (Claude) — Sprint 0 Handover

**Context:** New session, no prior code reading. Need to answer a 12-section handover questionnaire.

**Pattern that worked:**
> "Read the actual files before answering. Do not assume the stack matches the documentation."

**Why it worked:** CLAUDE.md said Gemini Flash, but `mindflow.jsx` called `api.anthropic.com`. Reading first prevented a completely wrong handover document. Always read `package.json` + first 100 lines + grep for env vars / API calls before any analysis task.

---

## 2026-03-07 — Cowork (Claude) — Architecture Analysis

**Context:** Identifying what's real vs what's planned in a 3000+ line monolith.

**Pattern that worked:**
> grep for section headers (`// ────`) + component function names to get a structural map fast, then read specific sections.

**Bash:**
```bash
grep -n "function.*Screen\|// ────\|export default" src/mindflow.jsx
```

---

## 2026-03-07 — Cowork (Claude) — Sprint 0 Execution

**Context:** Creating 4 files + 2 code fixes in a single sprint.

**Pattern that worked:** Do the bone-dry security fixes (hardcoded keys, missing headers) in the same sprint as the documentation sprint rather than scheduling them separately. Context is hot, cost is zero.

---

_Add new entries below this line as you discover good patterns._
