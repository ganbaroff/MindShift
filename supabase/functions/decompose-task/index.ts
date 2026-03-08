// ── decompose-task Edge Function ───────────────────────────────────────────────
// POST /functions/v1/decompose-task
// Body: { taskTitle: string, taskDescription?: string }
// Returns: { steps: string[], estimatedMinutes: number }
//
// Auth: JWT required — user must be signed in

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-5'

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
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
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── Input ──────────────────────────────────────────────────────────────────
    const { taskTitle, taskDescription } = await req.json() as {
      taskTitle: string
      taskDescription?: string
    }

    if (!taskTitle?.trim()) {
      return new Response(
        JSON.stringify({ error: 'taskTitle is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── Claude call ────────────────────────────────────────────────────────────
    const prompt = `You are an ADHD task coach. Break this task into 3-5 concrete micro-steps, each under 10 minutes.
Each step must be specific and immediately actionable — no vague language.
Keep language warm and encouraging.

Task: "${taskTitle}"${taskDescription ? `\nContext: "${taskDescription}"` : ''}

Respond ONLY with valid JSON in this exact shape:
{
  "steps": ["step 1", "step 2", "step 3"],
  "estimatedMinutes": 25
}

No explanation, no markdown fences. Pure JSON only.`

    const claudeResp = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!claudeResp.ok) {
      throw new Error(`Anthropic API error: ${claudeResp.status}`)
    }

    const claudeData = await claudeResp.json() as {
      content: { type: string; text: string }[]
    }

    const rawText = claudeData.content[0]?.text ?? ''

    // Defensive parse — strip any accidental markdown fences
    const jsonText = rawText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim()
    const parsed = JSON.parse(jsonText) as {
      steps: string[]
      estimatedMinutes: number
    }

    // Validate shape
    if (!Array.isArray(parsed.steps) || parsed.steps.length === 0) {
      throw new Error('Invalid steps array from Claude')
    }

    return new Response(
      JSON.stringify({
        steps:            parsed.steps.slice(0, 5),
        estimatedMinutes: typeof parsed.estimatedMinutes === 'number'
          ? Math.min(120, Math.max(5, parsed.estimatedMinutes))
          : 25,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[decompose-task]', msg)
    return new Response(
      JSON.stringify({ error: 'Internal error', details: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
