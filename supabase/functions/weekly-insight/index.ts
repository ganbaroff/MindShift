// ── weekly-insight Edge Function ───────────────────────────────────────────────
// POST /functions/v1/weekly-insight
// Body: {
//   totalSessions: number,
//   avgDurationMinutes: number,
//   tasksCompleted: number,
//   mostUsedPreset: string | null,
//   peakHour: number | null,       // 0-23
//   activeDays: number,            // 0-7
//   energyTrend: 'improving' | 'stable' | 'declining' | null
// }
// Returns: { insights: string[] }  — exactly 3 personalized insights
// Auth: JWT required
// Rate limit: 3 calls/day per user (free), unlimited (pro) — DB-backed
// AI: Google Gemini 2.5 Flash

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'
import { checkDbRateLimit } from '../_shared/rateLimit.ts'

const GEMINI_MODEL = 'gemini-2.5-flash'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`
const API_TIMEOUT_MS = 15_000 // 15s timeout

const PRESET_NAMES: Record<string, string> = {
  brown:  'brown noise (Deep Focus)',
  pink:   'pink noise (Light Masking)',
  nature: 'nature sounds (Nature Restore)',
  lofi:   'lo-fi (Flow State)',
}

function hourLabel(h: number): string {
  if (h < 6)  return 'late night'
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  if (h < 21) return 'evening'
  return 'night'
}

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

    // ── Rate limit (DB-backed — 3/day free, unlimited pro) ────────────────────
    const { data: userRow } = await supabase
      .from('users')
      .select('subscription_tier')
      .eq('id', user.id)
      .single()

    const isPro = userRow?.subscription_tier === 'pro' ||
      userRow?.subscription_tier === 'pro_trial'

    const rl = await checkDbRateLimit(supabase, user.id, isPro, {
      fnName:    'weekly-insight',
      limitFree: 3,
      windowMs:  86_400_000, // 3 calls per day
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

    // ── Input (with bounds validation) ──────────────────────────────────────────
    const raw = await req.json() as Record<string, unknown>

    // Coerce + bound all numeric inputs to prevent abuse
    const totalSessions    = Math.min(9999, Math.max(0, Math.floor(Number(raw.totalSessions ?? 0))))
    const avgDurationMinutes = Math.min(600, Math.max(0, Number(raw.avgDurationMinutes ?? 0)))
    const tasksCompleted   = Math.min(9999, Math.max(0, Math.floor(Number(raw.tasksCompleted ?? 0))))
    const activeDays       = Math.min(7, Math.max(0, Math.floor(Number(raw.activeDays ?? 0))))
    const peakHour         = raw.peakHour != null ? Math.min(23, Math.max(0, Math.floor(Number(raw.peakHour)))) : null
    const mostUsedPreset   = typeof raw.mostUsedPreset === 'string' ? raw.mostUsedPreset.slice(0, 50) : null
    const energyTrend      = ['improving', 'stable', 'declining'].includes(raw.energyTrend as string)
      ? (raw.energyTrend as 'improving' | 'stable' | 'declining')
      : null
    const targetLocale     = typeof raw.locale === 'string' ? raw.locale.slice(0, 10) : 'en'

    // ── Build context ──────────────────────────────────────────────────────────
    const stats = [
      `Sessions this week: ${totalSessions}`,
      `Average session length: ${Math.round(avgDurationMinutes)} minutes`,
      `Tasks completed: ${tasksCompleted}`,
      `Active days: ${activeDays}/7`,
      mostUsedPreset ? `Most-used sound: ${PRESET_NAMES[mostUsedPreset] ?? mostUsedPreset}` : null,
      peakHour !== null ? `Peak focus time: ${hourLabel(peakHour)} (around ${peakHour}:00)` : null,
      energyTrend ? `Energy trend: ${energyTrend}` : null,
    ].filter(Boolean).join('\n')

    const prompt = `You are an ADHD-aware productivity coach writing a weekly insight summary.

User's week data:
${stats}

Write exactly 3 short insights. Rules:
- Each insight is 1-2 sentences maximum
- ADHD-safe framing: celebrate what happened, no shame about what didn't
- Reference the actual data (sessions, times, sounds) — be specific and personal
- Actionable where possible — suggest one small thing to try next week
- Varied tone: one observation, one celebration, one suggestion
- No bullet points, no numbering — just 3 plain text sentences separated by newlines
- IMPORTANT: Respond in the language with BCP-47 code "${targetLocale}". If unsure, use English.

Respond ONLY with the 3 insights, one per line. No headers, no JSON, no extra text.`

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
          maxOutputTokens: 300,
          temperature: 0.8,
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

    const rawText  = (geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim()
    const insights = rawText.split('\n').map(s => s.trim()).filter(Boolean).slice(0, 3)

    if (insights.length === 0) throw new Error('Empty insights from Gemini')

    return new Response(
      JSON.stringify({ insights }),
      { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[weekly-insight]', msg)

    // Fallback insights — generic but ADHD-safe
    return new Response(
      JSON.stringify({
        insights: [
          'Every session you showed up for counts — even the short ones add up over time.',
          'Your brain works in cycles, not streaks. This week was data, not a grade.',
          'Try picking your hardest task right after your first focus session next week.',
        ],
      }),
      { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } }
    )
  }
})
