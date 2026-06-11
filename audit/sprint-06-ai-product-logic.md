# Sprint 6 — Product Logic & AI Integration

**Auditor:** Antigravity AI  
**Date:** 2026-06-06  
**Files examined:** `_shared/llm.ts`, `_shared/rateLimit.ts`, `mochi-respond/index.ts`, `mochiChatHelpers.ts`, `MochiChat.tsx`, `MochiSessionCompanion.tsx`, `useFocusSession.ts`, `useSessionEnd.ts`, `useSessionPersistence.ts`, `volaura-bridge.ts`

---

## 6.1 AI Architecture Overview

### Multi-Provider LLM Router (`_shared/llm.ts`)

The router implements two routing axes:

**Axis 1 — Agent Policy:** `ultra_fast` → `balanced` → `max_quality`
- `ultra_fast`: Groq 8B (295ms) → Groq Llama4-Scout → Gemini Flash Lite
- `balanced`: Groq 70B → Gemini 2.5 Flash → OpenRouter Gemma-2-27b
- `max_quality`: NVIDIA Nemotron-253B → Groq Kimi-K2 → DeepSeek → Groq 70B → Gemini Flash

**Axis 2 — User Subscription Tier:** `free` users capped at `balanced` — cannot trigger `max_quality`.

```
resolveChain(policy, userTier):
  if free && max_quality → downgrade to balanced
```

**Finding (LOW):** The `resolveChain` function (line 217) only caps `free → max_quality`. It does not cap `free → ultra_fast` (though `ultra_fast` is cheaper, so no financial impact). The tier cap should ideally be explicit in all directions for clarity.

### Provider Availability Pattern

All providers are accessed via lazy factory functions (`() => ProviderDef | null`). If an API key is missing (`Deno.env.get()` returns undefined), the factory returns `null` and the provider is silently skipped — no exception. The chain waterfall continues to the next available provider.

**Finding (HIGH):** If ALL providers in a chain have unconfigured API keys, `callLLM` throws:
```
"All LLM providers failed for tier ${tier}: ..."
```
This error surface reaches `mochi-respond` which catches it and returns a fallback message. However, for `mochi-respond`, the function has its own Gemini direct-call path (lines 61–65) that uses `GEMINI_API_KEY`. If `GEMINI_API_KEY` is missing AND Cerebras is missing, all AI fails silently to the hardcoded `FALLBACK_MESSAGES`. **New engineers must know that `GEMINI_API_KEY` is a required secret** — without it, Mochi AI is silently degraded to hardcoded messages with no alerting.

**Mitigation status:** `FALLBACK_MESSAGES` array (line 121-129 of `mochi-respond/index.ts`) exists and contains 3 valid non-empty messages. Mochi will always respond, but AI quality degrades silently.

### Cerebras Fast Path

`callCerebras` (`_shared/llm.ts` line 380) is a special ultra-low-latency path using `qwen-3-235b`. It is imported in `mochi-respond` and used as a first attempt before falling back to Gemini. Returns `null` on any error (never throws). The 8s timeout in `mochi-respond` (line 65) acts as the outer guard.

---

## 6.2 Rate Limiting Architecture

### DB-Backed Rate Limiter (`_shared/rateLimit.ts`)

**Pattern:** Atomic `increment_rate_limit` RPC → `INSERT … ON CONFLICT DO UPDATE` (audited in Sprint 2). Correct across Deno isolates and cold starts.

**Circuit breaker:** Opens after 5 consecutive DB errors within 60s — fails CLOSED (blocks users). Resets if 60s elapses without errors.

**Fail-open below threshold:** Below 5 errors, rate-limit DB failures allow requests through (line 84). This is an intentional product decision (transient hiccups should not block users). The comment at line 43 documents this explicitly.

**mochi-respond rate limits:**
- `mochi-chat`: 30 calls/day per free user
- `mochi-respond` (session triggers): 10 calls/day per free user
- Pro users: unlimited (line 52: early return `{ allowed: true }`)

