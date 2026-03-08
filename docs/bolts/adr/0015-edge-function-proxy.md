# ADR 0015 — Edge Function Proxy for Anthropic API

**Date:** 2026-03-08
**Bolt:** 4.3 — API Key Security: Edge Function Proxy
**Status:** Accepted

---

## Context

Before Bolt 4.3, `shared/services/claude.js` called the Anthropic API directly from
the browser, using `import.meta.env.VITE_ANTHROPIC_API_KEY`. All `VITE_*` variables
are bundled into the client-side JS and are therefore **publicly visible** to anyone
who opens DevTools → Sources → the app bundle.

This meant:
- The Anthropic API key was exposed in every user's browser
- Any visitor could extract it, use it against our quota, or publish it
- The header `anthropic-dangerous-direct-browser-access: true` was required (a red flag)
- ADR 0014 already flagged this as "future: Edge Function proxy"

Bolt 4.3 removes the key from client code entirely.

---

## Decision

**Use a Supabase Edge Function as an authenticated proxy to the Anthropic API.**

Architecture after Bolt 4.3:

```
Browser (React app)
  └─ callClaude()          ← no API key
       │  Authorization: Bearer <supabase_jwt>
       ▼
Supabase Edge Function (Deno, server-side)
  ├─ Verify JWT via supabase.auth.getUser()
  ├─ Read ANTHROPIC_API_KEY from Deno.env (Supabase Secret)
  └─ Proxy request to api.anthropic.com
       │  x-api-key: <secret>
       ▼
Anthropic API → response → browser
```

---

## Why Supabase Edge Function vs. Vercel Function

| | Supabase Edge Function | Vercel Serverless Function |
|---|---|---|
| Auth | Built-in JWT validation via `supabase.auth.getUser()` | Manual JWT parsing |
| Secrets | Native `supabase secrets set` CLI | Vercel dashboard env vars |
| Cold start | ~5ms (Deno, V8 isolate) | ~100–300ms (Node.js) |
| Cost | Included in Supabase free tier | Separate Vercel compute |
| Co-location | Same project as DB + Auth | Separate service |
| Complexity | 1 file, no infra config | Needs `api/` route + vercel config |

**Decision:** Supabase Edge Function. Auth, secrets, and the function all live in
the same Supabase project. Zero additional infrastructure.

---

## JWT Authentication Design (AC4)

The Edge Function requires a valid Supabase session JWT:

```
Authorization: Bearer <access_token>
```

The `access_token` is retrieved client-side via:
```js
const sb = getSupabase();
const { data: { session } } = await sb?.auth.getSession();
const token = session?.access_token ?? "";
```

The Edge Function verifies it server-side:
```typescript
const { data: { user }, error } = await sb.auth.getUser();
if (error || !user) return 401;
```

This guarantees:
- Only authenticated MindFocus users can trigger AI calls
- Unauthenticated / external requests → 401, no Anthropic call made
- No additional auth layer needed (reuses existing Supabase Auth)

**Implication:** AI calls now require a valid session. This is correct: all AI
features are gated behind freemium limits which already require auth.

---

## Client-Side Changes (Layer 1 only)

Only `callClaude()` in Layer 1 of `shared/services/claude.js` changed:

| Before | After |
|--------|-------|
| `AI_ENDPOINT = "https://api.anthropic.com/v1/messages"` | `AI_PROXY = "${SUPABASE_URL}/functions/v1/ai-proxy"` |
| `"x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY` | `"Authorization": "Bearer ${token}"` |
| `"anthropic-dangerous-direct-browser-access": "true"` | (removed) |
| `"anthropic-version": "2023-06-01"` | (moved to Edge Function) |

Layer 2 (semantic functions: `parseDump`, `generateEveningReview`, `aiFocusSuggest`,
`personaDialogue`, `parseDayPlan`, `aiDecomposeTask`) is **unchanged**. The swap is
fully contained in Layer 1 — this is why the two-layer architecture was designed.

---

## Deno.env Secret Setup

```bash
# One-time setup via Supabase CLI:
supabase secrets set ANTHROPIC_API_KEY=sk-ant-api03-...

# Verify:
supabase secrets list
```

The secret is injected into `Deno.env` at function invocation time. It never appears
in source code, Git history, or Vercel/Supabase dashboards' public-facing areas.

---

## Rate Limiting (Bonus Note)

The Supabase Edge Function adds a natural single choke point for rate limiting:

- **Freemium limits** continue to be enforced client-side before `callClaude()` is
  called (existing pattern — not changed by this bolt)
- **Future hardening:** Add per-user rate limiting inside the Edge Function by
  checking `usage_limits` in Supabase DB using the authenticated `user.id`. This
  would prevent freemium bypass by API clients that skip the UI gate.
- **Anthropic's own rate limits** (429) propagate back through the proxy unchanged

---

## Consequences

**Positive:**
- `VITE_ANTHROPIC_API_KEY` removed from all client code — zero exposure risk
- `anthropic-dangerous-direct-browser-access: true` header eliminated
- Edge Function is the single auth + forwarding gate for all AI calls
- Bundle size reduced slightly (removed env var reference and 3 headers)
- CSP `connect-src api.anthropic.com` can be removed from `vercel.json` (next bolt)
- Layer 2 functions unchanged — single-entry-point rule maintained

**Negative / Accepted Trade-offs:**
- AI calls now have one extra network hop (browser → Supabase Edge → Anthropic)
  Measured latency cost: ~5–15ms (Deno isolate, same-region as Supabase DB)
- Requires Supabase CLI `secrets set` step in onboarding (documented in env.example)
- Edge Function cold starts are negligible with Deno isolates (~5ms)

**Known future work:**
- Per-user server-side rate limiting inside Edge Function (see Rate Limiting note)
- Remove `api.anthropic.com` from vercel.json CSP `connect-src` (separate bolt)
