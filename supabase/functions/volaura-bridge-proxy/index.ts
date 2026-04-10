// -- volaura-bridge-proxy Edge Function ----------------------------------------
// Secure server-side proxy between MindShift and the VOLAURA ecosystem.
//
// Problem: MindShift JWTs are scoped to the MindShift Supabase project.
// VOLAURA's Railway API rejects them with 401. This proxy:
//   1. Validates the caller is a real MindShift user (Supabase handles JWT check)
//   2. Exchanges MindShift user_id → shared VOLAURA JWT via /api/auth/from_external
//   3. Caches the shared JWT per-user (1hr TTL, refreshed 5min before expiry)
//   4. Forwards the actual request (character events, state fetch) to VOLAURA
//
// Endpoints (all POST, all require Authorization: Bearer <MindShift JWT>):
//
//   action: "character_event"  — forward a character event to VOLAURA
//   action: "fetch_state"      — fetch user's VOLAURA character state
//   action: "fetch_crystals"   — fetch crystal balance
//
// Secrets required (set via `supabase secrets set`):
//   EXTERNAL_BRIDGE_SECRET   — shared secret known only to MindShift edge fns + VOLAURA Railway
//   VOLAURA_API_URL          — Railway VOLAURA API base URL (e.g. https://volauraapi-production.up.railway.app)
//
// Sprint E2 Phase 3 — see memory/wip-sprint-e2-phase3.md

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'

// -- Constants -----------------------------------------------------------------

const PROXY_TIMEOUT_MS = 10_000  // 10s — Railway cold starts can be slow
const JWT_CACHE_TTL_MS  = 60 * 60 * 1000        // 1 hour
const JWT_REFRESH_AHEAD = 5  * 60 * 1000         // refresh 5min before expiry

const VALID_ACTIONS = ['character_event', 'fetch_state', 'fetch_crystals'] as const
type Action = typeof VALID_ACTIONS[number]

const VALID_EVENT_TYPES = [
  'xp_earned', 'buff_applied', 'vital_logged', 'stat_changed',
] as const

// -- In-memory JWT cache -------------------------------------------------------
// Key: MindShift user_id
// Edge function instances are ephemeral but this prevents hammering auth endpoint
// when many events fire in a short window for the same user.

interface CachedJwt {
  shared_jwt:     string
  shared_user_id: string
  expires_at:     number   // Unix ms
}

const jwtCache = new Map<string, CachedJwt>()

// -- JWT exchange --------------------------------------------------------------

async function getSharedJwt(
  volauraApi: string,
  bridgeSecret: string,
  mindshiftUserId: string,
  userEmail: string,
): Promise<CachedJwt> {
  const cached = jwtCache.get(mindshiftUserId)
  if (cached && Date.now() < cached.expires_at - JWT_REFRESH_AHEAD) {
    return cached
  }

  const controller = new AbortController()
  const timeoutId  = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS)

  let res: Response
  try {
    res = await fetch(`${volauraApi}/api/auth/from_external`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type':   'application/json',
        'X-Bridge-Secret': bridgeSecret,
      },
      body: JSON.stringify({
        standalone_user_id:     mindshiftUserId,
        standalone_project_ref: 'awfoqycoltvhamtrsvxk',
        email:                  userEmail,
        source_product:         'mindshift',
      }),
    })
  } finally {
    clearTimeout(timeoutId)
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`VOLAURA auth exchange failed: ${res.status} ${body.slice(0, 120)}`)
  }

  const data = await res.json() as {
    shared_user_id: string
    shared_jwt:     string
    expires_at:     string   // ISO timestamp
    created_new_user?: boolean
  }

  if (!data.shared_jwt || !data.shared_user_id) {
    throw new Error('VOLAURA auth response missing shared_jwt or shared_user_id')
  }

  const entry: CachedJwt = {
    shared_jwt:     data.shared_jwt,
    shared_user_id: data.shared_user_id,
    expires_at:     new Date(data.expires_at).getTime() || (Date.now() + JWT_CACHE_TTL_MS),
  }

  jwtCache.set(mindshiftUserId, entry)
  return entry
}

// -- VOLAURA fetch helper ------------------------------------------------------

async function volauraRequest<T>(
  volauraApi: string,
  path: string,
  sharedJwt: string,
  options?: RequestInit,
): Promise<T> {
  const controller = new AbortController()
  const timeoutId  = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS)

  let res: Response
  try {
    res = await fetch(`${volauraApi}${path}`, {
      method: 'GET',
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type':  'application/json',
        Authorization:   `Bearer ${sharedJwt}`,
        ...options?.headers,
      },
    })
  } finally {
    clearTimeout(timeoutId)
  }

  if (!res.ok) {
    throw new Error(`VOLAURA ${path} → ${res.status}`)
  }

  const json = await res.json()
  return (json.data ?? json) as T
}

