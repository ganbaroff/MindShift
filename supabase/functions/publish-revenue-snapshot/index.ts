// publish-revenue-snapshot — admin-only edge function
// POST /functions/v1/publish-revenue-snapshot
// Body: { period_label, gross_revenue_usd, operating_costs_usd, dividend_per_share_crystal }
// Returns: { id, period_label, published_at }
// Auth: JWT required + ADMIN_EMAIL env var check
// Uses service role key to bypass RLS

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }

  try {
    // Auth: verify JWT to get caller identity
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } },
    )

    const { data: { user }, error: authError } = await anonClient.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    // Admin gate — check against ADMIN_EMAIL env var
    const adminEmail = Deno.env.get('ADMIN_EMAIL')
    if (!adminEmail || user.email !== adminEmail) {
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    // Parse body
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    const {
      period_label,
      gross_revenue_usd,
      operating_costs_usd,
      dividend_per_share_crystal,
    } = body as Record<string, unknown>

    if (typeof period_label !== 'string' || !period_label.trim()) {
      return new Response(
        JSON.stringify({ error: 'period_label required' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }
    if (typeof gross_revenue_usd !== 'number' || gross_revenue_usd < 0) {
      return new Response(
        JSON.stringify({ error: 'gross_revenue_usd must be a non-negative number' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }
    if (typeof operating_costs_usd !== 'number' || operating_costs_usd < 0) {
      return new Response(
        JSON.stringify({ error: 'operating_costs_usd must be a non-negative number' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }
    if (typeof dividend_per_share_crystal !== 'number' || dividend_per_share_crystal < 0) {
      return new Response(
        JSON.stringify({ error: 'dividend_per_share_crystal must be a non-negative number' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    const net_revenue_usd   = gross_revenue_usd - operating_costs_usd
    const dividend_pool_usd = net_revenue_usd * 0.5

    // Use service role to bypass RLS for insert
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data, error: insertError } = await serviceClient
      .from('revenue_snapshots')
      .insert({
        period_label:             period_label.trim(),
        gross_revenue_usd,
        operating_costs_usd,
        net_revenue_usd,
        dividend_pool_usd,
        dividend_per_share_crystal,
      })
      .select('id, period_label, published_at')
      .single()

    if (insertError) {
      console.error('[publish-revenue-snapshot]', insertError.message)
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    // Distribute FOCUS dividends to all shareholders — idempotent
    let shareholdersPaid = 0
    if (dividend_per_share_crystal > 0 && data) {
      const { data: paidCount } = await serviceClient.rpc(
        'distribute_dividends' as never,
        { p_snapshot_id: (data as { id: string }).id } as never,
      )
      shareholdersPaid = (paidCount as number) ?? 0
      console.log(`[publish-revenue-snapshot] distributed to ${shareholdersPaid} shareholders`)
    }

    return new Response(
      JSON.stringify({ success: true, snapshot: data, shareholders_paid: shareholdersPaid }),
      { status: 201, headers: { ...cors, 'Content-Type': 'application/json' } },
    )

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[publish-revenue-snapshot]', msg)
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }
})
