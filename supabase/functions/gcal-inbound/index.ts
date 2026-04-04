// ── gcal-inbound Edge Function ────────────────────────────────────────────────
// GET /functions/v1/gcal-inbound?days=7
// Returns: { events: GcalEvent[] }
//
// Fetches upcoming Google Calendar events for the authenticated user.
// Used by the client to show importable events that aren't already in MindShift.
//
// Auth: JWT required
// Env required: SUPABASE_URL, SUPABASE_ANON_KEY, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'
import { checkDbRateLimit } from '../_shared/rateLimit.ts'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GCAL_BASE = 'https://www.googleapis.com/calendar/v3/calendars'

export interface GcalEvent {
  id: string
  title: string
  start: string   // ISO date or dateTime
  end: string
  allDay: boolean
  description?: string
  location?: string
}

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req)

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
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

    // ── Rate limit (50/day free) ──────────────────────────────────────────────
    const { allowed, retryAfterSeconds } = await checkDbRateLimit(
      supabase, user.id, false, { fnName: 'gcal-inbound', limitFree: 50, windowMs: 86_400_000 }
    )
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded', retryAfter: retryAfterSeconds }), {
        status: 429, headers: { ...cors, 'Content-Type': 'application/json', 'Retry-After': String(retryAfterSeconds) },
      })
    }

    // ── Get Google tokens ────────────────────────────────────────────────────
    const { data: tokenRow, error: tokenError } = await supabase
      .from('google_tokens')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (tokenError || !tokenRow) {
      return new Response(JSON.stringify({ error: 'calendar_not_connected' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // ── Refresh token if expired ─────────────────────────────────────────────
    let accessToken = tokenRow.access_token
    const expiresAt = new Date(tokenRow.expires_at).getTime()

    if (Date.now() > expiresAt - 60_000) {
      const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
      const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')

      if (!clientId || !clientSecret || !tokenRow.refresh_token) {
        return new Response(JSON.stringify({ error: 'token_refresh_failed' }), {
          status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
        })
      }

      const refreshResp = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: tokenRow.refresh_token,
          grant_type: 'refresh_token',
        }),
      })

      if (!refreshResp.ok) {
        return new Response(JSON.stringify({ error: 'token_revoked' }), {
          status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
        })
      }

      const refreshData = await refreshResp.json()
      accessToken = refreshData.access_token
      const newExpiresAt = new Date(Date.now() + refreshData.expires_in * 1000).toISOString()

      await supabase.from('google_tokens').update({
        access_token: accessToken,
        expires_at: newExpiresAt,
        updated_at: new Date().toISOString(),
      } as never).eq('user_id', user.id)
    }

    // ── Fetch upcoming events ─────────────────────────────────────────────────
    const daysParam = new URL(req.url).searchParams.get('days')
    const days = Math.min(Math.max(parseInt(daysParam ?? '7', 10) || 7, 1), 30)

    const calendarId = tokenRow.calendar_id || 'primary'
    const timeMin = new Date().toISOString()
    const timeMax = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()

    const params = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '50',
    })

    const eventsResp = await fetch(
      `${GCAL_BASE}/${encodeURIComponent(calendarId)}/events?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    if (!eventsResp.ok) {
      const errText = await eventsResp.text()
      console.error('[gcal-inbound] events list failed:', errText)
      return new Response(JSON.stringify({ error: 'gcal_api_error' }), {
        status: 502, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const eventsData = await eventsResp.json()
    const rawItems = (eventsData.items ?? []) as Array<{
      id: string
      summary?: string
      start: { dateTime?: string; date?: string }
      end: { dateTime?: string; date?: string }
      description?: string
      location?: string
      status?: string
    }>

    // Map to clean GcalEvent shape — skip cancelled events
    const events: GcalEvent[] = rawItems
      .filter(e => e.status !== 'cancelled')
      .map(e => ({
        id: e.id,
        title: e.summary?.trim() || 'Untitled event',
        start: e.start.dateTime ?? e.start.date ?? '',
        end: e.end.dateTime ?? e.end.date ?? '',
        allDay: !e.start.dateTime,
        description: e.description?.trim(),
        location: e.location?.trim(),
      }))

    return new Response(JSON.stringify({ events }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('[gcal-inbound] unexpected error:', err)
    return new Response(JSON.stringify({ error: 'internal_error' }), {
      status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    })
  }
})
