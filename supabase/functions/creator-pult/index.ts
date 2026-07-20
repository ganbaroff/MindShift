// -- creator-pult Edge Function -------------------------------------------------
// POST /functions/v1/creator-pult  (auth: X-Telegram-Bot-Api-Secret-Token header)
//
// «Пульт v1» — the CEO's phone control panel for the media factory, driven from his
// Telegram bot @CreatorBy_bot. This function is a THIN dispatcher: it authenticates the
// webhook, answers instant commands (/start /help /status /whoami /stop), and for the
// heavy commands (/news /ladder /go) it ENQUEUES a row into public.pult_commands and
// replies immediately. The actual render (15-40 min) is done out-of-band by
// pult_worker.mjs (GitHub Actions poller). An edge function cannot render — 150s limit.
//
// -- AUTH (v2, 2026-07-06 hardening) ---------------------------------------------
// Two unforgeable layers:
//   1. X-Telegram-Bot-Api-Secret-Token header must equal the Supabase secret
//      PULT_WEBHOOK_SECRET (registered with Telegram via setWebhook secret_token).
//      Only Telegram knows it → proves the update is genuine. Fail-closed: if the
//      secret env is unset, the function refuses (500).
//   2. ALLOWED_CHAT_ID pins the CEO's chat. Because layer 1 proved the update is a
//      genuine Telegram delivery, message.chat.id is trustworthy here (not spoofable).
// (v1 used a `?k=` URL key compiled into source — it burned in the public repo, removed.)
//
// -- INSTANT REPLIES (no bot token needed) --------------------------------------
// We answer the webhook HTTP request with JSON {method:'sendMessage', chat_id, text}.
// Telegram executes that method against the SAME update — so this function never needs
// the bot token. (Only pult_worker.mjs needs the token, to send video files back.)
//
// -- SETUP (CEO, one-time — needed before this hardened code will accept traffic) -
// 1. Secret:   supabase secrets set PULT_WEBHOOK_SECRET=<random 32+ char string>
// 2. Deploy:   supabase functions deploy creator-pult --no-verify-jwt
//    (--no-verify-jwt: Telegram sends no Supabase JWT; auth is the header above.)
// 3. Register: curl -X POST "https://api.telegram.org/bot<CREATORBY_BOT_TOKEN>/setWebhook" \
//      -H "Content-Type: application/json" \
//      -d '{"url":"https://<ref>.supabase.co/functions/v1/creator-pult","secret_token":"<same PULT_WEBHOOK_SECRET>"}'
//    (URL carries NO ?k=; Telegram attaches secret_token as the header on every update.)
//
// Uses the auto-injected SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (same as telegram-webhook).
// ---------------------------------------------------------------------------------

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// -- Auth is the Telegram secret-token header (checked in the handler below). ------
// No key in source. The secret lives ONLY as the Supabase secret PULT_WEBHOOK_SECRET
// and is registered with Telegram via setWebhook({ secret_token }). Fail-closed.

// -- Chat allowlist ---------------------------------------------------------------
// Only this chat_id may issue commands (fail-closed: 0 or any other id is refused).
// chat.id is trusted because the secret-token header already proved the update is a
// genuine Telegram delivery for @CreatorBy_bot.
const ALLOWED_CHAT_ID = 5150355926 // CEO — pinned 2026-07-06 from his live /news command

// -- Telegram types (minimal) -----------------------------------------------------

interface TgUpdate {
  update_id?: number
  message?: TgMessage
  callback_query?: TgCallbackQuery
}

interface TgMessage {
  message_id: number
  from?: { id: number; first_name?: string; username?: string }
  chat: { id: number; type: string }
  text?: string
  date: number
  reply_to_message?: TgMessage
}

