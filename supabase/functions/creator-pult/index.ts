// -- creator-pult Edge Function -------------------------------------------------
// POST /functions/v1/creator-pult?k=<PULT_URL_KEY>
//
// «Пульт v1» — the CEO's phone control panel for the media factory, driven from his
// Telegram bot @CreatorBy_bot. This function is a THIN dispatcher: it authenticates the
// webhook, answers instant commands (/start /help /status /whoami /stop), and for the
// heavy commands (/news /ladder /go) it ENQUEUES a row into public.pult_commands and
// replies immediately. The actual render (15-40 min) is done out-of-band by
// pult_worker.mjs (GitHub Actions poller). An edge function cannot render — 150s limit.
//
// -- AUTH (v1) ------------------------------------------------------------------
// We cannot set new Supabase secrets for this build, so instead of the usual
// X-Telegram-Bot-Api-Secret-Token header (which would need a new secret), auth is a
// URL query param `?k=<PULT_URL_KEY>` — a random constant compiled in below. Telegram
// is the only party that knows the URL (set once via setWebhook). This is v1 OBSCURITY,
// not real auth: anyone who learns the URL can enqueue commands. Mitigations:
//   * every command is idempotent / bounded (queue rows, no direct spend here);
//   * the worker's make/publish steps have their own hard gates (content_critic,
//     published.json idempotency);
//   * ALLOWED_CHAT_ID pins the CEO's chat once known (see below).
// v2 hardening: promote PULT_URL_KEY to a real Supabase secret + header check.
//
// -- INSTANT REPLIES (no bot token needed) --------------------------------------
// We answer the webhook HTTP request with JSON {method:'sendMessage', chat_id, text}.
// Telegram executes that method against the SAME update — so this function never needs
// the bot token. (Only pult_worker.mjs needs the token, to send video files back.)
//
// -- SETUP ----------------------------------------------------------------------
// 1. Deploy:   supabase functions deploy creator-pult --no-verify-jwt
//    (--no-verify-jwt: Telegram sends no Supabase JWT.)
// 2. Register: node tmp/kapibara/pult_setwebhook.mjs
//    (points Telegram at .../creator-pult?k=<PULT_URL_KEY>)
// 3. First use: CEO sends /whoami → reads his chat_id → we pin ALLOWED_CHAT_ID → redeploy.
//
// Uses the auto-injected SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (same as telegram-webhook).
// ---------------------------------------------------------------------------------

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// -- v1 URL obscurity key (see AUTH note). Random, compiled-in constant. ----------
// The webhook URL carries ?k=<this>. Telegram is the only holder of that URL.
const PULT_URL_KEY = 'HPKaWGb6sjdGIG-5c1NXtnMOP9NEXKmQ'

// -- Chat allowlist ---------------------------------------------------------------
// TODO(pin CEO id): set to the CEO's numeric chat_id once he runs /whoami. While this
// is 0, we ALLOW ALL senders but log each one (so a stranger who guesses the URL can
// enqueue — bounded by the worker's own gates, but pin this ASAP). When non-zero, only
// that chat_id may issue commands; everyone else gets a polite refusal.
const ALLOWED_CHAT_ID = 0

// -- Telegram types (minimal) -----------------------------------------------------

interface TgUpdate {
  update_id?: number
  message?: TgMessage
}

interface TgMessage {
  message_id: number
  from?: { id: number; first_name?: string; username?: string }
  chat: { id: number; type: string }
  text?: string
  date: number
}

// deno-lint-ignore no-explicit-any
type Sb = any

