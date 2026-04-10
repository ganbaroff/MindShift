// -- stripe-webhook Edge Function ----------------------------------------------
// POST /functions/v1/stripe-webhook
// Called by Stripe — no JWT required (--no-verify-jwt on deploy)
//
// Handles subscription lifecycle events:
//   checkout.session.completed       → set subscription_tier = 'pro'
//   customer.subscription.deleted    → set subscription_tier = 'free'
//   customer.subscription.paused     → set subscription_tier = 'free'
//   customer.subscription.updated    → sync tier from Stripe status
//
// Env required: STRIPE_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

async function verifyStripeSignature(body: string, signature: string, secret: string): Promise<boolean> {
  const parts = signature.split(',').reduce<Record<string, string>>((acc, part) => {
    const [k, v] = part.split('=')
    acc[k] = v
    return acc
  }, {})
  const timestamp = parts['t']
  const v1 = parts['v1']
  if (!timestamp || !v1) return false

  const payload = `${timestamp}.${body}`
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  const computed = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
  // Constant-time comparison to prevent timing side-channel attacks
  const a = new TextEncoder().encode(computed)
  const b = new TextEncoder().encode(v1)
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const body = await req.text()
  const signature = req.headers.get('stripe-signature') ?? ''

  if (!STRIPE_WEBHOOK_SECRET || !await verifyStripeSignature(body, signature, STRIPE_WEBHOOK_SECRET)) {
    return new Response('Unauthorized', { status: 401 })
  }

  const event = JSON.parse(body) as { type: string; data: { object: Record<string, unknown> } }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Idempotency: store processed event ID to skip duplicate webhook deliveries
  const eventId = (event as { id?: string }).id
  if (eventId) {
    const { data: existing } = await supabase
      .from('processed_stripe_events')
      .select('id')
      .eq('event_id', eventId)
      .maybeSingle()
    if (existing) {
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      })
    }
    await supabase.from('processed_stripe_events').insert({ event_id: eventId }).catch(() => {/* ignore if table missing */})
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const userId = session['client_reference_id'] as string
      const subscriptionId = session['subscription'] as string
      if (userId) {
        // Only set subscription_started_at on first activation (idempotent re-delivery safety)
        const { data: existing } = await supabase.from('users').select('subscription_started_at').eq('id', userId).maybeSingle()
        await supabase.from('users').upsert({
          id: userId,
          subscription_tier: 'pro',
          stripe_subscription_id: subscriptionId,
          subscription_started_at: existing?.subscription_started_at ?? new Date().toISOString(),
        })
      }
    }

    if (event.type === 'customer.subscription.deleted' || event.type === 'customer.subscription.paused') {
      const sub = event.data.object
      const userId = (sub['metadata'] as Record<string, string>)?.['user_id']
      if (userId) {
        await supabase.from('users').update({
          subscription_tier: 'free',
          stripe_subscription_id: null,
        }).eq('id', userId)
      }
    }

    if (event.type === 'customer.subscription.updated') {
      const sub = event.data.object
      const userId = (sub['metadata'] as Record<string, string>)?.['user_id']
      const status = sub['status'] as string
      if (userId) {
        await supabase.from('users').update({
          subscription_tier: status === 'active' ? 'pro' : status === 'trialing' ? 'pro_trial' : 'free',
        }).eq('id', userId)
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[stripe-webhook]', err)
    return new Response('Internal error', { status: 500 })
  }
})