**Finding (MEDIUM):** The `isPro` check reads `users.subscription_tier` from the DB (lines 181–195). If this query fails silently (no error check on the `data` result), `isPro` defaults to `false` and free limits apply. This is safe but means a pro user who experiences a transient DB read failure gets throttled during that window. This is acceptable product behavior but worth documenting for SLA purposes.

---

## 6.3 Mochi Chat — AI Safety & Privacy

### Crisis Detection Integration

From Sprint 5 audit: `detectCrisis()` runs on every user message **before** any API call. On match: flagged message is shown to user + hotline resources, but the text is **never sent to the AI endpoint**. Verified in `MochiChat.tsx` lines 161–173.

### Memory Persistence

`mochiMemory` is stored in Zustand/IDB (client-side only). Session memory is a compressed summary of last 2 user messages + last 2 Mochi messages (≤80 chars each). This summary is sent as context on next session open. No memory is stored server-side.

**Finding (LOW):** `saveMemory()` in `MochiChat.tsx` (line 143-154) has a dead code path:
```ts
const exchanges = messages.filter(m => m.role !== 'mochi' || !messages.some(x => x.role === 'user'))
// ...
void exchanges  // ← unused variable suppression
```
The `exchanges` variable is computed, passed to `void`, and discarded. This is leftover from a prior implementation. Not a bug but creates confusion for new engineers.

### Session-Only History

Chat messages live in component state — cleared on component unmount. `MAX_MESSAGES = 20` enforced client-side. ✅ Privacy-correct.

### Input Sanitisation

`userMessage.slice(0, 500)` in `mochi-respond` server-side (line 273) and `MAX_INPUT_LENGTH = 500` enforced client-side. Double-enforcement. ✅

### Conversation History Truncation

`recentMessages` slice: last 6 messages (`HISTORY_CONTEXT_COUNT * 2`). Prevents prompt bloat. ✅

---

## 6.4 Mochi Session Companion — In-Session AI

### Trigger Architecture

6 bubble triggers defined: `phase_release` (7 min), `phase_flow` (15 min), `milestone_7`, `milestone_15`, `milestone_30`, `milestone_60`. Min gap of 20 minutes between bubbles enforced via `lastShownAtRef`.

**Optimization audit:** The `elapsedBucket` memo (lines 157–160) reduces the trigger effect from ~3600 runs/hour (every tick) to ≤4 per session. This is a deliberate, well-documented performance optimization. ✅

### AI Upgrade Pattern

1. Fallback message shown immediately from i18n pools
2. AI request fires in background (8s timeout)
3. If AI responds AND bubble still visible → replace with AI message
4. If bubble dismissed before AI responds → `setActiveBubble(prev => prev?.id !== trigger.id ? prev : aiResp)` guard prevents stale update ✅

### Tone Safety

`effectiveTone = 'neutral'` when `emotionalReactivity === 'high' && sessionPhase === 'struggle'`. Prevents over-energetic AI messages during the user's most vulnerable session moments.

---

## 6.5 Product Logic — Session FSM

### Focus Session State Machine

```
setup → session → interrupt-confirm → session (resume)
                                    → bookmark-capture → [nature-buffer | recovery-lock]
                → bookmark-capture (direct stop)
session → hard-stop (120 min)
session → nature-buffer (timer end)
nature-buffer → recovery-lock (90+ min session)
```

The FSM is implemented via `setScreen()` calls across `useFocusSession`, `useSessionEnd`, and `useSessionPhase`. No explicit state machine library — transitions are call-site enforced.

**Finding (MEDIUM):** The FSM is distributed across 5 hooks (`useFocusSession`, `useSessionTimer`, `useSessionPhase`, `useSessionPersistence`, `useSessionEnd`). There is no single source of valid transitions. A new engineer extending the session flow must manually trace all `setScreen()` calls across 5 files to understand valid state transitions. A transition diagram is needed in the handover documentation.

