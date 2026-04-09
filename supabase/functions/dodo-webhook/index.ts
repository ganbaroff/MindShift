// ── dodo-webhook Edge Function ─────────────────────────────────────────────────
// POST /functions/v1/dodo-webhook
// Called by Dodo Payments — no JWT required (verify_jwt = false in config.toml)
//
// Handles subscription lifecycle events (Standard Webhooks spec):
//   subscription.active    → set subscription_tier = 'pro'
//   subscription.renewed   → keep subscription_tier = 'pro'
//   subscription.updated   → sync tier from status
//   subscription.cancelled → set subscription_tier = 'free'
//   subscription.expired   → set subscription_tier = 'free'
//   subscription.on_hold   → set subscription_tier = 'free'
//   subscription.failed    → set subscription_tier = 'free'
//
// Env required: DODO_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const DODO_WEBHOOK_SECRET = Deno.env.get('DODO_WEBHOOK_SECRET')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Standard Webhooks verification (https://www.standardwebhooks.com)
// Signed content: "{webhook-id}.{webhook-timestamp}.{raw-body}"
// Secret format: "whsec_{base64}" or plain base64
async function verifyDodoSignature(
  body: string,
  webhookId: string,
  timestamp: string,
  signatureHeader: string,
  secret: string,
): Promise<boolean> {
  const secretBase64 = secret.startsWith('whsec_') ? secret.slice(6) : secret
  let secretBytes: Uint8Array
  try {
    secretBytes = Uint8Array.from(atob(secretBase64), c => c.charCodeAt(0))
  } catch {
    console.error('[dodo-webhook] Invalid webhook secret format')
    return false
  }

  const signedContent = `${webhookId}.${timestamp}.${body}`
  const key = await crypto.subtle.importKey(
    'raw', secretBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedContent))
  const computed = `v1,${btoa(String.fromCharCode(...new Uint8Array(sig)))}`

  // Header may contain multiple space-separated signatures: "v1,sig1 v1,sig2"
  const a = new TextEncoder().encode(computed)
  return signatureHeader.split(' ').some(candidate => {
    const b = new TextEncoder().encode(candidate)
    if (a.length !== b.length) return false
    let diff = 0
    for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
    return diff === 0
  })
}

type DodoEvent = {
  type: string
  data: {
    subscription_id?: string
    status?: string
    metadata?: Record<string, string>
  }
  webhook_id?: string
}

function tierFromStatus(status: string): 'pro' | 'pro_trial' | 'free' {
  if (status === 'active') return 'pro'
  if (status === 'trialing') return 'pro_trial'
  return 'free'
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const body = await req.text()
  const webhookId = req.headers.get('webhook-id') ?? ''
  const timestamp = req.headers.get('webhook-timestamp') ?? ''
  const signatureHeader = req.headers.get('webhook-signature') ?? ''

  if (!DODO_WEBHOOK_SECRET || !await verifyDodoSignature(body, webhookId, timestamp, signatureHeader, DODO_WEBHOOK_SECRET)) {
    return new Response('Unauthorized', { status: 401 })
  }

  let event: DodoEvent
  try {
    event = JSON.parse(body) as DodoEvent
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Idempotency: reuse processed_stripe_events table (stores any payment event IDs)
  if (webhookId) {
    try {
      const { data: existing } = await supabase
        .from('processed_stripe_events')
        .select('event_id')
        .eq('event_id', webhookId)
        .maybeSingle()
      if (existing) {
        return new Response(JSON.stringify({ received: true, duplicate: true }), {
          status: 200, headers: { 'Content-Type': 'application/json' },
        })
      }
      await supabase.from('processed_stripe_events').insert({ event_id: webhookId })
    } catch {/* ignore if table missing */}
  }

  try {
    const userId = event.data?.metadata?.user_id
    const subscriptionId = event.data?.subscription_id
    const status = event.data?.status ?? ''

    if (!userId) {
      console.warn('[dodo-webhook] No user_id in metadata, skipping:', event.type)
      return new Response(JSON.stringify({ received: true }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      })
    }

    if (event.type === 'subscription.active') {
      await supabase.from('users').update({
        subscription_tier: 'pro',
      }).eq('id', userId)
      // Audit log (non-blocking)
      supabase.from('subscriptions').insert({
        user_id: userId,
        tier: 'pro',
        active: true,
      }).then(null, () => {/* ignore */})
    }

    if (['subscription.cancelled', 'subscription.expired', 'subscription.on_hold', 'subscription.failed'].includes(event.type)) {
      await supabase.from('users').update({
        subscription_tier: 'free',
      }).eq('id', userId)
    }

    if (event.type === 'subscription.updated' || event.type === 'subscription.renewed') {
      await supabase.from('users').update({
        subscription_tier: tierFromStatus(status),
      }).eq('id', userId)
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[dodo-webhook]', err)
    return new Response('Internal error', { status: 500 })
  }
})
