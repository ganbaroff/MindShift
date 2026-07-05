// -- create-checkout Edge Function ---------------------------------------------
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
const APP_URL = Deno.env.get('APP_URL') ?? 'https://mind-shift-git-main-yusifg27-3093s-projects.vercel.app'
// Require DODO_API_BASE explicitly — no live default. A missing/typo'd env must NOT
// silently point checkout at live.dodopayments.com while the funnel assumes TEST mode.
// Boot-time 503 (below) surfaces the misconfig instead of charging real money by accident.
const DODO_API_BASE = Deno.env.get('DODO_API_BASE') ?? ''

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req)

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  if (!DODO_API_KEY) {
    return new Response(JSON.stringify({ error: 'Payments not configured', reason: 'config_missing_api_key' }), {
      status: 503, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
  if (!DODO_API_BASE) {
    // Fail loud instead of defaulting to the LIVE endpoint. Set DODO_API_BASE
    // (e.g. https://test.dodopayments.com) explicitly so TEST intent is never
    // silently promoted to live.
    console.error('[create-checkout] DODO_API_BASE not set — refusing to guess (would risk live mode)')
    return new Response(JSON.stringify({ error: 'Payments not configured', reason: 'config_missing_api_base' }), {
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
      console.error('[create-checkout] Dodo error:', dodoRes.status, err)
      // Coarse machine-readable classification so a broken checkout is diagnosable
      // in production WITHOUT leaking the API key or raw provider body:
      //   401/403 -> config (bad/expired key or wrong mode)
      //   400/404/422 -> request (bad product id / payload)
      //   else -> upstream (provider 5xx / transient)
      const cls = dodoRes.status === 401 || dodoRes.status === 403
        ? 'config'
        : (dodoRes.status === 400 || dodoRes.status === 404 || dodoRes.status === 422)
          ? 'request'
          : 'upstream'
      return new Response(JSON.stringify({
        error: 'Payment provider error',
        reason: cls,
        provider_status: dodoRes.status,
      }), {
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
