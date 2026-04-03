// ── gcal-store-token Edge Function ───────────────────────────────────────────
// POST /functions/v1/gcal-store-token
// Body: { providerToken: string, providerRefreshToken?: string, expiresIn?: number }
// Stores Google OAuth tokens for Calendar API access.
// Auth: JWT required

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'
import { checkDbRateLimit } from '../_shared/rateLimit.ts'

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing auth' }), {
        status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // ── Rate limit (10/day — token store is a one-time-per-auth action) ──────
    const { allowed, retryAfterSeconds } = await checkDbRateLimit(
      supabase, user.id, false, {
        fnName: 'gcal-store-token',
        limitFree: 10,
        windowMs: 86_400_000,
      }
    )
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429,
        headers: { ...cors, 'Content-Type': 'application/json', 'Retry-After': String(retryAfterSeconds) },
      })
    }

    const body = await req.json()
    const { providerToken, providerRefreshToken, expiresIn } = body as {
      providerToken: string
      providerRefreshToken?: string
      expiresIn?: number
    }

    if (!providerToken) {
      return new Response(JSON.stringify({ error: 'Missing providerToken' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const expiresAt = new Date(Date.now() + (expiresIn || 3600) * 1000).toISOString()

    // Upsert — if user already has tokens, update them
    const { error: upsertError } = await (supabase.from('google_tokens') as unknown as {
      upsert: (values: Record<string, unknown>, opts?: Record<string, unknown>) => { select: () => Promise<{ error: unknown }> }
    }).upsert({
      user_id: user.id,
      access_token: providerToken,
      refresh_token: providerRefreshToken || null,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' }).select()

    if (upsertError) {
      console.error('[gcal-store-token] upsert error:', upsertError)
      return new Response(JSON.stringify({ error: 'storage_failed' }), {
        status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('[gcal-store-token] unexpected error:', err)
    return new Response(JSON.stringify({ error: 'internal_error' }), {
      status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    })
  }
})