interface TgCallbackQuery {
  id: string
  from?: { id: number }
  message?: TgMessage
  data?: string
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

/brief &lt;тема&gt; — начать новый бриф (квиз «Лесенка»)
/ок — одобрить текущий шаг брифа (бриф → сценарий → голос)
/нет &lt;причина&gt; — отправить бриф на доработку с причиной
/news — сгенерить ролик «Капибара Новости» (превью придёт сюда, ~15-20 мин)
/ladder — сгенерить квиз-ролик «Лесенка»
/go — опубликовать последний прошедший гейты клип
/pult — 🎛 пульт: пауза / жанр / сценарий (кнопки)
/pause /resume — постинг ВЫКЛ / ВКЛ
/genre news|quiz — выбрать жанр дня
/script &lt;текст&gt; — свой сценарий на следующий выпуск
/status — статус фабрики, брифа и очереди
/stop — очистить очередь
/whoami — показать твой chat_id
/help — это меню

Рендер идет в облаке (GitHub Actions, каждые 10 мин). Превью бросаю сюда, когда готово.`

// -- Ф2 factory_control (Пульт panel) helpers ------------------------------------
const GENRE_LABEL: Record<string, string> = { news: 'AI News', quiz: 'Quiz / Ladder' }
const FC_DEFAULT = { posting_enabled: true, active_genre: 'news', queued_script: null, updated_by: 'default', updated_at: null }

// deno-lint-ignore no-explicit-any
async function fcGet(sb: Sb): Promise<any> {
  try {
    const { data, error } = await sb.from('factory_control').select('*').eq('id', 1).maybeSingle()
    return (error || !data) ? { ...FC_DEFAULT } : data
  } catch { return { ...FC_DEFAULT } }
}

// deno-lint-ignore no-explicit-any
async function fcSet(sb: Sb, patch: Record<string, unknown>, by: string): Promise<any> {
  const clean: Record<string, unknown> = { updated_by: by, updated_at: new Date().toISOString() }
  if ('posting_enabled' in patch) clean.posting_enabled = patch.posting_enabled !== false
  if ('active_genre' in patch) clean.active_genre = patch.active_genre
  if ('queued_script' in patch) clean.queued_script = (patch.queued_script as string) || null
  const { data, error } = await sb.from('factory_control').update(clean).eq('id', 1).select().maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

// deno-lint-ignore no-explicit-any
function fcDescribe(s: any): string {
  return `📊 Фабрика: постинг ${s.posting_enabled ? '🟢 ВКЛ' : '🔴 ВЫКЛ'} · жанр «${GENRE_LABEL[s.active_genre] || s.active_genre}»`
    + (s.queued_script ? ` · 📝 твой сценарий в очереди (${String(s.queued_script).length} симв.)` : ' · сценарий: авто')
    + (s.updated_at ? `\nизменено: ${String(s.updated_at).slice(0, 16)} (${s.updated_by})` : '')
}

const PANEL_KB = {
  inline_keyboard: [
    [{ text: '⏸ Пауза', callback_data: 'fc:pause' }, { text: '▶️ Возобновить', callback_data: 'fc:resume' }],
    [{ text: '📰 Новости', callback_data: 'fc:g:news' }, { text: '❓ Квиз', callback_data: 'fc:g:quiz' }],
    [{ text: '📝 Мой сценарий', callback_data: 'fc:script' }, { text: '📊 Обновить', callback_data: 'fc:refresh' }],
  ],
}
const SCRIPT_PROMPT = '📝 Пришли текст следующего выпуска ОТВЕТОМ на это сообщение (или командой /script &lt;текст&gt;).'

// Пульт panel = a sendMessage carrying the control keyboard (webhook-response method, no bot token).
function panel(chatId: number, text: string): Response {
  return new Response(
    JSON.stringify({ method: 'sendMessage', chat_id: chatId, text, parse_mode: 'HTML', reply_markup: PANEL_KB }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // -- AUTH: verify the Telegram secret-token header. Unforgeable — only Telegram
  // (via our setWebhook registration) knows it. Fail closed if the secret is unset. -
  const webhookSecret = Deno.env.get('PULT_WEBHOOK_SECRET')
  if (!webhookSecret) {
    console.error('[creator-pult] PULT_WEBHOOK_SECRET not set — refusing to process')
    return new Response('Misconfigured: PULT_WEBHOOK_SECRET not set', { status: 500 })
  }
  if (req.headers.get('x-telegram-bot-api-secret-token') !== webhookSecret) {
    return new Response('Forbidden', { status: 403 })
  }

  let update: TgUpdate
  try {
    update = await req.json() as TgUpdate
  } catch {
    return ok()
  }

  // -- callback_query (inline-button taps) — the core of "buttons in hand" (Ф2). This function
  // handled ZERO callbacks before. Auth: the secret-token header above already proved the update is
  // a genuine Telegram delivery, so callback_query.message.chat.id is trustworthy (same as messages). --
  if (update.callback_query) {
    const cbq = update.callback_query
    const cbChatId = cbq.message?.chat?.id ?? 0
    const cbData = cbq.data ?? ''
    if (ALLOWED_CHAT_ID === 0 || cbChatId !== ALLOWED_CHAT_ID) return ok()
    const sbcb: Sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    try {
      if (cbData === 'fc:script') {
        // "Мой сценарий" → prompt; the CEO's reply becomes queued_script (handled as a reply below).
        return new Response(
          JSON.stringify({ method: 'sendMessage', chat_id: cbChatId, text: SCRIPT_PROMPT, parse_mode: 'HTML', reply_markup: { force_reply: true } }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }
      let patch: Record<string, unknown> | null = null
      if (cbData === 'fc:pause') patch = { posting_enabled: false }
      else if (cbData === 'fc:resume') patch = { posting_enabled: true }
      else if (cbData === 'fc:g:news') patch = { active_genre: 'news' }
      else if (cbData === 'fc:g:quiz') patch = { active_genre: 'quiz' }
      // 'fc:refresh' or anything else → no write, just re-render the current state.
      const state = patch ? await fcSet(sbcb, patch, 'ceo-button') : await fcGet(sbcb)
      // Edit the panel in place to show the new state (webhook-response method; no bot token needed).
      return new Response(
        JSON.stringify({ method: 'editMessageText', chat_id: cbChatId, message_id: cbq.message?.message_id, text: fcDescribe(state), parse_mode: 'HTML', reply_markup: PANEL_KB }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    } catch (err) {
      console.error('[creator-pult] callback error:', err instanceof Error ? err.message : err)
      return ok()
    }
  }

  const message = update.message
  // Only handle private-chat text messages. Ignore everything else silently.
  if (!message?.text || !message.from || message.chat.type !== 'private') {
    return ok()
  }

  const chatId = message.chat.id
  const text = message.text.trim()
  const cmd = text.split(/\s+/)[0].toLowerCase()

  // -- Chat allowlist gate. chat.id is trustworthy now: the secret-token header
  // above proves the update genuinely came from Telegram, so it cannot be forged. --
  // Fail closed — an unpinned (0) allowlist refuses everyone, never allow-all.
  if (ALLOWED_CHAT_ID === 0 || chatId !== ALLOWED_CHAT_ID) {
    return reply(chatId, 'Этот пульт закреплён за владельцем. Доступа нет.')
  }

  // -- /whoami — behind the gate, owner-only. Handy to reconfirm the pinned id. ---
  if (cmd === '/whoami') {
    return reply(chatId, `Твой chat_id: <code>${chatId}</code>`)
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
    // -- Script via ForceReply: a reply to the script prompt carries the CEO's own script text. --
    if (message.reply_to_message?.text?.startsWith('📝 Пришли текст') && text && !text.startsWith('/')) {
      try {
        await fcSet(supabase, { queued_script: text }, 'ceo-forcereply')
        return reply(chatId, `📝 Принял твой сценарий (${text.length} симв.) — уйдёт в следующем выпуске. /pult — статус.`)
      } catch (_e) {
        return reply(chatId, 'Не смог сохранить сценарий. Попробуй ещё раз.')
      }
    }

    // -- Пульт control panel (Ф2): buttons + typed equivalents ------------------
    if (cmd === '/pult') {
      return panel(chatId, fcDescribe(await fcGet(supabase)))
    }
    if (cmd === '/pause') {
      return panel(chatId, fcDescribe(await fcSet(supabase, { posting_enabled: false }, 'ceo-cmd')))
    }
    if (cmd === '/resume') {
      return panel(chatId, fcDescribe(await fcSet(supabase, { posting_enabled: true }, 'ceo-cmd')))
    }
    if (cmd === '/genre') {
      const g = text.split(/\s+/)[1]
      if (g !== 'news' && g !== 'quiz') return reply(chatId, 'Жанр: <code>/genre news</code> или <code>/genre quiz</code>')
      return panel(chatId, fcDescribe(await fcSet(supabase, { active_genre: g }, 'ceo-cmd')))
    }
    if (cmd === '/script') {
      const sc = text.slice(7).trim()
      if (!sc) return reply(chatId, 'Пришли текст: <code>/script &lt;твой сценарий&gt;</code> (или кнопка «📝 Мой сценарий»).')
      await fcSet(supabase, { queued_script: sc }, 'ceo-cmd')
      return reply(chatId, `📝 Принял сценарий (${sc.length} симв.) — уйдёт в следующем выпуске.`)
    }

    // -- /status — brief status + last 5 queue rows -----------------------------
    if (cmd === '/status') {
      let briefStatus = ''
      const { data: briefs, error: briefErr } = await supabase
        .from('pult_briefs')
        .select('id, state, brief, rework_reason, updated_at')
        .eq('chat_id', chatId)
        .order('updated_at', { ascending: false })
        .limit(1)

      if (!briefErr && briefs && briefs.length > 0) {
        const b = briefs[0]
        const approvals = b.brief?.approvals || {}
        const appText = Object.entries(approvals)
          .map(([k, v]) => `${k}: ${v === null ? '⏳' : v === 'approved' ? '✅' : '❌'}`)
          .join(', ')
        briefStatus = `<b>Активный бриф:</b> <code>${b.id}</code> (тема: ${b.brief?.topic || 'N/A'})\n` +
          `Статус: <code>${b.state}</code>\n` +
          `Ворота: { ${appText} }\n` +
          (b.rework_reason ? `Причина доработки: <i>${b.rework_reason}</i>\n` : '') +
          `Обновлен: ${new Date(b.updated_at).toISOString().slice(5, 16).replace('T', ' ')}\n\n`
      }

      const { data, error } = await supabase
        .from('pult_commands')
        .select('cmd, args, status, result, created_at')
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) {
        console.error('[creator-pult] /status query error:', error.message)
        return reply(chatId, briefStatus + 'Не смог прочитать очередь задач. Попробуй ещё раз.')
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
      
      return panel(chatId, fcDescribe(await fcGet(supabase)) + '\n\n' + briefStatus + '<b>Очередь задач (последние 5):</b>\n' + lines.join('\n'))
    }

    // -- /brief <idea> — create a content brief draft --------------------------
    if (cmd === '/brief') {
      const idea = text.slice(6).trim()
      if (!idea) {
        return reply(chatId, 'Укажите тему/идею брифа. Пример: <code>/brief основы больших языковых моделей</code>')
      }
      const briefId = crypto.randomUUID()
      const topic = idea.toLowerCase().replace(/[^a-zа-я0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'brief-topic'

      // Topic allowlist — the conveyor sources questions from ladder_question_bank.json, which has
      // exactly these 8 topics × 5 questions. An unknown topic would crash generateEpisodes later
      // (Atlas grading find #2, 2026-07-08). Honest reply now beats a silent pipeline crash later.
      const BANK_TOPICS = ['llm-basics', 'prompting', 'ai-history', 'safety-limits', 'everyday-ai', 'agents-tools', 'multimodal', 'myths']
      if (!BANK_TOPICS.includes(topic)) {
        return reply(chatId, `Пока умею только темы из проверенного банка вопросов:\n${BANK_TOPICS.map(t => `• <code>/brief ${t}</code>`).join('\n')}\n\nСвои темы появятся после расширения банка (F4 в бэклоге).`)
      }

      const brief = {
        brief_id: briefId,
        created_by: 'ceo-telegram',
        format: 'ladder',
        duration_target_sec: 60,
        duration_tolerance_sec: 8,
        voice: 'Algieba',
        style: 'Read aloud in one warm, energetic, charismatic quiz-host voice — clear, upbeat, and lively, never monotone; keep the same speaker throughout and land the playful lines with light comedic timing:',
        language: 'en',
        topic: topic,
        source_material: `bank:${topic}`,
        cta: 'subscribe',
        n_items: 5,
        state: 'draft',
        approvals: { brief: null, script: null, voice_sample: null, final: null }
      }

      const { error } = await supabase
        .from('pult_briefs')
        .insert({ id: briefId, chat_id: chatId, state: 'draft', brief })

      if (error) {
        console.error('[creator-pult] /brief insert error:', error.message)
        return reply(chatId, 'Не смог создать черновик брифа. Попробуй ещё раз.')
      }

      return reply(chatId, `📝 Создан черновик брифа для темы <b>${topic}</b>.\nID: <code>${briefId}</code>\nВопросы: формат? длительность? тема? Отправьте /ок чтобы одобрить бриф.`)
    }

    // -- /ок — approve the current gate stage of the active brief --------------
    if (cmd === '/ок') {
      const { data: briefs, error: selectErr } = await supabase
        .from('pult_briefs')
        .select('id, state, brief')
        .eq('chat_id', chatId)
        .order('updated_at', { ascending: false })
        .limit(1)

      if (selectErr || !briefs || briefs.length === 0) {
        return reply(chatId, 'Нет активных брифов для одобрения. Создайте новый через /brief.')
      }

      const row = briefs[0]
      const approvals = row.brief.approvals || { brief: null, script: null, voice_sample: null, final: null }
      let nextState = row.state
      let stepName = ''

      if (row.state === 'draft') {
        approvals.brief = 'approved'
        nextState = 'brief_ok'
        stepName = 'Бриф'
      } else if (row.state === 'scripted') {
        approvals.script = 'approved'
        nextState = 'script_ok'
        stepName = 'Сценарий'
      } else if (row.state === 'voiced') {
        approvals.voice_sample = 'approved'
        nextState = 'voice_ok'
        stepName = 'Голосовые сэмплы'
      } else {
        return reply(chatId, `Бриф в состоянии <code>${row.state}</code> не ожидает одобрения ворот.`)
      }

      const { error: updateErr } = await supabase
        .from('pult_briefs')
        .update({
          state: nextState,
          brief: { ...row.brief, approvals },
          updated_at: new Date().toISOString()
        })
        .eq('id', row.id)

      if (updateErr) {
        console.error('[creator-pult] /ок update error:', updateErr.message)
        return reply(chatId, 'Не смог записать одобрение. Попробуй ещё раз.')
      }

      return reply(chatId, `✅ Одобрил ворота: <b>${stepName}</b>. Перевожу бриф в состояние <code>${nextState}</code>.`)
    }

    // -- /нет <причина> — reject/rework the current stage -----------------------
    if (cmd === '/нет') {
      const reason = text.slice(4).trim()
      if (!reason) {
        return reply(chatId, 'Причина отклонения обязательна. Например: <code>/нет перепиши раскрытие третьего вопроса</code>')
      }

      const { data: briefs, error: selectErr } = await supabase
        .from('pult_briefs')
        .select('id, state, brief')
        .eq('chat_id', chatId)
        .order('updated_at', { ascending: false })
        .limit(1)

      if (selectErr || !briefs || briefs.length === 0) {
        return reply(chatId, 'Нет активных брифов для отклонения.')
      }

      const row = briefs[0]
      const approvals = row.brief.approvals || { brief: null, script: null, voice_sample: null, final: null }
      let nextState = row.state
      let stepName = ''

      if (row.state === 'draft') {
        approvals.brief = 'rejected'
        stepName = 'Бриф'
      } else if (row.state === 'scripted') {
        approvals.script = 'rejected'
        nextState = 'brief_ok' // reset to brief_ok so worker re-scripts
        stepName = 'Сценарий'
      } else if (row.state === 'voiced') {
        approvals.voice_sample = 'rejected'
        nextState = 'script_ok' // reset to script_ok so worker re-voices
        stepName = 'Голосовые сэмплы'
      } else {
        return reply(chatId, `Бриф в состоянии <code>${row.state}</code> не ожидает ручного ворота.`)
      }

      const { error: updateErr } = await supabase
        .from('pult_briefs')
        .update({
          state: nextState,
          rework_reason: reason,
          brief: { ...row.brief, approvals },
          updated_at: new Date().toISOString()
        })
        .eq('id', row.id)

      if (updateErr) {
        console.error('[creator-pult] /нет update error:', updateErr.message)
        return reply(chatId, 'Не смог записать отклонение. Попробуй ещё раз.')
      }

      return reply(chatId, `❌ Отклонил ворота: <b>${stepName}</b>. Возвращаю в состояние <code>${nextState}</code>.\nПричина: <i>${reason}</i>`)
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
