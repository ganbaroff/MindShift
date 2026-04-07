# Synthesis — 4 background audits + Sprint E2 verification
# Date: 2026-04-07
# Author: MindShift-Claude (worktree bold-jones)

## TL;DR for CEO

Four parallel audits ran. Three returned actionable data, one returned clarification.
Two competing claims between MindShift-Claude and VOLAURA-Claude were both found to be wrong.
The swarm IS running (despite VOLAURA-Claude claiming it never has). My 10 agents ARE invoked
(despite VOLAURA-Claude claiming they don't work).

The single highest-leverage shippable action is: **build private Claude Code Plugin Marketplace
at `volaura/claude-plugins`** with 8 working agents (drop the 2 dead ones). 2 hours of work,
zero ongoing maintenance, fixes the cross-product agent sharing problem permanently.

Sprint E2 is still blocked on CEO decision (B/C/D auth strategy).

---

## Audit 1 — MindShift agents real usage (telemetry, not opinions)

**Source of truth found**: `~/.claude/projects/{slug}/{session-uuid}/subagents/agent-*.meta.json`

Each spawn writes one JSON line with `agentType`. 438 telemetry files across 3 sessions.
99 custom-agent invocations confirmed (lower bound, older sessions rotated).

| Agent | Spawns | Verdict |
|-------|-------:|---------|
| growth | 24 | KEEP — best workhorse |
| code-reviewer | 22 | KEEP — needs expanded definition (currently 45 lines, no severity matrix) |
| a11y-scanner | 14 | KEEP |
| liveops | 10 | KEEP |
| sec | 9 | KEEP |
| e2e-runner | 7 | KEEP |
| infra | 6 | KEEP |
| guardrail-auditor | 5 | KEEP — best file quality, underused |
| build-error-resolver | 1 | DELETE — superseded by hooks.json tsc PostToolUse |
| bundle-analyzer | 1 | DELETE — superseded by CI 400 KB gate |

**Truth**: VOLAURA-Claude was wrong saying "MindShift agents don't work". They have 99 spawns.
**Truth**: I was wrong claiming "100% operational" without evidence. 8/10, not 10/10.

## Audit 2 — VOLAURA Python swarm runtime

**Claim under test**: VOLAURA-Claude breadcrumb said swarm has NEVER successfully run because
of `python-dotenv` import failure.

**Verdict: FALSE.**

Evidence:
- 5 successful CI runs in last 10 days (Mar 29, 30, 31, Apr 6 20:02, Apr 7 06:12)
- The 4 swarm bug fix commits I pushed yesterday (`96a7304`) actually fixed the issue
- Today's unattended cron at 06:12 UTC succeeded — pushed real artifacts to main as commit `1b536f0`
- python-dotenv IS installed in venv (`apps/api/.venv/Lib/site-packages/dotenv/`)
- python-dotenv IS imported at `autonomous_run.py:31` and 9 other places — all worked
- The VOLAURA-Claude breadcrumb confused "workflow failing for 6 days" with "never ran"

**Real failure causes** before my fixes (none were dotenv):
1. openai SDK missing from pip install (NVIDIA NIM fallback crashed)
2. asyncio.run() inside running loop in suggestion_engine
3. _judge_proposal got JSON array, expected object
4. Pulse emotional core: Proposal is Pydantic, used dict.get()

**Now**: swarm is operational. The LLM bridge works (NVIDIA NIM + Groq fallback). Today's
run loaded 530 files into code index, called 8 agents, posted to shared memory, ran consolidation,
sent 9 Telegram notifications, sent CEO Trend Scout summary.

## Audit 3 — Shared agent monorepo extraction pattern

**Question**: how to share `.claude/agents/*.md` across 5 products without copy-paste drift.

**Winner**: Private Claude Code Plugin Marketplace at `volaura/claude-plugins`

Why winner:
- Native Anthropic mechanism (same as `anthropics/claude-plugins-official`)
- 2 hours total setup, zero ongoing maintenance
- Cross-platform (Windows-friendly, no symlink issues)
- Survives Claude Code updates
- Auto-propagates on `git push`
- Private GitHub repo support added Feb 24 2026
- Versioning via git ref/sha/release channels

Losers:
- Git submodule: DEAD (Claude Code bug `anthropics/claude-code#7852` — Grep ignores submodules)
- Symlinks: Windows hostile, breaks CI
- NPM postinstall: VOLAURA is Python, mismatched
- MCP server: architectural mismatch (subagents are in-session, not external)
- Public marketplace: leaks IP

**Setup steps** (2 hours):
1. Create private GitHub repo `ganbaroff/volaura-claude-plugins`
2. Add `.claude-plugin/marketplace.json` schema
3. Create `plugins/volaura-core/` with 8 working agents (skip the 2 dead ones)
4. `claude plugin validate .` locally
5. `git push`
6. In each consumer repo (.claude/settings.json): add `extraKnownMarketplaces` + `enabledPlugins`
7. Delete duplicate agent files from individual repos

## Audit 4 — Sprint E2 contract verification

**Status**: Phase E2a contract verified. Bridge code ALREADY matches VOLAURA endpoint shape exactly.

**Blocker found**: Standalone MindShift JWT cannot validate against shared VOLAURA backend.
VOLAURA's `deps.py:124` calls `admin.auth.get_user(token)` which queries shared Supabase auth,
returns 401 for foreign tokens. There is NO config to add a foreign issuer — Supabase admin SDK
doesn't support that. So my earlier "option (a) JWKS" recommendation was wrong.

**Real options for CEO**:
- **B**: full auth migration (export/import auth.users, force re-login)
- **C**: edge function proxy with service_role bypass (violates RLS at boundary)
- **D**: mapping table (cleanest but most work)

Bug found bonus: `mindshift/.env` had `VITE_VOLAURA_API_URL=modest-happiness-production` which is
NOT VOLAURA — it's a ZEUS/Studio service. Real URL is `volauraapi-production.up.railway.app`.
Fixed locally, not yet propagated to Vercel env.

## Cross-cutting truths

1. **Both Claudes were lazy.** VOLAURA-Claude said my agents don't work without checking
   telemetry. I said they "100% work" without checking either. Truth required `*.meta.json`
   inspection — neither of us did it until today.

2. **Telemetry is the answer to "did agent X actually run".** `~/.claude/projects/{slug}/{session-uuid}/subagents/agent-*.meta.json`
   is the ground truth. Every Claude Code session writes per-spawn JSON. Should be a default check
   when auditing agent usefulness.

3. **The shared memory pattern works.** VOLAURA-Claude wrote his Session 91 breadcrumb to
   `~/.claude/projects/C--Projects-VOLAURA/memory/`. I read it, stopped duplicate work, sent him
   findings via the same memory location. First time cross-session communication actually happened
   without CEO copy-paste.

4. **Sprint E2 is bigger than its breadcrumb implied.** It was framed as "migrate MindShift to
   shared Supabase" but the real blocker is auth strategy across two Supabase projects with
   incompatible JWT issuers. None of B/C/D can be done without 1-2 days of focused work + CEO call.

## Single concrete next step (without CEO blocker)

Build the Plugin Marketplace. 2 hours. No dependencies on Sprint E2. Permanently solves
the agent sharing problem. After it's live, both VOLAURA-Claude and I consume the same 8 agents
from one source. No more "your agents don't work / no your agents don't work" false dichotomy.

## What I will NOT do without CEO go-ahead

- Sprint E2 (B/C/D auth decision required)
- Modify VOLAURA backend (other Claude's territory)
- Delete the 39 stale VOLAURA agent files (other Claude's territory until CEO unifies)
- Touch MindShift Supabase config until E2 plan approved
