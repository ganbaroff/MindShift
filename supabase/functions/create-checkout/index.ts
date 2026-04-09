// ── create-checkout Edge Function ─────────────────────────────────────────────
// POST /functions/v1/create-checkout
// Body: { plan?: 'pro_monthly' | 'pro_yearly' }
// Returns: { url: string, sessionId: string }
//
// Creates a Dodo Payments Checkout Session for the authenticated user.
// Redirects to APP_URL/settings?upgrade=success on completion.
//
// Auth: JWT required
// Env required: DODO_API_KEY, DODO_PRODUCT_ID, SUPABASE_URL, SUPABASE_ANON_KEY
// Env optional: DODO_PRODUCT_ID_YEARLY, APP_URL

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'
import { checkDbRateLimit } from '../_shared/rateLimit.ts'

const DODO_API_KEY = Deno.env.get('DODO_API_KEY')
const DODO_PRODUCT_ID = Deno.env.get('DODO_PRODUCT_ID') ?? ''
const APP_URL = Deno.env.get('APP_URL') ?? 'https://mindshift-umber.vercel.app'
const DODO_API_BASE = 'https://live.dodopayments.com'

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req)

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  if (!DODO_API_KEY) {
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

    const { allowed, retryAfterSeconds } = await checkDbRateLimit(
      supabase, user.id, false, { fnName: 'create-checkout', limitFree: 5, windowMs: 86_400_000 }
    )
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded', retryAfter: retryAfterSeconds }), {
        status: 429, headers: { ...cors, 'Content-Type': 'application/json', 'Retry-After': String(retryAfterSeconds) },
      })
    }

    const { plan = 'pro_monthly' } = await req.json() as { plan?: string }
    const productId = plan === 'pro_yearly'
      ? (Deno.env.get('DODO_PRODUCT_ID_YEARLY') ?? DODO_PRODUCT_ID)
      : DODO_PRODUCT_ID

    const dodoRes = await fetch(`${DODO_API_BASE}/checkouts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DODO_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        product_cart: [{ product_id: productId, quantity: 1 }],
        customer: { email: user.email ?? '' },
        return_url: `${APP_URL}/settings?upgrade=success`,
        metadata: { user_id: user.id },
      }),
    })

    if (!dodoRes.ok) {
      const err = await dodoRes.text()
      console.error('[create-checkout] Dodo error:', err)
      return new Response(JSON.stringify({ error: 'Payment provider error' }), {
        status: 502, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const session = await dodoRes.json() as { checkout_url: string; session_id: string }
    return new Response(JSON.stringify({ url: session.checkout_url, sessionId: session.session_id }), {
      status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[create-checkout]', err)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
