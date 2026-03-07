# ADR 0009 — Freemium Limits: 3/1 per Day, Date-Based Reset

**Date:** 2026-03-07
**Bolt:** 2.5 — Freemium Gate
**Status:** Accepted

---

## Context

MindFocus uses AI API calls for two operations:
- `parseDayPlan` — converts a free-form brain dump into structured daily tasks
- `generateEveningReview` — produces a personal AI reflection + XP award

Without limits, free users have unlimited API access, making the Pro tier non-viable.
The gate must protect revenue without triggering shame-loops, anxiety, or dark patterns
(ADHD-aware design, ADR-linked to adhd-aware-planning Principles 7, 9, 12).

---

## Decision 1: Limits of 3 parseDayPlan / 1 generateEveningReview per day

### Why 3 for parseDayPlan

- A typical ADHD user re-plans 1–3 times per day (morning plan, mid-day adjustment, late reset)
- Limit of 3 covers the realistic use case without feeling restrictive
- 1 would frustrate mid-day re-planners; 5+ makes the Pro upgrade invisible
- If a user hits 3 in one day, the message is gentle: "Available again tomorrow" — not a wall

### Why 1 for generateEveningReview

- Evening review is a daily ritual by design — exactly 1 per day is correct UX
- The XP system (ADR 0008) awards XP once per day; more than 1 review per day creates XP farming
- 1 is not a restriction — it mirrors the intended product behaviour

---

## Decision 2: Date-based reset (UTC midnight), not rolling 24h window

### Rejected: Rolling 24h window

A rolling window (e.g., "you can use 3 in any 24h period") would require storing timestamps
per call and computing time deltas. This is:
- More complex to implement (timestamp math, timezone edge cases)
- Confusing to users ("your limit resets at 3:47 PM" is not human-readable)
- More prone to bugs (timezone handling across locales)

### Chosen: Date-based UTC midnight reset

`usage_limits.date` is stored as `'YYYY-MM-DD'` UTC string.
At UTC midnight, a new date begins and the row for the new date doesn't exist yet → limit resets.

**Benefits:**
- Simple, predictable: "Available again tomorrow" is always true at local midnight ±12h
- No timestamp math in the application layer
- Matches how users mentally model "daily limits"

**Trade-off:** A user near the UTC date boundary could technically use 3+3=6 parseDayPlan
calls in a 24h window (11 PM + 1 AM UTC). This is acceptable for MVP — it's a soft limit,
not a hard billing constraint. Post-MVP can tighten with a hybrid check if needed.

---

## Decision 3: Increment BEFORE the API call (fail-fast, race-condition protection)

If we check the limit, then call the API, then increment, a race condition is possible:
two simultaneous requests both see "count = 2 < 3", both proceed, and we end up with
5 calls for a limit of 3.

Incrementing BEFORE the API call eliminates this class of bug. If the API call fails,
the increment is not rolled back (intentional: prevents retry-spamming on errors).

---

## Decision 4: Supabase-backed, not localStorage

localStorage-based limits can be cleared by the user in seconds (DevTools → Storage → Clear).
Supabase RLS ensures each row is owned by the authenticated user and cannot be tampered with
from the client. The anon key cannot update another user's usage_limits row.

---

## Decision 5: Fail-open on Supabase errors

If `sbCheckAndIncrementUsage` throws (network error, Supabase down), `useUsageLimits`
returns `{ allowed: true }`. We never block a user because our infrastructure failed.
This is consistent with INVARIANT 7 (log but don't crash) and ADHD Principle 1 (no shame loops).

---

## Decision 6: Pro users bypass all limits via user_profiles.is_pro

`user_profiles` is a separate table (not `auth.users` metadata) for two reasons:
1. `auth.users` metadata is not directly readable with RLS from the client
2. `user_profiles` can expand to store subscription tier, features flags, etc.

`is_pro` is checked on mount in `useUsageLimits`. On subscription upgrade, the Pro flag
is set server-side (webhook / admin function) — client trusts whatever is in the DB.

---

## Alternatives Considered

| Option | Rejected Reason |
|--------|----------------|
| localStorage only | Trivially bypassable |
| Server-side API route | No server (Vite + Supabase, no Node backend) |
| Supabase atomic RPC | Over-engineered for MVP with low concurrency |
| Countdown timer in UI | Dark pattern — ADHD Principle 12 |
| Modal gate | ADHD Principle 7 — never use modal for freemium |
| Red/warning colours for limit | ADHD Principle 1 — no shame, no urgency colours |

---

## Implementation

- Table: `usage_limits (user_id, date TEXT, day_plan_calls INT, evening_review_calls INT)`
- Table: `user_profiles (user_id, is_pro BOOL DEFAULT false)`
- Hook: `src/shared/hooks/useUsageLimits.js`
- Functions: `sbGetUsage`, `sbCheckAndIncrementUsage`, `sbGetUserProfile` in `shared/services/supabase.js`
- Integration: `useDayPlan.submitDayPlan`, `EveningScreen.handleGenerate`
- Banner: soft (`C.surfaceHi` bg, `C.textSub` text), never red, never modal
