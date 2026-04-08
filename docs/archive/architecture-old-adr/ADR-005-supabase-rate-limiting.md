# ADR-005: DB-Backed Atomic Rate Limiting in Edge Functions

**Status:** Accepted
**Date:** 2026-03-09
**Deciders:** Yusif (sole owner)
**Context area:** Backend / Edge Functions security

---

## Context

MindShift's AI Edge Functions (`decompose-task`, `recovery-message`, `weekly-insight`) call external AI APIs (Gemini) at non-trivial per-call cost. Without rate limiting, a malicious user or runaway client could generate thousands of dollars in API costs.

The Edge Functions run on Supabase's Deno runtime — stateless, ephemeral, with no in-memory state shared between invocations. Standard in-process rate limiting (e.g., a Map in memory) doesn't work across multiple Edge Function instances.

**Requirements:**
- Per-user rate limit (not per-IP — users are authenticated)
- Atomic increment (no race conditions between concurrent requests)
- Fail-open on DB errors (better to allow an extra call than deny a legitimate user)
- Simple to maintain without a dedicated Redis/caching layer

---

## Decision

Use a **Postgres RPC (`rpc('increment_rate_limit', ...)`) with an `upsert` pattern** for atomic per-user rate limiting stored in the `rate_limits` table.

---

## Options Considered

### Option A: In-memory Map (Edge Function global scope)
| Dimension | Assessment |
|-----------|------------|
| Implementation | Trivial |
| Atomicity | None — not shared between instances |
| Cost | Zero |

**Pros:** Zero latency, zero cost
**Cons:** Completely ineffective — each Edge Function instance has isolated memory; a user could make unlimited requests by hitting different instances. Not viable.

### Option B: Supabase DB via RPC (atomic upsert) ✅ CHOSEN
| Dimension | Assessment |
|-----------|------------|
| Implementation | Medium (SQL function + Deno client) |
| Atomicity | Strong — Postgres SERIALIZABLE isolation |
| Latency | +5–15ms per request (same-region) |
| Cost | Negligible (tiny row reads/writes) |

**Pros:** True atomicity via Postgres transactions; per-user granularity; persistent across instances; auditable (rate_limits table is queryable); resets automatically via TTL column
**Cons:** Adds ~10ms latency to each AI call; DB error path must fail-open to avoid blocking legitimate users

### Option C: Upstash Redis (via Supabase edge function)
| Dimension | Assessment |
|-----------|------------|
| Implementation | Medium |
| Atomicity | Strong (INCR is atomic in Redis) |
| Cost | Additional service dependency ($) |
| Latency | +10–30ms (external service) |

**Pros:** Redis `INCR` + `EXPIRE` is the canonical rate limiting pattern; very fast
**Cons:** Additional service and cost; Upstash free tier has limits; adds vendor dependency for a non-core feature; more complex than needed for current scale

### Option D: Supabase built-in rate limiting (future)
Supabase has announced rate limiting features but they are not yet generally available for Edge Functions at the per-user level. When available, this would be the preferred option.

---

## Trade-off Analysis

At MindShift's scale (beta: 50–100 users), the DB-backed approach is appropriate. The atomic `upsert` via RPC ensures no two concurrent requests can both pass a rate limit check — a critical property when each AI call costs money.

The fail-open behavior on DB errors (`if (error) return count ?? 0`) is a deliberate choice: it's better to occasionally allow an extra AI call than to block a user from using the app because of a transient DB issue. The monetary risk of a few extra calls is far lower than the engagement cost of unexplained errors.

**Current limits implemented:**
- `decompose-task`: 20 calls/user/hour
- `recovery-message`: 5 calls/user/day
- `weekly-insight`: 3 calls/user/day

---

## Consequences

**Easier:**
- No additional services (uses existing Supabase DB)
- Rate limit state is auditable (SELECT * FROM rate_limits)
- Easy to adjust limits (SQL UPDATE or environment variable)

**Harder:**
- Requires a `rate_limits` DB table and RPC function
- `null` count from DB on first-ever call needs explicit handling (treated as 0)
- Postgres connection pool pressure under high concurrency (not a concern at current scale)

**Revisit if:**
- Scale grows beyond ~1,000 DAU → switch to Redis for lower DB load
- Supabase releases native Edge Function rate limiting
- Rate limit needs sub-second precision (DB approach has ~1s granularity)

---

## Action Items
- [x] Implement `rateLimit()` in `supabase/functions/_shared/rateLimit.ts`
- [x] Fail-open behavior on DB error
- [ ] **Fix:** `null` count from DB treated as `null` (should be `0`) — medium priority bug
- [ ] Add `rate_limits` table migration to `supabase/migrations/`
- [ ] Log rate limit hits to monitoring for abuse detection
- [ ] Consider adding user notification when rate limit is reached (currently returns 429 silently)
