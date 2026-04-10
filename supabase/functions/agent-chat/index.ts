// agent-chat — edge function
// POST /functions/v1/agent-chat
// Body: { agentSlug: string, message: string, history?: ChatMessage[] }
// Returns: { reply: string, agentState: string, provider: string }
// Auth: JWT required
// Rate limit: 20/day FREE, unlimited PRO
//
// Model routing (policy-based — see docs/ROUTER-CONTRACT.md):
//   agent.llm_policy + user.subscription_tier → resolveChain()
//   ultra_fast: Groq 8B (295ms) → Groq Llama4-Scout → Gemini Flash Lite
//   balanced:   Groq 70B (354ms) → Gemini 2.5 Flash → OpenRouter Gemma
//   max_quality: NVIDIA Nemotron → Groq Kimi-K2 → DeepSeek → Groq 70B → Gemini
//   free-tier cap: max_quality → balanced for free users

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'
import { checkDbRateLimit } from '../_shared/rateLimit.ts'
import { callLLM, type LLMPolicy, type UserSubscription, type LLMMessage } from '../_shared/llm.ts'
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

    // Fetch agent + user subscription tier in parallel
    const [agentResult, userResult] = await Promise.all([
      supabase
        .from('agents')
        .select('slug, display_name, tier, state, personality, llm_policy')
        .eq('slug', agentSlug.trim())
        .single(),
      supabase
        .from('users')
        .select('subscription_tier')
        .eq('id', user.id)
        .single(),
    ])

    if (agentResult.error || !agentResult.data) {
      return new Response(JSON.stringify({ error: 'Agent not found' }),
        { status: 404, headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    const agent    = agentResult.data
    const userTier = ((userResult.data?.subscription_tier ?? 'free') as UserSubscription)

    const personality  = agent.personality as Record<string, string>
    const systemPrompt = buildSystemPrompt(personality, agent.display_name)
    const fallback     = FALLBACK_BY_SLUG[agent.slug] ?? DEFAULT_FALLBACK
    const agentPolicy  = (agent.llm_policy as LLMPolicy | null) ?? 'balanced'

    // Build messages for LLM
    const llmMessages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      ...safeHistory,
      { role: 'user', content: message.trim() },
    ]

    // Call LLM — policy-based routing (agent declares quality, user tier caps it)
    let reply    = fallback
    let provider = 'fallback'
    let llmResult: Awaited<ReturnType<typeof callLLM>> | null = null

    try {
      llmResult = await callLLM({ policy: agentPolicy, userTier, messages: llmMessages, maxTokens: 250, temperature: 0.8 })
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
        metadata: { agentSlug: agent.slug, policy: agentPolicy, userTier },
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
        metadata: { agentSlug: agent.slug, policy: agentPolicy, userTier },
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
