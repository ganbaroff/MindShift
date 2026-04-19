/**
 * _shared/llm.ts — unified multi-provider LLM router
 *
 * Two routing axes (see docs/ROUTER-CONTRACT.md):
 *   1. llm_policy (per-agent): ultra_fast | balanced | max_quality
 *   2. subscription_tier (per-user): free | pro_trial | pro  — budget cap
 *
 * Policy chains (empirical data from packages/swarm/discovered_models.json):
 *   ultra_fast: Groq 8B (295ms) → Groq Llama4-Scout (299ms) → Gemini Flash Lite (590ms)
 *   balanced:   Groq 70B (354ms) → Gemini 2.5 Flash (800ms) → OpenRouter Gemma-2-27b
 *   max_quality: NVIDIA Nemotron → Groq Kimi-K2 (1883ms) → DeepSeek → Groq 70B → Gemini
 *
 * Legacy tier-based CHAINS kept for backwards compat (agent-chat pre-migration).
 * All providers except Gemini use OpenAI-compatible format.
 */

export type AgentTier        = 'FREE' | 'PRO' | 'ELITE'
export type LLMPolicy        = 'ultra_fast' | 'balanced' | 'max_quality'
export type UserSubscription = 'free' | 'pro_trial' | 'pro'

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LLMResult {
  text: string
  model: string
  provider: string
  latencyMs: number
  inputTokens?: number
  outputTokens?: number
}

interface OpenAICompatConfig {
  baseUrl: string
  apiKey: string
  model: string
  extraHeaders?: Record<string, string>
}

// ── Provider definitions ────────────────────────────────────────────────────

function resolveKey(envVar: string): string | undefined {
  return Deno.env.get(envVar)
}

const CHAINS: Record<AgentTier, Array<() => ProviderDef | null>> = {
  FREE: [
    () => {
      const key = resolveKey('GEMINI_API_KEY')
      return key ? { type: 'gemini', key, model: 'gemini-2.5-flash', provider: 'Gemini' } : null
    },
    () => {
      const key = resolveKey('OPENROUTER_API_KEY')
      return key ? {
        type: 'openai_compat',
        baseUrl: 'https://openrouter.ai/api/v1',
        key,
        model: 'google/gemma-2-27b-it:free',
        provider: 'OpenRouter/Gemma2',
        extraHeaders: { 'HTTP-Referer': 'https://mindshift.app', 'X-Title': 'MindShift' },
      } : null
    },
  ],
  PRO: [
    () => {
      const key = resolveKey('GROQ_API_KEY')
      return key ? {
        type: 'openai_compat',
        baseUrl: 'https://api.groq.com/openai/v1',
        key,
        model: 'llama-3.3-70b-versatile',
        provider: 'Groq/Llama70B',
      } : null
    },
    () => {
      const key = resolveKey('NVIDIA_API_KEY')
      return key ? {
        type: 'openai_compat',
        baseUrl: 'https://integrate.api.nvidia.com/v1',
        key,
        model: 'meta/llama-3.3-70b-instruct',
        provider: 'NVIDIA/Llama70B',
      } : null
    },
    () => {
      const key = resolveKey('GEMINI_API_KEY')
      return key ? { type: 'gemini', key, model: 'gemini-2.5-flash', provider: 'Gemini' } : null
    },
  ],
  ELITE: [
    () => {
      const key = resolveKey('NVIDIA_API_KEY')
      return key ? {
        type: 'openai_compat',
        baseUrl: 'https://integrate.api.nvidia.com/v1',
        key,
        model: 'nvidia/nemotron-ultra-253b-v1',
        provider: 'NVIDIA/Nemotron253B',
      } : null
    },
    () => {
      const key = resolveKey('GROQ_API_KEY')
      return key ? {
        type: 'openai_compat',
        baseUrl: 'https://api.groq.com/openai/v1',
        key,
        model: 'llama-3.3-70b-versatile',
        provider: 'Groq/Llama70B',
      } : null
    },
    () => {
      const key = resolveKey('GEMINI_API_KEY')
      return key ? { type: 'gemini', key, model: 'gemini-2.5-flash', provider: 'Gemini' } : null
    },
  ],
}

type ProviderDef =
  | { type: 'gemini'; key: string; model: string; provider: string }
  | { type: 'openai_compat'; baseUrl: string; key: string; model: string; provider: string; extraHeaders?: Record<string, string> }

// ── Policy-based chains (agent declares quality requirement) ─────────────────
// Source: packages/swarm/discovered_models.json — empirical latency measurements.
// Swarm can propose updates via proposals.json (see docs/ROUTER-CONTRACT.md).

