// ── create-checkout Edge Function ─────────────────────────────────────────────
// POST /functions/v1/create-checkout
// Body: { plan?: 'pro_monthly' | 'pro_yearly' }
// Returns: { url: string, sessionId: string }
//
// Creates a Stripe Checkout Session for the authenticated user.
// Redirects to APP_URL/settings?upgrade=success on completion.
//
// Auth: JWT required
// Env required: STRIPE_SECRET_KEY, STRIPE_PRO_PRICE_ID, SUPABASE_URL, SUPABASE_ANON_KEY
// Env optional: STRIPE_PRO_YEARLY_PRICE_ID, APP_URL

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')
const STRIPE_PRO_PRICE_ID = Deno.env.get('STRIPE_PRO_PRICE_ID') ?? ''
const APP_URL = Deno.env.get('APP_URL') ?? 'https://mindshift-umber.vercel.app'

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req)

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  if (!STRIPE_SECRET_KEY) {
    return new Response(JSON.stringify({ error: 'Payments not configured' }), {
      status: 503, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } },
    )
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const { plan = 'pro_monthly' } = await req.json() as { plan?: string }
    const priceId = plan === 'pro_yearly'
      ? (Deno.env.get('STRIPE_PRO_YEARLY_PRICE_ID') ?? STRIPE_PRO_PRICE_ID)
      : STRIPE_PRO_PRICE_ID

    // Create Stripe checkout session
    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'mode': 'subscription',
        'line_items[0][price]': priceId,
        'line_items[0][quantity]': '1',
        'customer_email': user.email ?? '',
        'client_reference_id': user.id,
        'success_url': `${APP_URL}/settings?upgrade=success`,
        'cancel_url': `${APP_URL}/settings?upgrade=cancelled`,
        'subscription_data[metadata][user_id]': user.id,
        'allow_promotion_codes': 'true',
      }).toString(),
    })

    if (!stripeRes.ok) {
      const err = await stripeRes.text()
      console.error('[create-checkout] Stripe error:', err)
      return new Response(JSON.stringify({ error: 'Payment provider error' }), {
        status: 502, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const session = await stripeRes.json() as { url: string; id: string }
    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
      status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[create-checkout]', err)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
