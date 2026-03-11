// ── classify-voice-input Edge Function ────────────────────────────────────────
// POST /functions/v1/classify-voice-input
// Body: { text: string, language: string }
// Returns: ClassifyResult JSON (see type below)
//
// Auth: JWT required — guest tokens accepted
// AI: Google Gemini 2.5 Flash

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'

const GEMINI_MODEL = 'gemini-2.5-flash'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`
const API_TIMEOUT_MS = 12_000

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }

  try {
    // ── Auth (permissive — accepts guest JWTs) ─────────────────────────────────
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    // Allow guest mode — no hard auth block (classify is lightweight + low cost)

    const { text, language } = await req.json() as { text: string; language?: string }

    if (!text?.trim()) {
      return new Response(
        JSON.stringify({ error: 'text is required' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
      )
    }

    const today = new Date().toISOString().slice(0, 10)
    const currentTime = new Date().toTimeString().slice(0, 5)
    const lang = language ?? 'en'

    const prompt = `You are an ADHD productivity assistant. The user just dictated something via voice in ${lang}.
Classify it and extract structured data.
Input: "${text.trim().slice(0, 400)}"
Today is ${today}. Current time is ${currentTime}.

Respond ONLY with valid JSON (no markdown fences):
{
  "type": "task",
  "title": "clean title (max 60 chars, action verb first for tasks)",
  "pool": "now",
  "difficulty": 2,
  "estimatedMinutes": 25,
  "dueDate": null,
  "dueTime": null,
  "reminderMinutesBefore": null,
  "notes": null
}

Rules:
- "type" must be exactly one of: "task", "idea", "reminder"
- "task": actionable, has a verb, something to DO
- "idea": insight, thought, "what if", "maybe I should", brain dump
- "reminder": has explicit time/date ("tomorrow", "at 3pm", "on Friday", "next week")
- For "idea": pool="someday", difficulty=1, estimatedMinutes=5
- For "reminder": pool="next", always extract dueDate/dueTime if mentioned
- "pool" must be exactly one of: "now", "next", "someday"
- "difficulty" must be exactly 1, 2, or 3
- "estimatedMinutes" must be a positive integer
- "dueDate" format: "YYYY-MM-DD" or null
- "dueTime" format: "HH:MM" (24h) or null
- "reminderMinutesBefore" must be one of: 15, 30, 60, 1440, or null
- Title: be concise, ADHD users need clear short titles
- Respond with ONLY the JSON object, nothing else`

    const apiKey = Deno.env.get('GEMINI_API_KEY')!
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS)

    const geminiResp = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 256, temperature: 0.3 },
      }),
    })

    clearTimeout(timeoutId)

    if (!geminiResp.ok) throw new Error(`Gemini API error: ${geminiResp.status}`)

    const geminiData = await geminiResp.json() as {
      candidates: { content: { parts: { text: string }[] } }[]
    }

    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    const jsonText = rawText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim()

    let parsed: {
      type: string
      title: string
      pool: string
      difficulty: number
      estimatedMinutes: number
      dueDate: string | null
      dueTime: string | null
      reminderMinutesBefore: number | null
      notes: string | null
    }

    try {
      parsed = JSON.parse(jsonText)
    } catch {
      // Fallback: return the raw text as a plain task
      return new Response(
        JSON.stringify({
          type: 'task',
          title: text.trim().slice(0, 60),
          pool: 'now',
          difficulty: 2,
          estimatedMinutes: 25,
          dueDate: null,
          dueTime: null,
          reminderMinutesBefore: null,
          notes: null,
        }),
        { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } }
      )
    }

    // Validate and sanitize
    const validTypes = ['task', 'idea', 'reminder']
    const validPools = ['now', 'next', 'someday']
    const result = {
      type: validTypes.includes(parsed.type) ? parsed.type : 'task',
      title: String(parsed.title ?? text).slice(0, 60),
      pool: validPools.includes(parsed.pool) ? parsed.pool : 'now',
      difficulty: [1, 2, 3].includes(Number(parsed.difficulty)) ? Number(parsed.difficulty) : 2,
      estimatedMinutes: Math.max(1, Math.min(480, Number(parsed.estimatedMinutes) || 25)),
      dueDate: typeof parsed.dueDate === 'string' ? parsed.dueDate : null,
      dueTime: typeof parsed.dueTime === 'string' ? parsed.dueTime : null,
      reminderMinutesBefore: parsed.reminderMinutesBefore ?? null,
      notes: parsed.notes ?? null,
    }

    console.log('[classify-voice-input]', user?.id ?? 'guest', '->', result.type, result.title)

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[classify-voice-input]', msg)
    return new Response(
      JSON.stringify({ error: 'Classification failed' }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
    )
  }
})