const POLICY_CHAINS: Record<LLMPolicy, Array<() => ProviderDef | null>> = {
  // ultra_fast: warm companions, mascots — sub-400ms target
  ultra_fast: [
    () => {
      const key = resolveKey('GROQ_API_KEY')
      return key ? {
        type: 'openai_compat', baseUrl: 'https://api.groq.com/openai/v1',
        key, model: 'llama-3.1-8b-instant', provider: 'Groq/Llama8B',
      } : null
    },
    () => {
      const key = resolveKey('GROQ_API_KEY')
      return key ? {
        type: 'openai_compat', baseUrl: 'https://api.groq.com/openai/v1',
        key, model: 'meta-llama/llama-4-scout-17b-16e-instruct', provider: 'Groq/Llama4Scout',
      } : null
    },
    () => {
      const key = resolveKey('GEMINI_API_KEY')
      return key ? { type: 'gemini', key, model: 'gemini-flash-lite-latest', provider: 'Gemini/FlashLite' } : null
    },
  ],
  // balanced: analysis, security, productivity — quality + speed
  balanced: [
    () => {
      const key = resolveKey('GROQ_API_KEY')
      return key ? {
        type: 'openai_compat', baseUrl: 'https://api.groq.com/openai/v1',
        key, model: 'llama-3.3-70b-versatile', provider: 'Groq/Llama70B',
      } : null
    },
    () => {
      const key = resolveKey('GEMINI_API_KEY')
      return key ? { type: 'gemini', key, model: 'gemini-2.5-flash', provider: 'Gemini/Flash' } : null
    },
    () => {
      const key = resolveKey('OPENROUTER_API_KEY')
      return key ? {
        type: 'openai_compat', baseUrl: 'https://openrouter.ai/api/v1',
        key, model: 'google/gemma-2-27b-it:free', provider: 'OpenRouter/Gemma2',
        extraHeaders: { 'HTTP-Referer': 'https://mindshift.app', 'X-Title': 'MindShift' },
      } : null
    },
  ],
  // max_quality: reasoning, economy-admin, elite agents — best available
  max_quality: [
    () => {
      const key = resolveKey('NVIDIA_API_KEY')
      return key ? {
        type: 'openai_compat', baseUrl: 'https://integrate.api.nvidia.com/v1',
        key, model: 'nvidia/nemotron-ultra-253b-v1', provider: 'NVIDIA/Nemotron253B',
      } : null
    },
    () => {
      const key = resolveKey('GROQ_API_KEY')
      return key ? {
        type: 'openai_compat', baseUrl: 'https://api.groq.com/openai/v1',
        key, model: 'moonshotai/kimi-k2-instruct', provider: 'Groq/KimiK2',
      } : null
    },
    () => {
      const key = resolveKey('DEEPSEEK_API_KEY')
      return key ? {
        type: 'openai_compat', baseUrl: 'https://api.deepseek.com',
        key, model: 'deepseek-chat', provider: 'DeepSeek/Chat',
      } : null
    },
    () => {
      const key = resolveKey('GROQ_API_KEY')
      return key ? {
        type: 'openai_compat', baseUrl: 'https://api.groq.com/openai/v1',
        key, model: 'llama-3.3-70b-versatile', provider: 'Groq/Llama70B',
      } : null
    },
    () => {
      const key = resolveKey('GEMINI_API_KEY')
      return key ? { type: 'gemini', key, model: 'gemini-2.5-flash', provider: 'Gemini/Flash' } : null
    },
  ],
}

/**
 * Resolve a provider chain from agent policy + user subscription tier.
 * User tier acts as a budget cap: free users can't trigger max_quality.
 */
export function resolveChain(
  policy: LLMPolicy,
  userTier: UserSubscription = 'free',
): Array<() => ProviderDef | null> {
  const effectivePolicy = (userTier === 'free' && policy === 'max_quality')
    ? 'balanced'
    : policy
  return POLICY_CHAINS[effectivePolicy]
}

// ── OpenAI-compatible call (Groq / NVIDIA NIM / OpenRouter / Cerebras) ─────

