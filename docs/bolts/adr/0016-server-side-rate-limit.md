# ADR 0016 — Server-Side Per-User Rate Limiting in Edge Function

**Date:** 2026-03-08
**Status:** Accepted
**Bolt:** 4.4
**Author:** Claude Sonnet 4.6

---

## Context

After Bolt 4.3 moved all AI calls through the Supabase Edge Function proxy
(`supabase/functions/ai-proxy`), the client-side UI gate (`shared/lib/freemium.js`)
became the only enforcement of freemium limits. A user with a valid JWT could
bypass the UI entirely — calling the Edge Function directly via `curl` or a
browser DevTools fetch — and consume unlimited AI calls.

The Edge Function must enforce the same limits server-side so that no authenticated
user, regardless of how they make requests, can exceed the freemium tier.

---

## Decision

Add server-side rate limiting to `ai-proxy/index.ts`:

1. **Read** the caller's `action` field from the request body.
2. **Look up** the corresponding `usage_limits` row for (user_id, today-UTC).
3. **Reject** with 429 `{ error: "limit_reached", action }` if the counter ≥ limit.
4. **Increment** the counter after a successful Anthropic response.
5. **Skip** limits for Pro users (`user_profiles.is_pro = true`).
6. **Fail-open** on any DB error — infrastructure issues must never block users.

---

## Why Double Gate (UI + Server)?

| Layer | Purpose | What it solves |
|-------|---------|----------------|
| UI gate (`freemium.js`) | UX — fast feedback, no spinner | Stops normal users before API call |
| Server gate (Edge Function) | Security — can't be bypassed | Stops direct API callers, scripts, modified clients |

Both layers are necessary:
- UI gate alone → bypassable (open DevTools, call fetch directly)
- Server gate alone → acceptable security but poor UX (spinner → 429 → confused user)

Neither gate replaces the other. Document both in `freemium.js` comments.

---

## Why `usage_limits` and Not Redis?

| Option | Pros | Cons |
|--------|------|------|
| `usage_limits` (Postgres) | Already exists, RLS enforced, no new infra | Read-modify-write (TOCTOU on concurrent requests) |
| Redis | Atomic increments, sub-millisecond | New infra, new secret, not in scope, overkill for MVP |
| Supabase Realtime / CRDT | Interesting | No rate-limit primitives, wrong tool |

For MVP traffic (individual ADHD users, not API-as-a-service), the TOCTOU race
(two concurrent requests both reading count=N, both proceeding) is acceptable.
At worst, a user gets 2× one extra AI call on the rare simultaneous request.
Document as known limitation; upgrade path: Postgres advisory locks or `FOR UPDATE`.

---

## Why 429 and Not 403?

| Status | Semantics | Appropriate when |
|--------|-----------|------------------|
| 403 Forbidden | You are not allowed to access this resource | Auth/permission failure |
| 429 Too Many Requests | You have exceeded the rate limit | Rate limiting |

RFC 6585 defines 429 specifically for rate limiting. The client and UI
should treat 429 as "try again later / upgrade to Pro", not "you're blocked forever".
Returning 403 would mislead retry logic and future client libraries.

---

## Action → Column Mapping

The spec named the generic group `daily_ai_calls`, but the existing `usage_limits`
table has granular columns from migrations 004 and 006. We use the actual columns
directly — no new migration needed.

| Client `action` | DB column | Free limit | Why this column |
|-----------------|-----------|-----------|----------------|
| `parseDump` | `day_plan_calls` | 3/day | Dump is the primary daily AI feature |
| `aiFocusSuggest` | `day_plan_calls` | 3/day | Bundled with day-plan flow |
| `generateEveningReview` | `evening_review_calls` | 1/day | Dedicated evening feature |
| `personaDialogue` | `persona_calls` | 5/day | Added in migration 006, ADR 0012 |
| `aiDecomposeTask` | — (not limited) | — | Not in spec; UI gate sufficient |
| `parseDayPlan` | — (not limited) | — | Not in spec; UI gate sufficient |
| Unknown / absent | — (not limited) | — | Fail-open by omission |

---

## Fail-Open Strategy

| Failure | Behaviour | Rationale |
|---------|-----------|-----------|
| `usage_limits` read error | Skip limit check, proceed | Infrastructure error ≠ user error |
| `user_profiles` read error | Apply limits (conservative) | Can't verify Pro, safer to limit |
| Counter increment error | Log, proceed | User got AI response; logging sufficient |
| Anthropic call fails | No increment | Spec AC3: increment only on success |

---

## TOCTOU Race (Known Limitation)

If two requests arrive simultaneously for the same user on the same day:
- Both read count = N
- Both see N < limit → both proceed
- Both increment → count becomes N+1 instead of N+2

**Effect:** User gets ≤ 1 extra call per concurrent pair.
**Acceptable for MVP:** MindFocus is a personal tool, not an API product.
**Upgrade path:** Add `SELECT ... FOR UPDATE` to the usage read query to
serialize concurrent requests for the same user.

---

## Consequences

### Positive
- AI limits are now bypass-proof regardless of client implementation
- No new tables, no new migrations, no new infrastructure
- Fail-open means no user ever loses access due to DB hiccups
- 429 + `action` in response body gives client enough context for informative UI

### Negative
- 2 extra Supabase queries per rate-limited AI call (~5–10ms latency added)
- TOCTOU race allows ≤1 extra call per simultaneous request pair (acceptable for MVP)
- Pro check failure (conservative) may frustrate a Pro user if profile read errors

### Neutral
- `aiDecomposeTask` and `parseDayPlan` are not server-limited (UI gate only)
  → acceptable per spec; add to ACTION_LIMIT in a future bolt if needed

---

## Related
- ADR 0009: Freemium limits, fail-open, UTC date reset
- ADR 0012: `persona_calls` column origin
- ADR 0015: Edge Function proxy architecture
- Migrations: `004_usage_limits.sql`, `006_persona_calls.sql`
