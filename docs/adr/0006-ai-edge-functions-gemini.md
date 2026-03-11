# ADR 0006 — AI Features via Supabase Edge Functions (Gemini API)

**Date:** 2026-03-11
**Status:** Accepted
**Author:** Claude (Sprint 6 audit)

---

## Context

MindShift has three AI-powered features:

| Feature | Trigger | User value |
|---|---|---|
| Task decomposition | User adds a task | Breaks vague task into 2–4 concrete sub-steps |
| Recovery message | Return after 48h+ absence | Personalised, non-shaming re-entry message |
| Weekly insight | Weekly stats screen | Narrative summary of productivity patterns |

All three require calling an LLM API. The client-side code must never hold an API key, and calls must be rate-limited per user to control costs.

### Options for AI gateway

1. **Direct client-side API call** — simplest, but exposes API key in browser bundle
2. **Next.js API routes** — not applicable (Vite + React, not Next.js)
3. **Custom Express / Fastify server** — requires separate backend deployment and ops
4. **Supabase Edge Functions** — Deno-based serverless functions, co-located with the DB, auth-aware

---

## Decision

All AI calls are proxied through **Supabase Edge Functions** (Deno runtime). The client calls the edge function with a Supabase JWT; the edge function validates the user, checks rate limits, constructs the prompt, and calls the Gemini API.

### Why Gemini over Claude / GPT-4

| Criterion | Gemini 2.5 Pro | Claude 3.5 Sonnet | GPT-4o |
|---|---|---|---|
| Cost per 1M input tokens | ~$1.25 | ~$3.00 | ~$5.00 |
| Latency (p50) | ~800ms | ~1200ms | ~900ms |
| Context window | 1M tokens | 200K tokens | 128K tokens |
| Function calling | ✅ | ✅ | ✅ |

At 30 free decompositions/month per user × projected 1000 MAU, Gemini's cost is ~$3.75/month vs Claude's ~$9/month. The difference scales linearly with users.

### Prompt architecture

Each edge function has a **locked system prompt** with a persona and output contract:

```ts
const SYSTEM_PROMPT = `
You are a friendly, non-judgmental ADHD productivity assistant.
Rules:
- Never use shame language ("you should have", "you missed", "you failed")
- Never use urgency language ("asap", "immediately", "hurry")
- Output must be valid JSON matching the schema below
- Max 4 sub-steps per decomposition, each ≤ 8 words
`
```

User content is passed as the `user` role only, never interpolated into the system prompt. This prevents prompt injection from task content.

### Rate limiting

Handled by ADR 0001 (DB-backed rate limits):
- Free: 20 decompositions/hour, 5 recovery messages/day, 3 weekly insights/day
- Pro: unlimited

### Cost guard rails

1. **Max output tokens**: `maxOutputTokens: 512` on all calls — prevents runaway token usage
2. **Input truncation**: task titles are capped at 200 characters before prompt construction
3. **Fail-open**: if the edge function errors, the UI proceeds without decomposition rather than blocking task creation

---

## Consequences

### Positive
- **API key never exposed client-side**: key stored as Supabase secret, only accessible in edge function runtime
- **Auth-gated**: Supabase JWT validation means only authenticated users can trigger AI features
- **Co-located with DB**: edge functions can read `profiles` and `usage_limits` tables without extra network hops
- **Cheap at scale**: Gemini's pricing makes the freemium model viable below 10K MAU without revenue
- **Modular**: each feature is an independent function; new AI features can be added without touching existing ones

### Negative / Trade-offs
- **Cold start latency**: Supabase Edge Functions have ~150–300ms cold start. Combined with Gemini latency (~800ms), first-call UX is ~1s. Subsequent calls within the warm window (~5 min) are faster
- **Deno runtime constraints**: Deno does not support all Node.js modules; some npm packages (e.g., `@anthropic-ai/sdk`) require compatibility shims
- **Vendor lock-in (partial)**: migrating to a different LLM provider requires updating the edge functions but not the client code; considered acceptable
- **No streaming**: Gemini streaming responses are not used — the full response is awaited before sending to the client. Streaming support is a future enhancement

---

## Alternatives Considered

| Alternative | Why rejected |
|---|---|
| Direct client-side Gemini call | Exposes API key in browser bundle — security non-starter |
| Vercel Edge Functions | Would require deploying two separate services (Supabase + Vercel); Supabase co-location is simpler |
| OpenAI / Claude | Higher per-token cost at target scale; Gemini chosen on economics |
| Self-hosted LLM (Ollama) | Requires GPU infrastructure; not viable for bootstrapped MVP |
| Client-side model (WebLLM) | 4–8 GB model download; unacceptable for PWA users |

---

## Related Files

- `supabase/functions/decompose-task/index.ts`
- `supabase/functions/recovery-message/index.ts`
- `supabase/functions/weekly-insight/index.ts`
- `supabase/functions/_shared/rateLimit.ts`
- `supabase/functions/_shared/gemini.ts`
- `docs/adr/0001-db-backed-rate-limiting.md` — rate limit implementation
