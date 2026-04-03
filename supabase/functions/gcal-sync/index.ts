// ── gcal-sync Edge Function ──────────────────────────────────────────────────
// POST /functions/v1/gcal-sync
// Body: {
//   action: 'create' | 'update' | 'delete',
//   task?: { id, title, taskType, dueDate, dueTime, estimatedMinutes, googleEventId, note },
//   focusSession?: { startedAt, durationMs, taskTitle },
// }
// Returns: { googleEventId: string } or { error: string }
// Auth: JWT required

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'
import { checkDbRateLimit } from '../_shared/rateLimit.ts'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GCAL_BASE = 'https://www.googleapis.com/calendar/v3/calendars'

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }

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

    // ── Rate limit (200/day free, unlimited pro) ────────────────────────────
    const { allowed, retryAfterSeconds } = await checkDbRateLimit(
      supabase, user.id, false, {
        fnName: 'gcal-sync',
        limitFree: 200,
        windowMs: 86_400_000,
      }
    )
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429,
        headers: { ...cors, 'Content-Type': 'application/json', 'Retry-After': String(retryAfterSeconds) },
      })
    }

    // ── Parse body ───────────────────────────────────────────────────────────
    const body = await req.json()
    const { action, task, focusSession } = body as {
      action: 'create' | 'update' | 'delete'
      task?: {
        id: string
        title: string
        taskType: string
        dueDate: string | null
        dueTime: string | null
        estimatedMinutes: number
        googleEventId: string | null
        note?: string
      }
      focusSession?: {
        startedAt: string
        durationMs: number
        taskTitle: string | null
      }
    }

    if (!['create', 'update', 'delete'].includes(action)) {
      return new Response(JSON.stringify({ error: 'Invalid action' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
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

    if (Date.now() > expiresAt - 60_000) { // refresh 1 min before expiry
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
        // Token revoked by user — signal to client
        return new Response(JSON.stringify({ error: 'token_revoked' }), {
          status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
        })
      }

      const refreshData = await refreshResp.json()
      accessToken = refreshData.access_token
      const newExpiresAt = new Date(Date.now() + refreshData.expires_in * 1000).toISOString()

      // Update stored token
      await supabase.from('google_tokens').update({
        access_token: accessToken,
        expires_at: newExpiresAt,
        updated_at: new Date().toISOString(),
      } as never).eq('user_id', user.id)
    }

    const calendarId = tokenRow.calendar_id || 'primary'
    const calUrl = `${GCAL_BASE}/${encodeURIComponent(calendarId)}/events`

    // ── Focus session → time block ───────────────────────────────────────────
    if (focusSession) {
      const start = new Date(focusSession.startedAt)
      const end = new Date(start.getTime() + focusSession.durationMs)
      const event = {
        summary: focusSession.taskTitle ? `Focus: ${focusSession.taskTitle}` : 'Focus session',
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() },
        colorId: '7', // teal
        transparency: 'opaque',
        description: 'Created by MindShift',
      }

      const resp = await fetch(calUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      })

      if (!resp.ok) {
        const errText = await resp.text()
        console.error('[gcal-sync] focus session create failed:', errText)
        return new Response(JSON.stringify({ error: 'gcal_api_error' }), {
          status: 502, headers: { ...cors, 'Content-Type': 'application/json' },
        })
      }

      const created = await resp.json()
      return new Response(JSON.stringify({ googleEventId: created.id }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // ── Task → calendar event ────────────────────────────────────────────────
    if (!task) {
      return new Response(JSON.stringify({ error: 'No task or focusSession provided' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // DELETE
    if (action === 'delete') {
      if (!task.googleEventId) {
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...cors, 'Content-Type': 'application/json' },
        })
      }
      const resp = await fetch(`${calUrl}/${task.googleEventId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}` },
      })
      // 404 = already deleted, that's fine
      if (!resp.ok && resp.status !== 404) {
        console.error('[gcal-sync] delete failed:', await resp.text())
      }
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // BUILD EVENT OBJECT
    if (!task.dueDate) {
      return new Response(JSON.stringify({ error: 'no_due_date' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const isMeeting = task.taskType === 'meeting'
    const isReminder = task.taskType === 'reminder'
    const typeEmoji = isMeeting ? '🤝' : isReminder ? '🔔' : '✅'

    // Determine start/end
    let eventStart: Record<string, string>
    let eventEnd: Record<string, string>

    if (task.dueTime) {
      // Timed event
      const startDt = new Date(`${task.dueDate}T${task.dueTime}:00`)
      const endDt = new Date(startDt.getTime() + (task.estimatedMinutes || 30) * 60_000)
      eventStart = { dateTime: startDt.toISOString() }
      eventEnd = { dateTime: endDt.toISOString() }
    } else {
      // All-day event
      eventStart = { date: task.dueDate }
      // Google Calendar all-day events: end date is exclusive (next day)
      const nextDay = new Date(task.dueDate)
      nextDay.setDate(nextDay.getDate() + 1)
      eventEnd = { date: nextDay.toISOString().split('T')[0] }
    }

    const event = {
      summary: `${typeEmoji} ${task.title}`,
      description: task.note ? `${task.note}\n\nCreated by MindShift` : 'Created by MindShift',
      start: eventStart,
      end: eventEnd,
      colorId: isMeeting ? '9' : '7', // 9=blueberry for meetings, 7=teal for tasks
      reminders: {
        useDefault: false,
        overrides: isMeeting
          ? [{ method: 'popup', minutes: 15 }, { method: 'popup', minutes: 5 }]
          : [{ method: 'popup', minutes: 10 }],
      },
    }

    // CREATE or UPDATE
    if (action === 'create' || (action === 'update' && !task.googleEventId)) {
      const resp = await fetch(calUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      })

      if (!resp.ok) {
        const errText = await resp.text()
        console.error('[gcal-sync] create failed:', errText)
        return new Response(JSON.stringify({ error: 'gcal_api_error' }), {
          status: 502, headers: { ...cors, 'Content-Type': 'application/json' },
        })
      }

      const created = await resp.json()

      // Store googleEventId on the task in DB
      await supabase.from('tasks').update({
        google_event_id: created.id,
      } as never).eq('id', task.id).eq('user_id', user.id)

      return new Response(JSON.stringify({ googleEventId: created.id }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // UPDATE existing event
    if (action === 'update' && task.googleEventId) {
      const resp = await fetch(`${calUrl}/${task.googleEventId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      })

      if (!resp.ok) {
        // If event was deleted from Google Calendar, create a new one
        if (resp.status === 404) {
          const createResp = await fetch(calUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(event),
          })
          if (createResp.ok) {
            const created = await createResp.json()
            await supabase.from('tasks').update({
              google_event_id: created.id,
            } as never).eq('id', task.id).eq('user_id', user.id)
            return new Response(JSON.stringify({ googleEventId: created.id }), {
              headers: { ...cors, 'Content-Type': 'application/json' },
            })
          }
        }
        console.error('[gcal-sync] update failed:', await resp.text())
        return new Response(JSON.stringify({ error: 'gcal_api_error' }), {
          status: 502, headers: { ...cors, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ googleEventId: task.googleEventId }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'unhandled_action' }), {
      status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('[gcal-sync] unexpected error:', err)
    return new Response(JSON.stringify({ error: 'internal_error' }), {
      status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    })
  }
})