// -- Input validation ----------------------------------------------------------

function isValidEventType(v: unknown): v is typeof VALID_EVENT_TYPES[number] {
  return VALID_EVENT_TYPES.includes(v as typeof VALID_EVENT_TYPES[number])
}

function sanitizeEventPayload(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const p = raw as Record<string, unknown>

  // Must have schema version
  if (p._schema_version !== 1) return null

  // Numeric fields — clamp to sane ranges
  const sanitized: Record<string, unknown> = { _schema_version: 1 }

  const numberFields: Array<[string, number, number]> = [
    ['xp',             0, 99999],
    ['focus_minutes',  0, 999],
    ['energy_before',  1, 5],
    ['energy_after',   1, 5],
    ['energy_level',   1, 5],
    ['burnout_score',  0, 100],
    ['streak_days',    0, 9999],
    ['skill_credit',   0, 99],
    ['task_difficulty',1, 3],
  ]

  for (const [key, min, max] of numberFields) {
    if (key in p) {
      const n = Number(p[key])
      if (!isNaN(n)) sanitized[key] = Math.min(max, Math.max(min, n))
    }
  }

  // Safe string fields
  const stringFields: Array<[string, number]> = [
    ['phase',      20],
    ['psychotype', 20],
    ['buff_type',  30],
    ['stat',       30],
    ['value',      100],
    ['source',     60],
  ]

  for (const [key, maxLen] of stringFields) {
    if (key in p && typeof p[key] === 'string') {
      sanitized[key] = (p[key] as string).slice(0, maxLen)
    }
  }

  return sanitized
}

// -- Main handler --------------------------------------------------------------

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }

  // Only POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }

  try {
    // -- 1. Validate MindShift JWT ---------------------------------------------
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    // -- 2. Check VOLAURA is configured ----------------------------------------
    const volauraApi    = Deno.env.get('VOLAURA_API_URL') ?? ''
    const bridgeSecret  = Deno.env.get('EXTERNAL_BRIDGE_SECRET') ?? ''

    if (!volauraApi || !bridgeSecret) {
      // Not configured — silent 200 so MindShift doesn't error out
      return new Response(
        JSON.stringify({ ok: false, reason: 'not_configured' }),
        { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    // -- 3. Parse & validate body ----------------------------------------------
    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    const action = VALID_ACTIONS.includes(body.action as Action)
      ? (body.action as Action)
      : null

    if (!action) {
      return new Response(
        JSON.stringify({ error: `action must be one of: ${VALID_ACTIONS.join(', ')}` }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    // -- 4. Exchange MindShift user → shared VOLAURA JWT -----------------------
    const { shared_jwt, shared_user_id } = await getSharedJwt(
      volauraApi,
      bridgeSecret,
      user.id,
      user.email ?? '',
    )

    // -- 5. Dispatch action ----------------------------------------------------

    if (action === 'fetch_state') {
      const state = await volauraRequest(
        volauraApi,
        '/api/character/state',
        shared_jwt,
      )
      return new Response(
        JSON.stringify({ ok: true, data: state, shared_user_id }),
        { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    if (action === 'fetch_crystals') {
      const crystals = await volauraRequest(
        volauraApi,
        '/api/character/crystals',
        shared_jwt,
      )
      return new Response(
        JSON.stringify({ ok: true, data: crystals, shared_user_id }),
        { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    // action === 'character_event'
    const eventType = isValidEventType(body.event_type) ? body.event_type : null
    if (!eventType) {
      return new Response(
        JSON.stringify({ error: `event_type must be one of: ${VALID_EVENT_TYPES.join(', ')}` }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    const payload = sanitizeEventPayload(body.payload)
    if (!payload) {
      return new Response(
        JSON.stringify({ error: 'payload must be an object with _schema_version: 1' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    const eventBody = {
      event_type:     eventType,
      payload,
      source_product: 'mindshift',
    }

    await volauraRequest(
      volauraApi,
      '/api/character/events',
      shared_jwt,
      { method: 'POST', body: JSON.stringify(eventBody) },
    )

    return new Response(
      JSON.stringify({ ok: true, shared_user_id }),
      { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
    )

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[volaura-bridge-proxy] internal error:', msg)

    // Return 200 with ok:false — MindShift is best-effort, never surface
    // VOLAURA failures to the user. Do not leak internal error details.
    return new Response(
      JSON.stringify({ ok: false, reason: 'upstream_error' }),
      { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
    )
  }
})
