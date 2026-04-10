---
name: remember-everything
description: Full context: who I am, where I am, what I'm building, who the swarm is
type: project
---

# Remember Everything — Full Context Document

_Read this first when context compresses. Updated: 2026-04-10_

---

## Who Am I (Claude Code / CTO role)

I am acting as **CTO of MindShift** within Yusif's VOLAURA ecosystem.

**My laws (non-negotiable):**
1. **Agents first** — I NEVER research, decide, or code alone. The swarm researches, proposes, votes. I synthesize + execute.
2. **Autonomous** — I don't ask Yusif unless truly blocked (P0 blocker, irreversible decision, legal risk, >4h blocked).
3. **Full context always** — Before any session, read: this file + wip-*.md + `git log --oneline -10`
4. **Breadcrumbs** — Write `memory/wip-{task}.md` BEFORE starting work. Update as I go.
5. **Constitution law** — No red. No shame. Animation safe. One CTA. Crystal ethics. These override everything.

**CTO Protocol files:**
- `memory/cto-operating-protocol.md` — full protocol v3
- `memory/cto-law-agents-first.md` — the core law
- `memory/cto-master-prompt-v3.md` — full CEO prompt

---

## Where Am I

**MindShift repo:** `C:\Users\user\Downloads\mindshift`
- Branch: `main`
- Status: Production-ready v1.0
- Deployed: `https://mind-shift-git-main-yusifg27-3093s-projects.vercel.app`
- Supabase project ID: `awfoqycoltvhamtrsvxk`

**VOLAURA ecosystem root:** `C:\Projects\VOLAURA\`
- Constitution: `C:\Projects\VOLAURA\docs\ECOSYSTEM-CONSTITUTION.md`
- Swarm: `C:\Projects\VOLAURA\packages\swarm\`
- ZEUS gateway: Railway (Node.js, 39 agents, pm2)

---

## What Is MindShift

**ADHD-aware productivity PWA** — the flagship product of the VOLAURA ecosystem.

**Stack:** React 18 + TypeScript + Vite + Zustand v5 + Supabase + Tailwind CSS
**Key design laws:**
- NEVER RED (RSD trigger). Palette: teal `#4ECDC4` / indigo `#7B72FF` / gold `#F59E0B`
- Energy adaptation (simplify at low energy)
- Shame-free language always
- Animation safety (useMotion() gate)
- One primary action per screen

**Crystal Economy (from Constitution):**
- FOCUS crystals: earned by focusing (1 min = 5 crystals)
- SHARE crystals: staked by joining ELITE communities, receive dividends
- Crystal ledger: `crystal_ledger` table in Supabase (NOT just VOLAURA)
- `earn_focus_crystals()` RPC: advisory lock + balance_after trigger

**Supabase Edge Functions:**
| Function | Purpose |
|----------|---------|
| `agent-chat` | AI agent conversation (multi-provider LLM router) |
| `mochi-respond` | Mochi mascot AI (Gemini 2.5 Flash + Cerebras fast path) |
| `community-join` | Join community with crystal gate |
| `publish-revenue-snapshot` | Admin: publish revenue + distribute dividends |
| `decompose-task` | Break task into subtasks |
| `recovery-message` | Welcome back after 72h+ absence |
| `weekly-insight` | Weekly summary from session data |
| `classify-voice-input` | Route voice → task/idea/reminder |
| `mochi-respond` | Mochi mascot messages |
| `gdpr-export` / `gdpr-delete` | GDPR compliance |
| `create-checkout` / `dodo-webhook` | Dodo Payments integration |

**Shared edge function helpers:**
- `_shared/llm.ts` — multi-provider LLM router (FREE/PRO/ELITE chains)
- `_shared/langfuse.ts` — Langfuse observability (fire-and-forget)
- `_shared/cors.ts` — CORS headers
- `_shared/rateLimit.ts` — DB-backed rate limiting

---

## What Is the VOLAURA Swarm

**Location:** `C:\Projects\VOLAURA\packages\swarm\`

**What it is:** 44 Python AI agents running autonomously. They research, propose, vote, and execute. They are NOT bots — they are teammates with opinions and expertise.

**Communication protocol:**
- Agents write proposals to `C:\Projects\VOLAURA\memory\swarm\proposals.json`
- Uses `InboxProtocol` from `inbox_protocol.py`
- Proposal types: IDEA, ESCALATION, COMPLAINT, CODE_REVIEW, SECURITY
- Severity: CRITICAL → CEO notified via Telegram; HIGH/MEDIUM/LOW → pending inbox
- CTO surfaces pending proposals at session start
- CEO (Yusif) replies: `act <id>` / `dismiss <id>` / `defer <id>`
- Proposals with `escalate_to_ceo=True` → also written to `ceo-inbox.md`

**Model discovery:**
- `discover_models.py` — auto-tests ALL models from ALL providers
- Results saved to `discovered_models.json`
- Current discovered working models (as of last run):
  - groq: 8 models (fastest: llama-3.1-8b-instant 295ms)
  - gemini: 5 models (fastest: gemini-flash-lite-latest 590ms)
  - deepseek: deepseek-chat (2204ms)
  - ollama: qwen3:8b (local, 0ms — not available to edge functions)

**Agent status ladder (AgentStatus):** INACTIVE → IDLE → ACTIVE → LEARNING → CONTRIBUTING → PROPOSING

**How I talk to the swarm:**
```python
# Write a proposal (Python):
from inbox_protocol import InboxProtocol, Proposal, ProposalType, Severity

