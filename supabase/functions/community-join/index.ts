// community-join — edge function
// POST /functions/v1/community-join
// Body: { communityId: string, alias?: string }
//
// Atomic: validates crystal balance → calls join_community() DB fn → fires character_event
// Auth: JWT required
// Rate limit: 5/hour (prevent abuse)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'
import { checkDbRateLimit } from '../_shared/rateLimit.ts'

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } }
      )
    }

    const { allowed } = await checkDbRateLimit(supabase, user.id, false, {
      fnName:    'community-join',
      limitFree: 5,
      windowMs:  3_600_000,
    })
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: 'Too many join attempts. Try again later.' }),
        { status: 429, headers: { ...cors, 'Content-Type': 'application/json' } }
      )
    }

    const { communityId, alias } = await req.json() as { communityId?: string; alias?: string }

    if (!communityId) {
      return new Response(
        JSON.stringify({ error: 'communityId required' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
      )
    }

    // Atomic join via SECURITY DEFINER DB function (checks crystals, debits, inserts)
    const { error: joinError } = await supabase.rpc('join_community', {
      p_community_id: communityId,
      p_alias:        alias ?? null,
    })

    if (joinError) {
      const status = joinError.message.includes('Insufficient') ? 402
        : joinError.message.includes('Already a member') ? 409
        : joinError.message.includes('not found') ? 404
        : 400
      return new Response(
        JSON.stringify({ error: joinError.message }),
        { status, headers: { ...cors, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch membership row for response + event payload
    const { data: membership } = await supabase
      .from('community_memberships')
      .select('id, badge_id, role, is_shareholder, joined_at')
      .eq('user_id', user.id)
      .eq('community_id', communityId)
      .single()

    // Fetch community info for event
    const { data: community } = await supabase
      .from('communities')
      .select('slug, name, tier, entry_cost_crystals')
      .eq('id', communityId)
      .single()

    // Fire character_event (best-effort — volaura-bridge-proxy)
    try {
      await supabase.functions.invoke('volaura-bridge-proxy', {
        body: {
          event_type: 'community_joined',
          source_product: 'mindshift',
          payload: {
            user_id:       user.id,
            community_id:  communityId,
            community_slug: community?.slug,
            tier:          community?.tier,
            crystal_spent: community?.entry_cost_crystals ?? 0,
          },
        },
      })
    } catch {
      // best-effort — join already succeeded
    }

    return new Response(
      JSON.stringify({
        success: true,
        membership: {
          communityId,
          communityName: community?.name,
          tier:          community?.tier,
          badgeId:       membership?.badge_id,
          role:          membership?.role,
          isShareholder: membership?.is_shareholder,
          joinedAt:      membership?.joined_at,
        },
      }),
      { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[community-join]', msg)
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
    )
  }
})