async function callOpenAICompat(
  cfg: { baseUrl: string; key: string; model: string; extraHeaders?: Record<string, string> },
  messages: LLMMessage[],
  maxTokens: number,
  temperature: number,
  signal: AbortSignal,
): Promise<{ text: string; inputTokens?: number; outputTokens?: number }> {
  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${cfg.key}`,
      'Content-Type': 'application/json',
      ...cfg.extraHeaders,
    },
    body: JSON.stringify({ model: cfg.model, messages, max_tokens: maxTokens, temperature }),
    signal,
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`${res.status}: ${body.slice(0, 200)}`)
  }

  const json = await res.json() as {
    choices: { message: { content: string } }[]
    usage?: { prompt_tokens: number; completion_tokens: number }
  }

  return {
    text:         json.choices[0]?.message?.content?.trim() ?? '',
    inputTokens:  json.usage?.prompt_tokens,
    outputTokens: json.usage?.completion_tokens,
  }
}

// ── Gemini call ──────────────────────────────────────────────────────────────

async function callGemini(
  key: string,
  model: string,
  messages: LLMMessage[],
  maxTokens: number,
  temperature: number,
  signal: AbortSignal,
): Promise<{ text: string; inputTokens?: number; outputTokens?: number }> {
  const systemParts = messages.filter(m => m.role === 'system').map(m => ({ text: m.content }))
  const contents    = messages.filter(m => m.role !== 'system').map(m => ({
    role:  m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: systemParts.length ? { parts: systemParts } : undefined,
      contents,
      generationConfig: { maxOutputTokens: maxTokens, temperature },
    }),
    signal,
  })

  if (!res.ok) throw new Error(`Gemini ${res.status}`)

  const json = await res.json() as {
    candidates: { content: { parts: { text: string }[] } }[]
    usageMetadata?: { promptTokenCount: number; candidatesTokenCount: number }
  }

  return {
    text:         json.candidates[0]?.content?.parts[0]?.text?.trim() ?? '',
    inputTokens:  json.usageMetadata?.promptTokenCount,
    outputTokens: json.usageMetadata?.candidatesTokenCount,
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

export interface LLMCallOptions {
  // Policy-based routing (preferred, post-migration 022)
  policy?: LLMPolicy
  userTier?: UserSubscription
  // Legacy tier-based routing (kept for backwards compat)
  tier?: AgentTier
  // Common
  messages: LLMMessage[]
  maxTokens?: number
  temperature?: number
  timeoutMs?: number
}

/**
 * Call LLM using policy+userTier routing (preferred) or legacy tier routing.
 * Tries providers in chain order until one succeeds.
 * Throws if all providers fail.
 */
export async function callLLM(opts: LLMCallOptions): Promise<LLMResult> {
  const {
    policy,
    userTier  = 'free',
    tier,
    messages,
    maxTokens   = 250,
    temperature = 0.8,
    timeoutMs   = 8_000,
  } = opts

  // Policy-based routing takes precedence; fall back to legacy tier routing
  const chain = policy
    ? resolveChain(policy, userTier)
    : CHAINS[tier ?? 'FREE']
  const errors: string[] = []

  for (const resolve of chain) {
    const def = resolve()
    if (!def) continue  // key not configured — skip silently

    const controller = new AbortController()
    const timer      = setTimeout(() => controller.abort(), timeoutMs)
    const t0         = Date.now()

    try {
      let result: { text: string; inputTokens?: number; outputTokens?: number }

      if (def.type === 'gemini') {
        result = await callGemini(def.key, def.model, messages, maxTokens, temperature, controller.signal)
      } else {
        result = await callOpenAICompat(
          { baseUrl: def.baseUrl, key: def.key, model: def.model, extraHeaders: def.extraHeaders },
          messages, maxTokens, temperature, controller.signal,
        )
      }

      if (!result.text) throw new Error('empty response')

      return {
        text:        result.text,
        model:       def.model,
        provider:    def.provider,
        latencyMs:   Date.now() - t0,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
      }
    } catch (e) {
      errors.push(`${def.provider}: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      clearTimeout(timer)
    }
  }

  throw new Error(`All LLM providers failed for tier ${tier}: ${errors.join(' | ')}`)
}

/** Cerebras fast path — for mochi-respond only (ultra-low latency) */
export async function callCerebras(
  messages: LLMMessage[],
  maxTokens = 150,
  signal?: AbortSignal,
): Promise<string | null> {
  const key = resolveKey('CEREBRAS_API_KEY')
  if (!key) return null

  try {
    const res = await fetch('https://api.cerebras.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'qwen-3-235b', messages, max_tokens: maxTokens, temperature: 0.85 }),
      signal,
    })
    if (!res.ok) return null
    const json = await res.json() as { choices: { message: { content: string } }[] }
    return json.choices[0]?.message?.content?.trim() || null
  } catch {
    return null
  }
}