### Crystal Economy Integration

`handlePostEnergy` (line 215): after post-session energy logged, fires:
1. `sendFocusSession` to VOLAURA platform bridge
2. `earn_focus_crystals` RPC (formula: `durationMinutes * 5`)
3. `sendCrystalEarned` to VOLAURA

**Finding (LOW):** `earn_focus_crystals` is called as an untyped RPC (comment: `// Supabase untyped RPC`). If this RPC is renamed or its signature changes in a future migration, it will fail silently at runtime — TypeScript will not catch it. This is a known limitation of `supabase.rpc('...' as never, ...)`.

### XP & Achievement System

`useSessionEnd` calls `unlockAchievement()` and `hasAchievement()` from the Zustand store. Achievement unlock happens client-side (no server validation). An achievement unlock in the store does not require a DB write to persist — it's IDB-backed via Zustand persist.

**Finding (LOW):** Achievements are client-side only. A user who clears browser storage (or switches devices) loses all achievement progress. This is likely an intentional product decision for MVP, but new engineers should know that achievements are not server-backed.

---

## 6.6 Edge Function Security Summary

| Function | Auth | Rate Limit | Input Sanitisation |
|----------|------|-----------|-------------------|
| `mochi-respond` | JWT required | 10/day (session) or 30/day (chat) | Slice 500 chars, valid trigger enum |
| `decompose-task` | JWT required | DB-backed | ✅ |
| `gdpr-export` | JWT required | None | User ID from JWT only |
| `gdpr-delete` | JWT required | None | User ID from JWT only |
| `dodo-webhook` | Signature verification | N/A | ✅ |
| `weekly-insight` | JWT required | DB-backed | ✅ |

**Finding (HIGH):** The `mochi-respond` function uses a **direct Gemini API call path** (line 61–65 in its own code, separate from `_shared/llm.ts`) alongside the Cerebras fast path. This means `mochi-respond` actually has THREE AI call paths: Cerebras → direct Gemini → `callLLM` chain. The direct Gemini path uses the same `GEMINI_URL` constant defined at the top of the file. New engineers extending the AI routing must be aware of this non-standard hybrid to avoid inadvertently routing around the shared LLM router.

---

## 6.7 Summary of Findings

| ID | Severity | Description |
|----|----------|-------------|
| S6-01 | **HIGH** | If `GEMINI_API_KEY` is missing, Mochi AI silently degrades to hardcoded messages with no alerting |
| S6-02 | **HIGH** | `mochi-respond` has THREE AI call paths (Cerebras → direct Gemini → `_shared/callLLM`) — non-obvious to new engineers, not documented in function header |
| S6-03 | **MEDIUM** | Session FSM is distributed across 5 hooks — no state transition diagram or canonical list of valid transitions |
| S6-04 | **MEDIUM** | `isPro` DB read failure silently applies free-tier rate limits to pro users |
| S6-05 | **LOW** | Dead code: `exchanges` variable in `saveMemory()` is computed and discarded |
| S6-06 | **LOW** | `earn_focus_crystals` called as untyped RPC — rename/schema change would fail silently at runtime |
| S6-07 | **LOW** | Achievements are client-side/IDB only — not server-backed, lost on storage clear |
| S6-08 | **LOW** | `resolveChain` only caps `free → max_quality`; not explicit for all tier/policy combinations |

### Sprint 6 Verdict: **PASS WITH ADVISORY**

The AI integration is architecturally sound: JWT auth on every edge function, DB-backed rate limiting with circuit breaker, crisis detection before AI, memory privacy (client-side only), and multi-provider failover. The main risks for a new engineering team are the three-path AI routing in `mochi-respond` (S6-02) and the silent degradation when `GEMINI_API_KEY` is absent (S6-01) — both need explicit documentation in the handover package.
