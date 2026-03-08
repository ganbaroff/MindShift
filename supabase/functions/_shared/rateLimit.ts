// ── DB-backed rate limiter for Edge Functions ─────────────────────────────────
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
      // Fail open — DB hiccup should never block the user
      console.warn('[rateLimit] DB error, failing open:', error.message)
      return { allowed: true }
    }

    if ((count as number) > config.limitFree) {
      return {
        allowed: false,
        retryAfterSeconds: Math.ceil((windowEndMs - now) / 1000),
      }
    }

    return { allowed: true }
  } catch (err) {
    // Fail open on unexpected errors
    console.warn('[rateLimit] Unexpected error, failing open:', err)
    return { allowed: true }
  }
}