inbox = InboxProtocol()
proposal = Proposal(
    agent="claude-cto",
    severity=Severity.MEDIUM,
    type=ProposalType.IDEA,
    title="...",
    content="...",
)
inbox.add_proposal(proposal)
```

**Or via Agent tool:** Spawn a general-purpose agent to write the proposal file directly.

**Key swarm files:**
- `agent_hive.py` — Agent class, hive management, task dispatch
- `coordinator.py` — Orchestrates agent work sessions
- `discover_models.py` — Auto-discover + test all LLM APIs
- `discovered_models.json` — Last discovery results (speeds, providers)
- `inbox_protocol.py` — Canonical proposal store + CEO inbox
- `engine.py` — Task execution engine
- `memory/swarm/proposals.json` — ALL proposals (DO NOT EDIT MANUALLY)
- `memory/swarm/ceo-inbox.md` — CEO escalation queue

---

## Current Sprint: AG-1 → AG-4 (ECOSYSTEM-AGENTS-CONTRACT v1)

**What landed so far (as of HEAD f0d0576):**

| Sprint | Status | Key files |
|--------|--------|-----------|
| AG-1: DB schema | ✅ | migrations 016-021 |
| AG-2: Community screen + hardening | ✅ | CommunityScreen, CommunityCard, AgentCard |
| AG-3: Agent chat | ✅ | AgentChatSheet, useAgentChat, agent-chat fn |
| AG-4: Economy + Admin | ✅ | EconomyDashboard, ShareholderPanel, AdminEconomyPage |
| E2E tests | ✅ | e2e/community.spec.ts (9 tests) |
| Multi-provider LLM | ✅ | _shared/llm.ts, _shared/langfuse.ts |

**Migrations written but NOT YET APPLIED to production:**
- 016: agents + agent_state_log
- 017: communities + community_memberships + join_community()
- 018: crystal_ledger + get_crystal_balance()
- 019: revenue_snapshots + get_pending_dividend()
- 020: ELITE community seeds + shareholder_positions + join_community() v2
- 021: earn_focus_crystals() + distribute_dividends() + grant_share_crystals()

**Supabase secrets NOT YET SET:**
- GROQ_API_KEY
- NVIDIA_API_KEY  
- OPENROUTER_API_KEY
- CEREBRAS_API_KEY
- LANGFUSE_PUBLIC_KEY
- LANGFUSE_SECRET_KEY
- ADMIN_EMAIL

**Open WIP:**
- `memory/wip-ecosystem-agents-contract.md` — full AG sprint contract

---

## Swarm Model Routing Decision (PENDING)

Current `_shared/llm.ts` has **hardcoded CHAINS** (CTO default):
```
FREE:  Gemini 2.5 Flash → OpenRouter Gemma-2-27b
PRO:   Groq llama-3.3-70b → NVIDIA llama-3.3-70b → Gemini
ELITE: NVIDIA Nemotron-253B → Groq llama-3.3-70b → Gemini
```

A **swarm proposal has been submitted** (ID in proposals.json) asking agents to:
1. Research optimal model routing for MindShift use cases (chat, mascot, task decomposition)
2. Consider: latency, quality, cost (all free tier), provider diversity
3. Vote and propose updated CHAINS
4. CTO will update `_shared/llm.ts` based on swarm consensus

**Key constraint:** Edge functions are Deno — they cannot read local JSON files from VOLAURA repo. The routing must be in code or a Supabase config table.

---

## People

- **Yusif** (`ganbarov.y@gmail.com`) — CEO/Owner. ADHD-aware design philosophy. Communicates in Russian. English for code/docs.
- **Claude (me)** — CTO. Synthesizes swarm findings. Executes implementation.

---

## Build Commands

```bash
tsc -b          # TypeScript check (REQUIRED before commit — not tsc --noEmit)
npm run build   # Vite build
npx playwright test  # E2E tests (all mocked, run offline)
npx vitest run  # Unit tests
```

---

## Key Constitution Rules (Quick Ref)

1. NEVER RED — no hue 0-15/345-360
2. Energy adaptation at energyLevel ≤ 2 or burnoutScore > 60
3. SHAME-FREE — no guilt copy
4. ANIMATION SAFETY — useMotion() gate everywhere
5. ONE PRIMARY ACTION per screen
6. Crystal ethics — no timers, no expiry, 24h refund, transparent formula
7. Locale injection in ALL AI edge functions (navigator.language)
8. 8s timeout + hardcoded fallback first for ALL AI calls
