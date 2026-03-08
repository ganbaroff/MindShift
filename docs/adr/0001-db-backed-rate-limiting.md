# ADR 0001 — DB-Backed Rate Limiting for Edge Functions

**Date:** 2026-03-09
**Status:** Accepted
**Author:** Claude (Phase 10 sprint)

---

## Context

MindShift has three Supabase Edge Functions that call the Anthropic Claude API:

| Function | Trigger | Cost per call |
|---|---|---|
| `decompose-task` | User adds a task | ~$0.002 |
| `recovery-message` | Return after 48h gap | ~$0.001 |
| `weekly-insight` | Weekly stats screen | ~$0.003 |

Without rate limiting, a single free user could make unlimited calls, causing uncontrolled Anthropic API spend. The original `decompose-task` had **in-memory** rate limiting using a Deno isolate-scoped `Map`.

### Problem with in-memory rate limiting

```ts
// Original pattern — broken in two ways:
const rateLimits = new Map<string, { count: number; resetAt: number }>()
```

1. **Cold start reset**: Supabase Edge Functions are serverless. Each cold start creates a fresh Deno isolate with an empty `Map`. A user can exhaust the limit, wait for a cold start, and reset their counter.

2. **No coordination across instances**: When traffic is high, multiple Deno instances run concurrently. Each has its own `Map`. A user hitting 10 parallel requests sees 10 separate counters — effectively no rate limiting.

3. **No coverage**: `recovery-message` and `weekly-insight` had **zero rate limiting** — unlimited free calls.

---

## Decision

Replace in-memory rate limiting with a **PostgreSQL-backed atomic counter** using a `SECURITY DEFINER` function.

### Schema

```sql
-- Migration: 004_edge_rate_limits.sql
CREATE TABLE edge_rate_limits (
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fn_name      text        NOT NULL,
  window_start timestamptz NOT NULL,
  call_count   integer     NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, fn_name, window_start)
);
```

### Atomic increment function

```sql
CREATE OR REPLACE FUNCTION increment_rate_limit(
  p_user_id     uuid,
  p_fn_name     text,
  p_window_start timestamptz
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_count integer;
BEGIN
  INSERT INTO edge_rate_limits (user_id, fn_name, window_start, call_count)
  VALUES (p_user_id, p_fn_name, p_window_start, 1)
  ON CONFLICT (user_id, fn_name, window_start)
  DO UPDATE SET call_count = edge_rate_limits.call_count + 1
  RETURNING call_count INTO v_count;

  -- Cleanup: purge windows older than 48 hours (best-effort)
  DELETE FROM edge_rate_limits WHERE window_start < now() - interval '48 hours';

  RETURN v_count;
END;
$$;
```

### Why `SECURITY DEFINER`?

The table uses RLS — by default, authenticated users can only **read** their own rows. The `SECURITY DEFINER` attribute makes the function run as the Postgres superuser role, bypassing RLS for the `INSERT … ON CONFLICT DO UPDATE`. This means:

- RLS still protects direct table access (users cannot manually manipulate their counters via JS)
- The function is the only write path — auditable and controlled
- `SET search_path = public` prevents search-path injection attacks

### Rate limits applied

| Function | Free | Pro | Window |
|---|---|---|---|
| `decompose-task` | 20 calls | ∞ | per hour |
| `recovery-message` | 5 calls | ∞ | per day |
| `weekly-insight` | 3 calls | ∞ | per day |

Limits were chosen conservatively: normal ADHD usage patterns rarely hit these ceilings, but they prevent abuse and runaway costs.

### Fail-open design

```ts
// src/shared/hooks/_shared/rateLimit.ts
if (error) {
  console.warn('[rateLimit] DB error, failing open:', error.message)
  return { allowed: true }   // ← transient DB hiccup ≠ user blocked
}
```

A transient Supabase DB error should never block a real user. Failing open means the rate limit guard degrades gracefully — worst case, a few extra Claude calls slip through during an outage. This is preferable to blocking users during a DB incident.

### `Retry-After` header

All 429 responses include `Retry-After: N` (seconds until window reset), enabling intelligent client-side retry without exponential backoff guessing.

---

## Consequences

### Positive
- **Persistent**: survives cold starts, shared across all concurrent isolates
- **Atomic**: `INSERT … ON CONFLICT DO UPDATE` prevents race conditions
- **Auditable**: every call is recorded in `edge_rate_limits` with timestamps
- **Maintainable**: all three functions use the same `checkDbRateLimit()` utility
- **Pro bypass**: `isPro` check skips the DB call entirely for paying users

### Negative / Trade-offs
- **+1 DB round-trip per call**: ~5–15ms additional latency before the Claude API call. Acceptable given Claude's own ~500ms–2s response time.
- **TOCTOU on cleanup**: the 48h cleanup runs inside the same transaction as the increment. On very high-traffic users, cleanup adds marginal write overhead. This is acceptable for MVP; a pg_cron job is the correct long-term solution.
- **Counter records accumulate**: at MVP scale (< 10K users), this is negligible. Monitor `edge_rate_limits` row count at 50K+ users.

---

## Alternatives Considered

| Alternative | Why rejected |
|---|---|
| Keep in-memory Map | Resets on cold start; not shared across instances |
| Redis / Upstash | Extra infrastructure cost and complexity; Supabase Postgres is already present |
| Supabase `usage_limits` table (existing) | Already used for different purpose (action type limits); mixing concerns |
| API Gateway rate limiting | Not available on Vercel free tier without additional service |

---

## Related Files

- `supabase/migrations/004_edge_rate_limits.sql`
- `supabase/functions/_shared/rateLimit.ts`
- `supabase/functions/decompose-task/index.ts`
- `supabase/functions/recovery-message/index.ts`
- `supabase/functions/weekly-insight/index.ts`
