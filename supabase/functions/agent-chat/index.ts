// agent-chat — edge function
// POST /functions/v1/agent-chat
// Body: { agentSlug: string, message: string, history?: ChatMessage[] }
// Returns: { reply: string, agentState: string, provider: string }
// Auth: JWT required
// Rate limit: 20/day FREE, unlimited PRO
//
// Model routing (tier-based, free APIs, fallback chain):
//   FREE:  Gemini 2.5 Flash → OpenRouter Gemma-2-27b
//   PRO:   Groq llama-3.3-70b → NVIDIA llama-3.3-70b → Gemini
//   ELITE: NVIDIA Nemotron-253B → Groq llama-3.3-70b → Gemini

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'
import { checkDbRateLimit } from '../_shared/rateLimit.ts'
import { callLLM, type AgentTier, type LLMMessage } from '../_shared/llm.ts'
import { trace } from '../_shared/langfuse.ts'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const FALLBACK_BY_SLUG: Record<string, string> = {
  mochi:      "I'm here with you. What's on your mind?",
  guardian:   'Security first. Tell me what you need.',
  strategist: "Let's think this through. What's the goal?",
  coach:      'Every step forward counts. What would help right now?',
  scout:      'Spotted something interesting? Tell me more.',
}
const DEFAULT_FALLBACK = "I'm listening. Go ahead."

function buildSystemPrompt(personality: Record<string, string>, displayName: string): string {
  return [
    `You are ${displayName} in the MindShift ADHD productivity app.`,
    `Tone: ${personality.tone ?? 'warm and supportive'}.`,
    `Specialty: ${personality.specialty ?? 'general support'}.`,
    personality.catchphrase ? `Your catchphrase: "${personality.catchphrase}".` : '',
    'Keep replies concise — 1-3 sentences.',
    'Never give medical advice. Never shame or pressure the user.',
    'You are a companion, not a coach or therapist. Respond in the user\'s language.',
  ].filter(Boolean).join(' ')
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
      return new Response(JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    // Parse + validate body
    let body: unknown
    try { body = await req.json() }
    catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    const { agentSlug, message, history } = body as {
      agentSlug?: unknown; message?: unknown; history?: unknown
    }

    if (typeof agentSlug !== 'string' || !agentSlug.trim()) {
      return new Response(JSON.stringify({ error: 'agentSlug must be a non-empty string' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } })
    }
    if (typeof message !== 'string' || !message.trim()) {
      return new Response(JSON.stringify({ error: 'message must be a non-empty string' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    // Sanitize history — last 10 turns, validated shape
    const safeHistory: ChatMessage[] = Array.isArray(history)
      ? (history as unknown[])
          .filter((m): m is ChatMessage => {
            if (typeof m !== 'object' || m === null) return false
            const r = (m as Record<string, unknown>).role
            const c = (m as Record<string, unknown>).content
            return (r === 'user' || r === 'assistant') && typeof c === 'string'
          })
          .slice(-10)
      : []

    // Rate limit: 20/day
    const { allowed } = await checkDbRateLimit(supabase, user.id, false, {
      fnName: 'agent-chat', limitFree: 20, windowMs: 86_400_000,
    })
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Daily chat limit reached. Resets at midnight.' }),
        { status: 429, headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    // Fetch agent
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('slug, display_name, tier, state, personality')
      .eq('slug', agentSlug.trim())
      .single()

    if (agentError || !agent) {
      return new Response(JSON.stringify({ error: 'Agent not found' }),
        { status: 404, headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    const personality   = agent.personality as Record<string, string>
    const systemPrompt  = buildSystemPrompt(personality, agent.display_name)
    const fallback      = FALLBACK_BY_SLUG[agent.slug] ?? DEFAULT_FALLBACK
    const agentTier     = (agent.tier as AgentTier) ?? 'FREE'

    // Build messages for LLM
    const llmMessages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      ...safeHistory,
      { role: 'user', content: message.trim() },
    ]

    // Call LLM with tier-based fallback chain
    let reply    = fallback
    let provider = 'fallback'
    let llmResult: Awaited<ReturnType<typeof callLLM>> | null = null

    try {
      llmResult = await callLLM({ tier: agentTier, messages: llmMessages, maxTokens: 250, temperature: 0.8 })
      reply    = llmResult.text || fallback
      provider = llmResult.provider
    } catch (err) {
      console.error('[agent-chat] all providers failed:', err instanceof Error ? err.message : err)
      // Langfuse: log failure
      trace({
        fnName: 'agent-chat', userId: user.id,
        model: 'all-failed', provider: 'none',
        latencyMs: 0, success: false,
        error: err instanceof Error ? err.message : 'all providers failed',
        metadata: { agentSlug: agent.slug, tier: agentTier },
      })
    }

    // Langfuse: log success
    if (llmResult) {
      trace({
        fnName: 'agent-chat', userId: user.id,
        model: llmResult.model, provider: llmResult.provider,
        latencyMs: llmResult.latencyMs,
        inputTokens: llmResult.inputTokens,
        outputTokens: llmResult.outputTokens,
        success: true,
        metadata: { agentSlug: agent.slug, tier: agentTier },
      })
    }

    return new Response(
      JSON.stringify({ reply, agentState: agent.state, provider }),
      { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
    )

  } catch (err) {
    console.error('[agent-chat]', err instanceof Error ? err.message : err)
    return new Response(JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } })
  }
})
