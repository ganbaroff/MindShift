// agent-chat — edge function
// POST /functions/v1/agent-chat
// Body: { agentSlug: string, message: string, history?: ChatMessage[] }
// Returns: { reply: string, agentState: string }
// Auth: JWT required
// Rate limit: 20/day FREE, unlimited PRO
// PRO agents → Groq llama-3.3-70b-versatile
// FREE agents → Gemini 2.5 Flash
// 8s timeout, hardcoded fallback per agent

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'
import { checkDbRateLimit } from '../_shared/rateLimit.ts'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const API_TIMEOUT_MS = 8_000

const FALLBACK_BY_SLUG: Record<string, string> = {
  mochi:      "I'm here with you. What's on your mind?",
  guardian:   'Security first. Tell me what you need.',
  strategist: "Let's think through this. What's the goal?",
  coach:      'Every step forward counts. What would help right now?',
  scout:      'Spotted something interesting? Tell me more.',
}
const DEFAULT_FALLBACK = "I'm listening. Go ahead."

function buildSystemPrompt(personality: Record<string, string>): string {
  return [
    `You are ${personality.display_name ?? 'an AI companion'} in the MindShift ADHD productivity app.`,
    `Tone: ${personality.tone ?? 'warm and supportive'}.`,
    `Specialty: ${personality.specialty ?? 'general support'}.`,
    personality.catchphrase ? `Your catchphrase: "${personality.catchphrase}".` : '',
    'Keep replies concise — 1-3 sentences. Never give medical advice. Never shame or pressure the user.',
    'You are a companion, not a coach or therapist. Respond in the user\'s language.',
  ].filter(Boolean).join(' ')
}

// Convert OpenAI-style history → Gemini contents format
function toGeminiContents(history: ChatMessage[], userMessage: string) {
  const contents = history.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))
  contents.push({ role: 'user', parts: [{ text: userMessage }] })
  return contents
}

async function callGroq(
  systemPrompt: string,
  history: ChatMessage[],
  userMessage: string,
  signal: AbortSignal,
): Promise<string> {
  const apiKey = Deno.env.get('GROQ_API_KEY')
  if (!apiKey) throw new Error('GROQ_API_KEY not configured')

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: userMessage },
  ]

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model:       'llama-3.3-70b-versatile',
      messages,
      max_tokens:  250,
      temperature: 0.8,
    }),
    signal,
  })

  if (!res.ok) throw new Error(`Groq ${res.status}`)
  const json = await res.json() as { choices: { message: { content: string } }[] }
  return json.choices[0]?.message?.content?.trim() ?? ''
}

async function callGemini(
  systemPrompt: string,
  history: ChatMessage[],
  userMessage: string,
  signal: AbortSignal,
): Promise<string> {
  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: toGeminiContents(history, userMessage),
      generationConfig: { maxOutputTokens: 250, temperature: 0.8 },
    }),
    signal,
  })

  if (!res.ok) throw new Error(`Gemini ${res.status}`)
  const json = await res.json() as { candidates: { content: { parts: { text: string }[] } }[] }
  return json.candidates[0]?.content?.parts[0]?.text?.trim() ?? ''
}

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } },
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    // Parse + validate body
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }
    const { agentSlug, message, history } = body as {
      agentSlug?: unknown; message?: unknown; history?: unknown
    }

    if (typeof agentSlug !== 'string' || !agentSlug.trim()) {
      return new Response(
        JSON.stringify({ error: 'agentSlug must be a non-empty string' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }
    if (typeof message !== 'string' || !message.trim()) {
      return new Response(
        JSON.stringify({ error: 'message must be a non-empty string' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    // Sanitize history — take last 10 turns, validate shape
    const safeHistory: ChatMessage[] = Array.isArray(history)
      ? (history as unknown[])
          .filter((m): m is ChatMessage =>
            typeof m === 'object' && m !== null &&
            (m as Record<string, unknown>).role === 'user' || (m as Record<string, unknown>).role === 'assistant' &&
            typeof (m as Record<string, unknown>).content === 'string',
          )
          .slice(-10)
      : []

    // Rate limit: 20/day free
    const { allowed } = await checkDbRateLimit(supabase, user.id, false, {
      fnName:    'agent-chat',
      limitFree: 20,
      windowMs:  86_400_000, // 24h
    })
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: 'Daily chat limit reached. Resets at midnight.' }),
        { status: 429, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    // Fetch agent from DB
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('slug, display_name, tier, state, personality')
      .eq('slug', agentSlug.trim())
      .single()

    if (agentError || !agent) {
      return new Response(
        JSON.stringify({ error: 'Agent not found' }),
        { status: 404, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    const personality = {
      display_name: agent.display_name,
      ...(agent.personality as Record<string, string>),
    }
    const systemPrompt = buildSystemPrompt(personality)
    const fallback = FALLBACK_BY_SLUG[agent.slug] ?? DEFAULT_FALLBACK

    // Call AI — PRO agent → Groq, FREE → Gemini, fallback on any error
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS)

    let reply = fallback
    try {
      if (agent.tier === 'PRO') {
        reply = await callGroq(systemPrompt, safeHistory, message.trim(), controller.signal)
      } else {
        reply = await callGemini(systemPrompt, safeHistory, message.trim(), controller.signal)
      }
      // If AI returned empty string, fall back
      if (!reply) reply = fallback
    } catch {
      reply = fallback
    } finally {
      clearTimeout(timer)
    }

    return new Response(
      JSON.stringify({ reply, agentState: agent.state }),
      { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
    )

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[agent-chat]', msg)
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }
})
