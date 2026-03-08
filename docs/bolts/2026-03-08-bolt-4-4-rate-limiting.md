# Bolt 4.4 — Per-User Server-Side Rate Limiting

**Date:** 2026-03-08
**Branch:** `claude/bolt-4-4`
**Base SHA:** `2940915`
**Author:** Claude Sonnet 4.6

---

## Goal

Add server-side enforcement of freemium limits inside the `ai-proxy` Edge
Function so that authenticated users cannot bypass the UI gate by calling
the proxy directly with a valid JWT.

---

## Acceptance Criteria

| AC | Description | Status |
|----|-------------|--------|
| AC1 | Edge Function reads `usage_limits` after JWT validation; 429 on limit exceeded | ✅ |
| AC2 | Uses existing `usage_limits` columns; no new tables or migrations | ✅ |
| AC3 | Counter incremented after successful AI call only | ✅ |
| AC4 | `action` field routes to correct counter (parseDump/aiFocusSuggest → day_plan_calls; generateEveningReview → evening_review_calls; personaDialogue → persona_calls) | ✅ |
| AC5 | `claude.js` handles 429 and includes action in error message | ✅ |
| AC6 | UI gate (freemium.js) preserved; double-gate documented in ADR | ✅ |
| AC7 | ADR 0016 written | ✅ |
| AC8 | Bolt log written | ✅ (this file) |
| AC9 | `npm run build` 0 errors; bundle delta = 0 kB | ✅ |

---

## Files Changed

### Modified
- `supabase/functions/ai-proxy/index.ts` — Bolt 4.4 additions:
  - `ACTION_LIMIT` map: action → `{ col, limit }`
  - `utcToday()` helper returning "YYYY-MM-DD" UTC
  - Strip `action` from body before forwarding to Anthropic
  - Pro user check (`user_profiles.is_pro`) — fail-open
  - Usage read (`usage_limits` by user_id + date) — fail-open
  - Limit check → 429 `{ error: "limit_reached", action }` if over limit
  - Post-success counter: UPDATE existing row OR INSERT new row
- `src/shared/services/claude.js` — Bolt 4.4 additions:
  - Layer 1: `action` added to `callClaude` opts; included in request body
  - Layer 1: 429 handler reads response body to extract limited action
  - Layer 2 `parseDump`: `callClaude(prompt, { action: "parseDump" })`
  - Layer 2 `generateEveningReview`: `callClaude(prompt, { action: "generateEveningReview" })`
  - Layer 2 `aiFocusSuggest`: `callClaude(prompt, { action: "aiFocusSuggest" })`
  - Layer 2 `personaDialogue`: `callClaude("", { …, action: "personaDialogue" })`

### New
- `docs/bolts/adr/0016-server-side-rate-limit.md`
- `docs/bolts/2026-03-08-bolt-4-4-rate-limiting.md` (this file)

---

## Key Design Decisions

### Action field flow
```
Browser → callClaude(prompt, { action: "parseDump" })
       → fetch(AI_PROXY, { body: { model, messages, action: "parseDump" } })
       → Edge Function: extract action, look up ACTION_LIMIT
       → check usage_limits for user + today
       → strip action from body
       → fetch(Anthropic, { body: { model, messages } })  ← no action field
       → on success: increment usage_limits counter
```

### Fail-open matrix
| Failure | Behaviour |
|---------|-----------|
| `usage_limits` read error | Proceed (no enforcement) |
| `user_profiles` read error | Proceed with limits applied |
| Counter increment error | Log, proceed (user has response) |
| Anthropic error | No increment |

### TOCTOU race
Documented in ADR 0016. Acceptable for MVP.

---

## Build Output

```
dist/assets/index-*.js   502.00 kB │ gzip: 148.87 kB
✓ built in ~930ms — 0 errors
```

Bundle delta from Bolt 4.3 baseline: **0.00 kB** (changes are Deno-only + string
constants in claude.js; gzip compression absorbs the delta).

---

## Constraints Verified

- ✅ `src/skeleton/` — not touched
- ✅ `src/features/` — not touched
- ✅ `src/shared/lib/` — not touched
- ✅ No npm dependencies added
- ✅ No new DB tables or migrations
- ✅ `logError()` — N/A for Deno Edge Function (uses `console.error` to Edge logs)
- ✅ Fail-open on DB errors

---

## Suggested Next Steps

*None added in this bolt. Bolt 5.1 (Payment) is next on the roadmap.*
