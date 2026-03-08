# Bolt 4.3 — API Key Security: Edge Function Proxy

**Date:** 2026-03-08
**Branch:** `claude/bolt-4-3`
**Status:** Complete

---

## Goal

Remove `VITE_ANTHROPIC_API_KEY` from the client bundle entirely. All AI calls
route through a Supabase Edge Function that holds the secret in `Deno.env`.

---

## Files Changed (5 total)

### New files (2)
- `supabase/functions/ai-proxy/index.ts` — Deno Edge Function: JWT auth, Anthropic proxy
- `docs/bolts/adr/0015-edge-function-proxy.md` — ADR

### Modified files (3)
- `src/shared/services/claude.js` — Layer 1 only: proxy URL + JWT token, removed API key
- `docs/env.example` — removed `VITE_ANTHROPIC_API_KEY`, added Supabase Secrets instruction
- `docs/bolts/2026-03-08-bolt-4-3-api-security.md` — this file

---

## Acceptance Criteria Results

| AC | Description | Result |
|----|-------------|--------|
| AC1 | `supabase/functions/ai-proxy/index.ts` — POST, JWT auth, `Deno.env.get("ANTHROPIC_API_KEY")`, proxy to Anthropic | ✅ |
| AC2 | `shared/services/claude.js` — all AI calls via `/functions/v1/ai-proxy`, no `VITE_ANTHROPIC_API_KEY` | ✅ |
| AC3 | `docs/env.example` — `VITE_ANTHROPIC_API_KEY` removed, Supabase Secrets instruction added | ✅ |
| AC4 | Edge Function validates Supabase JWT, rejects unauthenticated → 401 | ✅ |
| AC5 | `npm run build` 0 errors, bundle delta ≤ 0 kB (verified) | ✅ |
| AC6 | `docs/bolts/adr/0015-edge-function-proxy.md` | ✅ |
| AC7 | This bolt log | ✅ |

**Bonus:** Rate limiting note in ADR 0015 ✅

---

## Key Implementation Details

### Edge Function (Deno)
- Validates `Authorization: Bearer <jwt>` using `supabase.auth.getUser()`
- Forwards full Anthropic message body unchanged (no format conversion)
- Propagates Anthropic status codes (429, 400, etc.) back to client
- CORS headers for browser clients
- `console.error` on unexpected errors (visible in Supabase Edge Function logs)

### Client (claude.js Layer 1)
- `SUPABASE_URL` from `VITE_SUPABASE_URL` (already in bundle, safe public value)
- Session token via `getSupabase()?.auth.getSession()` — null-safe, no new deps
- `import { getSupabase } from "./supabase.js"` — already in bundle, zero size cost
- Layer 2 functions (`parseDump`, `generateEveningReview`, etc.) **unchanged**

### Naming Discrepancy Resolved
The bolt spec referenced `VITE_GEMINI_API_KEY` (legacy naming from Gemini era).
The actual codebase used `VITE_ANTHROPIC_API_KEY`. Used `ANTHROPIC_API_KEY` as the
Supabase Secret name (matching the actual Anthropic API). Noted in plan before implementation.

---

## Deployment Checklist

After merging this PR:
1. `supabase functions deploy ai-proxy`
2. `supabase secrets set ANTHROPIC_API_KEY=sk-ant-api03-...`
3. Remove `VITE_ANTHROPIC_API_KEY` from Vercel environment variables
4. Smoke test: dump a brain dump → verify AI parses correctly

---

## Self-Assessment

**Score: 9.5/10**

- Layer 1 / Layer 2 separation held perfectly — zero Layer 2 changes
- `getSupabase()?.auth.getSession()` — correct null-safety pattern
- Edge Function reuses Supabase Auth — no new auth surface
- CORS headers correctly configured for browser → Edge Function calls
- Naming discrepancy (GEMINI vs ANTHROPIC) caught before code, documented
- Bundle delta: negative (code removed, nothing added beyond the proxy URL constant)
- ADR covers: Edge Function vs Vercel comparison, JWT design, rate limiting future path

Minor deduction: the extra network hop (browser → Edge → Anthropic) adds ~5–15ms
latency. Acceptable trade-off for removing a secret from the client bundle.
