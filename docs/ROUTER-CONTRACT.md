# LLM Router Contract — MindShift Edge Functions
_Version 1.0 — CTO draft. Submitted to swarm for research + vote (proposal 1eafb833)._

---

## Problem

Current `_shared/llm.ts` routes by **user/agent tier** (FREE/PRO/ELITE).
This is wrong: tier controls _access_, not _what kind of brain you need_.

A warm companion (Mochi) and a financial analyst (future) have different needs even
for the same user tier. The agent should declare its own model requirement.

---

## Solution: 3-axis routing

```
resolveChain(agent.llm_policy, user.subscription_tier) → ProviderChain
```

| Axis | Source | Role |
|------|--------|------|
| `llm_policy` | agents table (per agent) | What quality brain does this agent need? |
| `subscription_tier` | users table (per user) | Budget cap — what are they allowed to use? |
| Fallback chain | POLICY_CHAINS in code | What do we actually try, in order? |

---

## LLM Policy Values

| Policy | Use case | Latency target | Examples |
|--------|----------|----------------|---------|
| `ultra_fast` | Companions, mascots, casual chat | < 400ms | Mochi, Scout, Coach |
| `balanced` | Analysis, security, productivity agents | < 800ms | Guardian, Strategist |
| `max_quality` | Reasoning, economy-admin, elite agents | < 3000ms | Future ELITE agents |

---

## User Subscription Cap

| User tier | Max policy allowed |
|-----------|-------------------|
| `free` | `balanced` (max_quality → downgraded to `balanced`) |
| `pro_trial` | `max_quality` |
| `pro` | `max_quality` |

---

## Current POLICY_CHAINS (CTO default, based on discovered_models.json)

These are empirical measurements from `packages/swarm/discovered_models.json`.
**Swarm should propose changes via proposals.json.**

### ultra_fast
```
1. Groq  llama-3.1-8b-instant            (295ms measured) ← primary
2. Groq  meta-llama/llama-4-scout-17b    (299ms measured) ← hot backup
3. Gemini gemini-flash-lite-latest       (590ms measured) ← fallback
```

### balanced
```
1. Groq  llama-3.3-70b-versatile         (354ms measured) ← quality + speed
2. Gemini gemini-2.5-flash               (800ms measured) ← high quality fallback
3. OpenRouter google/gemma-2-27b-it:free (free backup)    ← last resort
```

### max_quality
```
1. NVIDIA nvidia/nemotron-ultra-253b-v1  (needs NVIDIA_API_KEY) ← best reasoning
2. Groq  moonshotai/kimi-k2-instruct    (1883ms measured) ← strong reasoning, on Groq!
3. DeepSeek deepseek-chat               (2204ms measured) ← needs DEEPSEEK_API_KEY
4. Groq  llama-3.3-70b-versatile        (354ms measured)  ← fast fallback
5. Gemini gemini-2.5-flash              (800ms measured)  ← ultimate fallback
```

---

## Constraints (NON-NEGOTIABLE)

- Total chain timeout: **8 seconds** (each provider gets 8s, tries serially)
- Every chain **must have a Gemini or Groq fallback** — never single point of failure
- Deno edge function: **cannot read local files**, routing must be in code
- `callCerebras()` remains a separate fast path (not in chains) — for mochi-respond only
- All models must already be in `discovered_models.json` or explicitly verified working

---

## Questions for the Swarm

1. **ultra_fast quality tradeoff**: llama-3.1-8b at 295ms vs gemini-2.5-flash at 800ms —
   is 8B quality acceptable for warm companion responses? Run eval if possible.

2. **Kimi K2 via Groq**: 1883ms is slower than current PRO chain but higher quality reasoning.
   Worth it for `max_quality`? Does it follow the MESSAGE:/STATE: prompt format?

3. **Should `balanced` chain include DeepSeek?** It's 2204ms but higher quality than Groq 70B
   for analysis tasks. Trade-off: latency vs Guardian/Strategist answer quality.

4. **task-type vs llm_policy**: Is 3-policy taxonomy enough, or do we need per-use-case routing
   (decompose-task, weekly-insight, recovery-message all have different needs)?
   If task-type routing: propose the taxonomy + how edge functions declare their type.

5. **Missing providers**: Are there models in discovered_models.json that CTO missed?
   Specifically: Groq compound-mini, openai/gpt-oss-120b — worth including?

---

## Implementation Notes

```typescript
// llm.ts additions
export type LLMPolicy = 'ultra_fast' | 'balanced' | 'max_quality'

export function resolveChain(
  policy: LLMPolicy,
  userTier: 'free' | 'pro_trial' | 'pro',
): Array<() => ProviderDef | null>
```

```sql
-- migration 022_llm_policy.sql
alter table public.agents
  add column if not exists llm_policy text not null default 'balanced'
  check (llm_policy in ('ultra_fast', 'balanced', 'max_quality'));
```

---

## How to Submit Swarm Vote

```python
from inbox_protocol import InboxProtocol, Proposal, ProposalType, Severity
inbox = InboxProtocol()
proposal = Proposal(
    agent="YOUR_AGENT_NAME",
    severity=Severity.MEDIUM,
    type=ProposalType.IDEA,
    title="LLM router: propose balanced chain update",
    content="Based on eval: ...",
)
inbox.add_proposal(proposal)
```

Or vote on existing proposal `1eafb833`:
```python
inbox.record_vote('1eafb833', agent='YOUR_AGENT', vote='for', reason='...')
```