// -- Instant-reply helper ---------------------------------------------------------
// Returns a Response whose JSON body IS a Telegram method call. Telegram runs it.
function reply(chatId: number, text: string): Response {
  return new Response(
    JSON.stringify({ method: 'sendMessage', chat_id: chatId, text, parse_mode: 'HTML' }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
}

// Plain 200 with no side-effect (ignore this update).
function ok(): Response {
  return new Response('ok', { status: 200 })
}

const HELP = `🦫 <b>Пульт медиа-завода</b>

/news — сгенерить ролик «Капибара Новости» (превью придёт сюда, ~15-20 мин)
/ladder — сгенерить квиз-ролик «Лесенка»
/go — опубликовать последний прошедший гейты клип
/status — что в очереди (последние 5)
/stop — очистить очередь
/whoami — показать твой chat_id
/help — это меню

Рендер идёт в облаке (GitHub Actions, каждые 10 мин). Превью бросаю сюда, когда готово.`

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // -- AUTH: URL ?k= must equal the compiled key --------------------------------
  const url = new URL(req.url)
  if (url.searchParams.get('k') !== PULT_URL_KEY) {
    return new Response('Forbidden', { status: 403 })
  }

  let update: TgUpdate
  try {
    update = await req.json() as TgUpdate
  } catch {
    return ok()
  }

  const message = update.message
  // Only handle private-chat text messages. Ignore everything else silently.
  if (!message?.text || !message.from || message.chat.type !== 'private') {
    return ok()
  }

  const chatId = message.chat.id
  const text = message.text.trim()
  const cmd = text.split(/\s+/)[0].toLowerCase()

  // -- /whoami — always answered (this is how the CEO reads his id to pin it) ----
  if (cmd === '/whoami') {
    return reply(
      chatId,
      `Твой chat_id: <code>${chatId}</code>\n\nПришли его — впишу в ALLOWED_CHAT_ID, и Пульт станет только твой.`,
    )
  }

  // -- Chat allowlist gate ------------------------------------------------------
  if (ALLOWED_CHAT_ID !== 0 && chatId !== ALLOWED_CHAT_ID) {
    // Not the CEO. Refuse politely; do not enqueue anything.
    return reply(chatId, 'Этот пульт закреплён за владельцем. Доступа нет.')
  }
  if (ALLOWED_CHAT_ID === 0) {
    // v1: allow-all but log so a stray sender is visible in the function logs.
    console.warn(`[creator-pult] ALLOWED_CHAT_ID=0 (allow-all) — command "${cmd}" from chat_id=${chatId} (@${message.from.username ?? '?'})`)
  }

  // -- Instant, no-DB commands --------------------------------------------------
  if (cmd === '/start' || cmd === '/help') {
    return reply(chatId, HELP)
  }

  // -- DB-backed commands need the service-role client ---------------------------
  const supabase: Sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    // -- /status — last 5 queue rows -------------------------------------------
    if (cmd === '/status') {
      const { data, error } = await supabase
        .from('pult_commands')
        .select('cmd, args, status, result, created_at')
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) {
        console.error('[creator-pult] /status query error:', error.message)
        return reply(chatId, 'Не смог прочитать очередь. Попробуй ещё раз.')
      }
      if (!data || data.length === 0) {
        return reply(chatId, 'Очередь пуста. /news или /ladder — чтобы что-то запустить.')
      }

      const emoji: Record<string, string> = {
        pending: '⏳', processing: '⚙️', done: '✅', failed: '⚠️',
      }
      const lines = data.map((r: {
        cmd: string; args: { format?: string }; status: string; result: string | null; created_at: string
      }) => {
        const fmt = r.args?.format ? ` ${r.args.format}` : ''
        const when = new Date(r.created_at).toISOString().slice(5, 16).replace('T', ' ')
        const tail = r.result ? ` — ${String(r.result).slice(0, 60)}` : ''
        return `${emoji[r.status] ?? '•'} <code>${when}</code> ${r.cmd}${fmt} <i>(${r.status})</i>${tail}`
      })
      return reply(chatId, '<b>Очередь (последние 5):</b>\n' + lines.join('\n'))
    }

    // -- /news — enqueue a news render -----------------------------------------
    if (cmd === '/news') {
      const { error } = await supabase
        .from('pult_commands')
        .insert({ chat_id: chatId, cmd: 'make', args: { format: 'news' } })
      if (error) {
        console.error('[creator-pult] /news insert error:', error.message)
        return reply(chatId, 'Не смог поставить в очередь. Попробуй ещё раз.')
      }
      return reply(chatId, 'Принял. Рендерю новости — превью придёт сюда (~15-20 мин).')
    }

    // -- /ladder — enqueue a ladder (quiz) render ------------------------------
    if (cmd === '/ladder') {
      const { error } = await supabase
        .from('pult_commands')
        .insert({ chat_id: chatId, cmd: 'make', args: { format: 'ladder' } })
      if (error) {
        console.error('[creator-pult] /ladder insert error:', error.message)
        return reply(chatId, 'Не смог поставить в очередь. Попробуй ещё раз.')
      }
      return reply(chatId, 'Принял. Рендерю «Лесенку» — превью придёт сюда (~15-20 мин).')
    }

    // -- /go — enqueue a publish of the last gate-passed clip -------------------
    if (cmd === '/go') {
      const { error } = await supabase
        .from('pult_commands')
        .insert({ chat_id: chatId, cmd: 'publish', args: {} })
      if (error) {
        console.error('[creator-pult] /go insert error:', error.message)
        return reply(chatId, 'Не смог поставить в очередь. Попробуй ещё раз.')
      }
      return reply(chatId, 'Публикую последний прошедший гейты клип. Отпишусь по результату.')
    }

    // -- /stop — clear all pending rows ----------------------------------------
    if (cmd === '/stop') {
      const { data, error } = await supabase
        .from('pult_commands')
        .update({ status: 'failed', result: 'cancelled by /stop' })
        .eq('status', 'pending')
        .select('id')
      if (error) {
        console.error('[creator-pult] /stop update error:', error.message)
        return reply(chatId, 'Не смог очистить очередь. Попробуй ещё раз.')
      }
      const n = Array.isArray(data) ? data.length : 0
      return reply(chatId, `Очередь очищена (${n} задач(и) снято). Уже идущий рендер не трогаю.`)
    }

    // -- Unknown command / free text -------------------------------------------
    if (cmd.startsWith('/')) {
      return reply(chatId, 'Не знаю такую команду. /help — список.')
    }
    // Non-command text: nudge to the menu (Пульт is command-driven in v1).
    return reply(chatId, 'Это Пульт — командуй кнопками. /help — что умею.')
  } catch (err) {
    console.error('[creator-pult]', err instanceof Error ? err.message : err)
    // Always 200 so Telegram does not retry-storm.
    return reply(chatId, 'Что-то сломалось на моей стороне. Попробуй ещё раз.')
  }
})
