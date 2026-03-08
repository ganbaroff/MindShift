// ── recovery-message Edge Function ────────────────────────────────────────────
// POST /functions/v1/recovery-message
// Body: { daysAbsent: number, incompleteCount: number }
// Returns: { message: string }
//
// Returns a warm, shame-free 2-sentence welcome-back message.
// Auth: JWT required
// Rate limit: 5 calls/day per user (free), unlimited (pro) — DB-backed

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'
import { checkDbRateLimit } from '../_shared/rateLimit.ts'

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-5'

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }

  try {
    // ── Auth ───────────────────────────────────────────────────────────────────
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

    // ── Rate limit (DB-backed — 5/day free, unlimited pro) ────────────────────
    const { data: userRow } = await supabase
      .from('users')
      .select('subscription_tier')
      .eq('id', user.id)
      .single()

    const isPro = userRow?.subscription_tier === 'pro' ||
      userRow?.subscription_tier === 'pro_trial'

    const rl = await checkDbRateLimit(supabase, user.id, isPro, {
      fnName:    'recovery-message',
      limitFree: 5,
      windowMs:  86_400_000, // 5 calls per day
    })

    if (!rl.allowed) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Try again tomorrow.' }),
        {
          status: 429,
          headers: {
            ...cors,
            'Content-Type': 'application/json',
            'Retry-After': String(rl.retryAfterSeconds ?? 86400),
          },
        }
      )
    }

    // ── Input ──────────────────────────────────────────────────────────────────
    const body = await req.json() as {
      daysAbsent?: unknown
      incompleteCount?: unknown
    }

    const days  = Math.max(0, Math.floor(Number(body.daysAbsent  ?? 0)))
    const tasks = Math.max(0, Math.floor(Number(body.incompleteCount ?? 0)))

    // ── Claude call ────────────────────────────────────────────────────────────
    const prompt = `You are a compassionate ADHD productivity coach writing a welcome-back message.

The user has been away for ${days} day${days !== 1 ? 's' : ''}.
They have ${tasks} incomplete task${tasks !== 1 ? 's' : ''} waiting.

Write exactly 2 sentences. Rules:
- ZERO shame, guilt, or disappointment — this is ADHD-safe
- Acknowledge the return warmly, like greeting a friend
- Do NOT mention the number of incomplete tasks or the number of days
- Focus on the present moment and what's possible right now
- Use gentle, grounded language — not toxic positivity
- Second sentence can suggest one small first step

Respond ONLY with the 2-sentence message. No quotes, no JSON, no labels.`

    const claudeResp = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 150,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!claudeResp.ok) {
      throw new Error(`Anthropic API error: ${claudeResp.status}`)
    }

    const claudeData = await claudeResp.json() as {
      content: { type: string; text: string }[]
    }

    const message = (claudeData.content[0]?.text ?? '').trim()

    if (!message) throw new Error('Empty message from Claude')

    return new Response(
      JSON.stringify({ message }),
      { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[recovery-message]', msg)

    // Fallback — never return empty on error
    const fallbacks = [
      "Welcome back — you showed up, and that's what matters. Let's start with just one small thing.",
      "Good to see you again. Pick anything from your list and begin — even 5 minutes counts.",
      "You're here, and that's the hardest part. Let's find one thing that feels doable right now.",
    ]
    const message = fallbacks[Math.floor(Math.random() * fallbacks.length)]

    return new Response(
      JSON.stringify({ message }),
      { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } }
    )
  }
})
