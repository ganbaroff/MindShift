/**
 * scheduled-push — Supabase Edge Function for background push notifications.
 *
 * Called by pg_cron every 15 minutes. Queries tasks with upcoming deadlines
 * and sends Web Push notifications to subscribed users.
 *
 * ADHD-safe: notification copy is warm and non-urgent.
 * "Heads up" not "URGENT". "Coming up" not "Due soon".
 *
 * Requires env vars:
 * - VAPID_PUBLIC_KEY
 * - VAPID_PRIVATE_KEY
 * - VAPID_SUBJECT (e.g. mailto:admin@mindshift.app)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:noreply@mindshift.app'

// ── VAPID JWT signing (Deno-native, no npm deps) ──────────────────────────────

function base64UrlEncode(data: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...data))
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(base64 + padding)
  return new Uint8Array([...binary].map(c => c.charCodeAt(0)))
}

async function createVapidJwt(audience: string): Promise<string> {
  const header = { typ: 'JWT', alg: 'ES256' }
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    aud: audience,
    exp: now + 12 * 3600, // 12h expiry
    sub: VAPID_SUBJECT,
  }

  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)))
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)))
  const unsigned = `${headerB64}.${payloadB64}`

  // Import VAPID private key as ECDSA P-256.
  // The public key is a base64url-encoded uncompressed EC point:
  //   0x04 || x (32 bytes) || y (32 bytes) = 65 bytes = 88 base64url chars.
  // Slicing the raw string (43/45 chars) is wrong — decode first, then
  // re-encode the x and y coordinate slices independently.
  const pubKeyBytes = Uint8Array.from(
    atob(VAPID_PUBLIC_KEY.replace(/-/g, '+').replace(/_/g, '/')),
    c => c.charCodeAt(0),
  )
  function toBase64Url(bytes: Uint8Array): string {
    return btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  }
  // pubKeyBytes[0] === 0x04 (uncompressed point marker) — skip it.
  // bytes 1-32 → x coordinate, bytes 33-64 → y coordinate.
  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    d: VAPID_PRIVATE_KEY,
    x: toBase64Url(pubKeyBytes.slice(1, 33)),
    y: toBase64Url(pubKeyBytes.slice(33, 65)),
  }

  const key = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(unsigned)
  )

  // Convert DER signature to raw r||s (64 bytes)
  const sigBytes = new Uint8Array(signature)
  const signatureB64 = base64UrlEncode(sigBytes)

  return `${unsigned}.${signatureB64}`
}

// ── Push notification sender ──────────────────────────────────────────────────

interface PushSubscription {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
}

async function sendPush(
  sub: PushSubscription,
  title: string,
  body: string,
  url: string = '/'
): Promise<boolean> {
  try {
    const audience = new URL(sub.endpoint).origin
    const jwt = await createVapidJwt(audience)

    const payload = JSON.stringify({ title, body, url, tag: 'mindshift-reminder' })

    const response = await fetch(sub.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'Authorization': `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`,
        'TTL': '86400',
      },
      body: new TextEncoder().encode(payload),
    })

    if (response.status === 410 || response.status === 404) {
      // Subscription expired — clean up
      const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
      await supabase.from('push_subscriptions').delete().eq('id', sub.id)
      return false
    }

    return response.ok
  } catch {
    return false
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

// Shared secret set in Supabase edge function env vars — prevents arbitrary
// internet callers from triggering push sends.  pg_cron sets this header.
const CRON_SECRET = Deno.env.get('CRON_SECRET')

Deno.serve(async (req) => {
  // Only accept POST (from pg_cron or manual invocation)
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // Reject unauthenticated callers — only pg_cron (or admin scripts that
  // know the CRON_SECRET) should trigger this endpoint.
  const authHeader = req.headers.get('Authorization') ?? ''
  if (!CRON_SECRET) {
    console.error('[scheduled-push] CRON_SECRET env var not set — refusing to run')
    return new Response('Misconfigured: CRON_SECRET not set', { status: 500 })
  }
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  // Find tasks with deadlines in the next 15 minutes
  const now = new Date()
  const in15min = new Date(now.getTime() + 15 * 60 * 1000)

  const { data: tasks, error: taskError } = await supabase
    .from('tasks')
    .select('id, title, user_id, due_date, due_time')
    .eq('status', 'active')
    .not('due_date', 'is', null)
    .gte('due_date', now.toISOString().split('T')[0])
    .lte('due_date', in15min.toISOString().split('T')[0])

  if (taskError || !tasks?.length) {
    return new Response(JSON.stringify({ sent: 0, tasks: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let sent = 0

  for (const task of tasks) {
    // Get user's push subscriptions
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', task.user_id)

    if (!subs?.length) continue

    // ADHD-safe copy: warm, not urgent
    const title = 'MindShift'
    const body = `Heads up: "${task.title}" is coming up`

    for (const sub of subs) {
      const ok = await sendPush(sub, title, body, '/today')
      if (ok) sent++
    }
  }

  return new Response(JSON.stringify({ sent, tasks: tasks.length }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
