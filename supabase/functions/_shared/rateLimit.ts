// -- DB-backed rate limiter for Edge Functions ---------------------------------
//
// Uses the `increment_rate_limit` SECURITY DEFINER Postgres function which
// performs an atomic INSERT … ON CONFLICT DO UPDATE, guaranteeing correctness
// across concurrent Deno isolates and cold starts.
//
// Usage:
//   import { checkDbRateLimit } from '../_shared/rateLimit.ts'
//   const { allowed, retryAfterSeconds } = await checkDbRateLimit(supabase, user.id, isPro, {
//     fnName:    'decompose-task',
//     limitFree: 20,
//     windowMs:  3_600_000, // 1 hour
//   })
//   if (!allowed) return 429 response

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

// -- Circuit breaker: fail-closed after sustained DB outage -------------------
// Prevents unlimited AI calls during prolonged Supabase downtime.
// Resets after 60s of no errors.
let consecutiveErrors = 0
let lastErrorAt = 0
const CIRCUIT_BREAKER_THRESHOLD = 5
const CIRCUIT_BREAKER_RESET_MS = 60_000

export interface RateLimitConfig {
  /** Matches the fn_name column in edge_rate_limits, e.g. 'decompose-task' */
  fnName: string
  /** Max calls per window for free users */
  limitFree: number
  /** Window length in milliseconds — window is aligned to epoch multiples */
  windowMs: number
}

export interface RateLimitResult {
  allowed: boolean
  /** Seconds until window resets — only set when allowed=false */
  retryAfterSeconds?: number
}

/**
 * Check and atomically increment a DB-backed rate limit.
 * Fails OPEN on DB errors so a transient Supabase hiccup never blocks users.
 */
export async function checkDbRateLimit(
  supabase: SupabaseClient,
  userId: string,
  isPro: boolean,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  // Pro users are never rate-limited
  if (isPro) return { allowed: true }

  const now = Date.now()

  // Circuit breaker: if DB has been failing continuously, fail-closed to prevent abuse
  if (consecutiveErrors >= CIRCUIT_BREAKER_THRESHOLD && now - lastErrorAt < CIRCUIT_BREAKER_RESET_MS) {
    console.warn(`[rateLimit] Circuit breaker OPEN (${consecutiveErrors} errors) — blocking request`)
    return { allowed: false, retryAfterSeconds: 60 }
  }
  // Reset circuit breaker if enough time has passed since last error
  if (now - lastErrorAt >= CIRCUIT_BREAKER_RESET_MS) {
    consecutiveErrors = 0
  }

  // Align window to epoch boundary (e.g. 3 600 000 ms → top of current hour)
  const windowStart = new Date(
    Math.floor(now / config.windowMs) * config.windowMs
  ).toISOString()
  const windowEndMs = Math.floor(now / config.windowMs) * config.windowMs + config.windowMs

  try {
    const { data: count, error } = await supabase.rpc('increment_rate_limit', {
      p_user_id:      userId,
      p_fn_name:      config.fnName,
      p_window_start: windowStart,
    })

    if (error) {
      consecutiveErrors++
      lastErrorAt = now
      // Fail open on transient errors (below circuit breaker threshold)
      console.warn(`[rateLimit] DB error (${consecutiveErrors}/${CIRCUIT_BREAKER_THRESHOLD}), failing open:`, error.message)
      return { allowed: true }
    }

    // DB success — reset circuit breaker
    consecutiveErrors = 0

    if ((count as number) > config.limitFree) {
      return {
        allowed: false,
        retryAfterSeconds: Math.ceil((windowEndMs - now) / 1000),
      }
    }

    return { allowed: true }
  } catch (err) {
    consecutiveErrors++
    lastErrorAt = now
    console.warn(`[rateLimit] Unexpected error (${consecutiveErrors}/${CIRCUIT_BREAKER_THRESHOLD}), failing open:`, err)
    return { allowed: true }
  }
}
