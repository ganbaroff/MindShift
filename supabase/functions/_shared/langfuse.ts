/**
 * _shared/langfuse.ts — LLM observability via Langfuse REST API
 *
 * Fire-and-forget: never blocks the main response.
 * 50K events/month free tier.
 * Dashboard: https://cloud.langfuse.com
 *
 * Tracks: model, provider, latency, token usage, success/fail, fn name.
 */

const LANGFUSE_HOST       = 'https://cloud.langfuse.com'
const LANGFUSE_PUBLIC_KEY = Deno.env.get('LANGFUSE_PUBLIC_KEY') ?? ''
const LANGFUSE_SECRET_KEY = Deno.env.get('LANGFUSE_SECRET_KEY') ?? ''

function isConfigured(): boolean {
  return LANGFUSE_PUBLIC_KEY.length > 0 && LANGFUSE_SECRET_KEY.length > 0
}

function authHeader(): string {
  return `Basic ${btoa(`${LANGFUSE_PUBLIC_KEY}:${LANGFUSE_SECRET_KEY}`)}`
}

export interface LangfuseTrace {
  fnName:       string            // edge function name e.g. 'agent-chat'
  userId?:      string
  model:        string
  provider:     string
  inputTokens?: number
  outputTokens?: number
  latencyMs:    number
  success:      boolean
  error?:       string
  metadata?:    Record<string, unknown>
}

/**
 * Send a generation trace to Langfuse. Best-effort, fire-and-forget.
 * Never throws.
 */
export function trace(data: LangfuseTrace): void {
  if (!isConfigured()) return

  const traceId      = crypto.randomUUID()
  const generationId = crypto.randomUUID()
  const now          = new Date().toISOString()

  // Build Langfuse batch event (SDK-compatible schema)
  const batch = [
    {
      id:        traceId,
      type:      'trace-create',
      timestamp: now,
      body: {
        id:       traceId,
        name:     data.fnName,
        userId:   data.userId,
        metadata: data.metadata ?? {},
        tags:     [data.provider, data.success ? 'success' : 'fail'],
      },
    },
    {
      id:        generationId,
      type:      'generation-create',
      timestamp: now,
      body: {
        id:          generationId,
        traceId,
        name:        `${data.fnName}/${data.model}`,
        model:       data.model,
        startTime:   new Date(Date.now() - data.latencyMs).toISOString(),
        endTime:     now,
        latency:     data.latencyMs / 1000,
        usage: {
          input:  data.inputTokens  ?? 0,
          output: data.outputTokens ?? 0,
          total:  (data.inputTokens ?? 0) + (data.outputTokens ?? 0),
        },
        statusMessage: data.error,
        level:         data.success ? 'DEFAULT' : 'ERROR',
        metadata:      data.metadata ?? {},
      },
    },
  ]

  // Best-effort — don't await, don't catch
  fetch(`${LANGFUSE_HOST}/api/public/ingestion`, {
    method:  'POST',
    headers: {
      'Authorization': authHeader(),
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({ batch }),
  }).catch(() => { /* silently drop */ })
}
