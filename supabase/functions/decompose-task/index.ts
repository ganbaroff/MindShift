// ── decompose-task Edge Function ───────────────────────────────────────────────
// POST /functions/v1/decompose-task
// Body: { taskTitle: string, taskDescription?: string }
// Returns: { steps: string[], estimatedMinutes: number }
//
// Auth: JWT required — user must be signed in
// Rate limit: 20 calls/hour per user (free), unlimited (pro) — DB-backed
// AI: Google Gemini 2.5 Flash

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'
import { checkDbRateLimit } from '../_shared/rateLimit.ts'

const GEMINI_MODEL = 'gemini-2.5-flash'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`
const API_TIMEOUT_MS = 15_000 // 15s — fail fast, don't hang the user
const MAX_TITLE_LEN = 500
const MAX_DESC_LEN = 1000

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req)

  // CORS preflight
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

    // ── Rate limit (DB-backed — persists across cold starts + isolates) ─────────
    const { data: userRow } = await supabase
      .from('users')
      .select('subscription_tier')
      .eq('id', user.id)
      .single()

    const isPro = userRow?.subscription_tier === 'pro' ||
      userRow?.subscription_tier === 'pro_trial'

    const rl = await checkDbRateLimit(supabase, user.id, isPro, {
      fnName:    'decompose-task',
      limitFree: 20,
      windowMs:  3_600_000, // 20 calls per hour
    })

    if (!rl.allowed) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }),
        {
          status: 429,
          headers: {
            ...cors,
            'Content-Type': 'application/json',
            'Retry-After': String(rl.retryAfterSeconds ?? 3600),
          },
        }
      )
    }

    // ── Input (with size validation) ──────────────────────────────────────────
    const { taskTitle, taskDescription } = await req.json() as {
      taskTitle: string
      taskDescription?: string
    }

    if (!taskTitle?.trim()) {
      return new Response(
        JSON.stringify({ error: 'taskTitle is required' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
      )
    }

    if (taskTitle.length > MAX_TITLE_LEN) {
      return new Response(
        JSON.stringify({ error: `taskTitle must be under ${MAX_TITLE_LEN} characters` }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
      )
    }

    if (taskDescription && taskDescription.length > MAX_DESC_LEN) {
      return new Response(
        JSON.stringify({ error: `taskDescription must be under ${MAX_DESC_LEN} characters` }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
      )
    }

    // ── Gemini call (with AbortController timeout) ──────────────────────────
    const title = taskTitle.trim().slice(0, MAX_TITLE_LEN)
    const desc = taskDescription?.trim().slice(0, MAX_DESC_LEN)

    const prompt = `You are an ADHD task coach. Break this task into 3-5 concrete micro-steps, each under 10 minutes.
Each step must be specific and immediately actionable — no vague language.
Keep language warm and encouraging.

Task: "${title}"${desc ? `\nContext: "${desc}"` : ''}

Respond ONLY with valid JSON in this exact shape:
{
  "steps": ["step 1", "step 2", "step 3"],
  "estimatedMinutes": 25
}

No explanation, no markdown fences. Pure JSON only.`

    const apiKey = Deno.env.get('GEMINI_API_KEY')!
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS)

    const geminiResp = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 512,
          temperature: 0.7,
        },
      }),
    })

    clearTimeout(timeoutId)

    if (!geminiResp.ok) {
      throw new Error(`Gemini API error: ${geminiResp.status}`)
    }

    const geminiData = await geminiResp.json() as {
      candidates: { content: { parts: { text: string }[] } }[]
    }

    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

    // Defensive parse — strip any accidental markdown fences
    const jsonText = rawText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim()
    const parsed = JSON.parse(jsonText) as {
      steps: string[]
      estimatedMinutes: number
    }

    // Validate shape
    if (!Array.isArray(parsed.steps) || parsed.steps.length === 0) {
      throw new Error('Invalid steps array from Gemini')
    }

    return new Response(
      JSON.stringify({
        steps:            parsed.steps.slice(0, 5),
        estimatedMinutes: typeof parsed.estimatedMinutes === 'number'
          ? Math.min(120, Math.max(5, parsed.estimatedMinutes))
          : 25,
      }),
      { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[decompose-task]', msg)
    // Never leak internal details to client — log server-side only
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
    )
  }
})
