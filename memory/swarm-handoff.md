# MindShift ↔ Python Swarm Handoff Protocol
# Version: 1.0 | 2026-04-10
# Purpose: Define how MindShift CTO and VOLAURA Python Swarm exchange work.

---

## WHY THIS EXISTS

MindShift CTO (Claude Code) and VOLAURA Python Swarm (44 agents) operate in different runtimes
with different context windows. Without a protocol, cross-product work gets duplicated,
dropped, or silently contradicted. This file is the interface contract between them.

---

## INFORMATION FLOWS

### MindShift → Swarm

| What | Where to write | When |
|------|---------------|------|
| Sprint AG shipped + new API surface | `VOLAURA/memory/context/mindshift-state.md` | After every batch commit |
| Crystal economy changes | `mindshift/memory/ecosystem-contract.md` + VOLAURA copy | When formula/cap changes |
| New character_events fired | `mindshift/memory/ecosystem-sync.md` | When new event_type added |
| Blockers needing VOLAURA action | `VOLAURA/memory/swarm/ceo-inbox.md` | Immediately on discovery |

### Swarm → MindShift

| What | Where to write | When |
|------|---------------|------|
| New VOLAURA API built | `VOLAURA/docs/MINDSHIFT-INTEGRATION-SPEC.md` | On deploy |
| Breaking change to shared infra | `VOLAURA/memory/swarm/ceo-inbox.md` | Immediately |
| Crystal economy changes | `mindshift/memory/ecosystem-contract.md` (sync both copies) | On deploy |

---

## CURRENT STATE (2026-04-10)

### What MindShift has built that Swarm needs to know:

**agent-chat edge function** — Sprint AG-3
- POST /functions/v1/agent-chat
- JWT required | 20 calls/day rate limit (DB-backed in `rate_limit_events`)
- LLM routing: ultra_fast (mochi/coach/scout) → Groq llama-3.1-8b-instant first
- Balanced (guardian/strategist) → Groq llama-3.1-70b-versatile first
- Max quality → gemini-2.5-flash
- Payload: `{ agentSlug: string, message: string, history: [{role, content}]×10 }`
- Response: `{ reply: string, agentSlug: string, llmUsed: string }`

**community-join edge function** — Sprint AG-2
- POST /functions/v1/community-join
- JWT required | 5 calls/hour rate limit
- Calls `join_community()` SECURITY DEFINER RPC (atomic: balance check → debit → membership)
- On success: fires `community_joined` character_event via volaura-bridge-proxy (best-effort)
- Returns 402 on insufficient crystals, 409 on already member

**Crystal ledger in Supabase** — Sprint AG-1
- `public.crystal_ledger` — append-only, crystal_type: FOCUS|SHARE
- `get_crystal_balance(user_id, type)` RPC: sums amounts
- `earn_focus_crystals(user_id, session_minutes)` RPC: 1 min = 5 FOCUS crystals
- Daily cap: 15 crystals/day per user (DB-enforced)

**New character_events fired by MindShift:**
- `crystal_earned` — via earn_focus_crystals() after every focus session
- `community_joined` — via community-join edge function
- Payload format: `{ amount, source_event, balance_after }` / `{ communityId, alias, tier }`

### What MindShift needs from Swarm (BLOCKED):

| Need | Why | Endpoint |
|------|-----|----------|
| POST /api/character/events | crystal_earned events can't flow to character_state | NOT BUILT |
| GET /api/character/state | Can't show AURA badge in MindShift | NOT BUILT |
| GET /api/character/crystals | Secondary crystal balance from VOLAURA | NOT BUILT |

---

## HANDOFF CHECKLIST

### Before MindShift CTO ends a session:

```
[ ] Updated memory/heartbeat.md (APIs Changed + Events Changed sections)
[ ] If crystal formula changed → updated ecosystem-contract.md (both copies)
[ ] If new event_type added → wrote to ecosystem-sync.md
[ ] If blocked by VOLAURA → wrote to VOLAURA/memory/swarm/ceo-inbox.md
```

### When Swarm CTO starts a session that touches MindShift:

```
[ ] Read mindshift/memory/heartbeat.md (current sprint state)
[ ] Read mindshift/memory/ecosystem-contract.md (shared rules)
[ ] Check VOLAURA/docs/MINDSHIFT-INTEGRATION-SPEC.md for pending API work
[ ] If building VOLAURA API → verify against ecosystem-contract API table
```

---

## CANONICAL FILE PATHS

```
# Read these before any cross-product work:
C:/Users/user/Downloads/mindshift/memory/heartbeat.md       — MindShift current state
C:/Users/user/Downloads/mindshift/memory/ecosystem-contract.md  — shared API + rules
C:/Projects/VOLAURA/memory/context/heartbeat.md             — VOLAURA current state
C:/Projects/VOLAURA/docs/MINDSHIFT-INTEGRATION-SPEC.md      — VOLAURA→MindShift spec
C:/Projects/VOLAURA/memory/swarm/ceo-inbox.md               — cross-product alerts + proposals
```

---

## ALERT FORMAT (for ceo-inbox.md)

```
[MINDSHIFT] ⚠️ [ISSUE TYPE] [brief description]
Date: YYYY-MM-DD
Impact: [which product/feature breaks]
Action needed: [from whom, what exactly]
Artifact: [commit / migration / heartbeat that proves the state]
```

Example:
```
[MINDSHIFT] ⚠️ BLOCKER VOLAURA has not built POST /api/character/events
Date: 2026-04-10
Impact: crystal_earned events fired by earn_focus_crystals() are not reaching character_state
Action needed: VOLAURA CTO to build /api/character/events endpoint per ADR-006 Decision 3
Artifact: supabase/functions/_shared/volaura-bridge.ts line 47 — fire-and-forget call currently returning 404
```
