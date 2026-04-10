/**
 * telegram-agent-update — Supabase Edge Function for proactive AI agent messages.
 *
 * Called by pg_cron daily at 8:57 AM UTC. Sends warm, ADHD-safe daily check-ins
 * from AI agents (Mochi / Coach / Scout) to all linked Telegram users who haven't
 * received a message today.
 *
 * Agents:
 *   mochi  — warm ADHD companion, no pressure, shows up regardless
 *   coach  — celebrates momentum, counts sessions matter-of-factly
 *   scout  — curious observer, notices patterns without judgment
 *
 * ADHD-safe copy rules (mirrors guardrails.md):
 *   - No "you should", "you need to", "don't forget"
 *   - No urgency language
 *   - Short messages — ADHD brains don't need walls of text
 *   - Warmth without cheerleader inflation
 *
 * Auth: x-cron-secret header must match CRON_SECRET env var.
 *       pg_cron sets this header automatically.
 *
 * Requires env vars:
 *   - TELEGRAM_BOT_TOKEN
 *   - CRON_SECRET
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// -- Env vars ---------------------------------------------------------------------

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!
const CRON_SECRET = Deno.env.get('CRON_SECRET')

// -- Constants -------------------------------------------------------------------

const MAX_USERS_PER_RUN = 50
const TELEGRAM_API_TIMEOUT_MS = 8_000

// -- Types -----------------------------------------------------------------------

interface TelegramLink {
  telegram_id: number
  user_id: string
  daily_message_count: number
  last_message_date: string | null
}

interface FocusSessionRow {
  started_at: string
  duration_minutes: number
}

interface UserStats {
  sessionsToday: number
  tasksCompletedToday: number
  streakDays: number
}

type AgentName = 'mochi' | 'coach' | 'scout'

interface AgentMessage {
  agent: AgentName
  text: string
}

// -- Telegram helper --------------------------------------------------------------

async function sendTelegramMessage(chatId: number, text: string): Promise<boolean> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TELEGRAM_API_TIMEOUT_MS)

  try {
    const resp = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
        }),
      }
    )
    clearTimeout(timeoutId)
    return resp.ok
  } catch (err) {
    clearTimeout(timeoutId)
    console.error(`[telegram-agent-update] sendMessage failed for chat ${chatId}:`, err instanceof Error ? err.message : err)
    return false
  }
}

// -- User stats ------------------------------------------------------------------

async function fetchUserStats(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  today: string
): Promise<UserStats> {
  const todayStart = `${today}T00:00:00.000Z`
  const todayEnd = `${today}T23:59:59.999Z`

  // Sessions today
  const { data: sessions } = await supabase
    .from('focus_sessions')
    .select('started_at, duration_minutes')
    .eq('user_id', userId)
    .gte('started_at', todayStart)
    .lte('started_at', todayEnd)

  const sessionsToday = sessions?.length ?? 0

  // Tasks completed today
  const { count: tasksCompletedToday } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'completed')
    .gte('completed_at', todayStart)
    .lte('completed_at', todayEnd)

  // Streak: count consecutive days with at least one session, going back from yesterday
  // We look at the last 30 days of sessions and compute the streak
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: recentSessions } = await supabase
    .from('focus_sessions')
    .select('started_at')
    .eq('user_id', userId)
    .gte('started_at', thirtyDaysAgo.toISOString())
    .order('started_at', { ascending: false })

  const streakDays = computeStreak(recentSessions as FocusSessionRow[] ?? [], today)

  return {
    sessionsToday,
    tasksCompletedToday: tasksCompletedToday ?? 0,
    streakDays,
  }
}

function computeStreak(sessions: FocusSessionRow[], today: string): number {
  if (!sessions.length) return 0

  // Collect unique days with sessions (excluding today — streak = consecutive prior days)
  const daysWithSessions = new Set(
    sessions.map(s => s.started_at.slice(0, 10))
  )

  let streak = 0
  const cursor = new Date(today)
  // Start from yesterday — today doesn't count yet for streak calculation
  cursor.setDate(cursor.getDate() - 1)

  for (let i = 0; i < 30; i++) {
    const dateKey = cursor.toISOString().slice(0, 10)
    if (daysWithSessions.has(dateKey)) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    } else {
      break
    }
  }

  return streak
}

// -- Agent message selection ------------------------------------------------------

function pickAgentMessage(stats: UserStats, hourUtc: number): AgentMessage {
  const { sessionsToday, streakDays } = stats

  // Priority 1: streak ≥ 3 days → Scout notices the pattern
  if (streakDays >= 3) {
    return {
      agent: 'scout',
      text: `${streakDays} дней подряд. Интересно что ты заметил?`,
    }
  }

  // Priority 2: already had sessions today → Coach acknowledges
  if (sessionsToday >= 1) {
    return {
      agent: 'coach',
      text: sessionsToday === 1
        ? `Одна сессия сегодня. Засчитывается.`
        : `${sessionsToday} сессий сегодня. Засчитывается.`,
    }
  }

  // Priority 3: morning (before noon UTC) + no sessions → Mochi warmup
  if (hourUtc < 12) {
    return {
      agent: 'mochi',
      text: `Эй! Я здесь. Один маленький шаг сегодня?`,
    }
  }

  // Default: Mochi steady presence
  return {
    agent: 'mochi',
    text: `Я здесь. Начни — я не отстану.`,
  }
}

// -- Main handler ----------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // Auth: CRON_SECRET header validation
  if (!CRON_SECRET) {
    console.error('[telegram-agent-update] CRON_SECRET env var not set — refusing to run')
    return new Response('Misconfigured: CRON_SECRET not set', { status: 500 })
  }

  const cronHeader = req.headers.get('x-cron-secret')
  if (cronHeader !== CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }

  if (!BOT_TOKEN) {
    console.error('[telegram-agent-update] TELEGRAM_BOT_TOKEN env var not set')
    return new Response('Misconfigured: TELEGRAM_BOT_TOKEN not set', { status: 500 })
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const hourUtc = now.getUTCHours()

  // Fetch users who haven't received today's message yet
  const { data: links, error: linksError } = await supabase
    .from('telegram_links')
    .select('telegram_id, user_id, daily_message_count, last_message_date')
    .not('telegram_id', 'is', null)  // only fully linked accounts
    .or(`last_message_date.is.null,last_message_date.lt.${today}`)
    .limit(MAX_USERS_PER_RUN)

  if (linksError) {
    console.error('[telegram-agent-update] Failed to fetch telegram_links:', linksError.message)
    return new Response(
      JSON.stringify({ error: linksError.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const users = (links ?? []) as TelegramLink[]

  let sent = 0
  let skipped = 0
  let errors = 0

  for (const user of users) {
    if (!user.telegram_id) {
      skipped++
      continue
    }

    try {
      // Fetch stats for message personalisation
      const stats = await fetchUserStats(supabase, user.user_id, today)

      // Pick the right agent and message
      const { agent, text } = pickAgentMessage(stats, hourUtc)

      // Format with agent signature
      const agentLabel: Record<AgentName, string> = {
        mochi: '🌱 <b>Mochi</b>',
        coach: '⚡ <b>Coach</b>',
        scout: '🔍 <b>Scout</b>',
      }

      const fullMessage = `${agentLabel[agent]}\n${text}`

      // Send via Telegram Bot API
      const ok = await sendTelegramMessage(user.telegram_id, fullMessage)

      if (ok) {
        // Update last_message_date and increment daily_message_count
        const { error: updateError } = await supabase
          .from('telegram_links')
          .update({
            last_message_date: today,
            daily_message_count: (user.daily_message_count ?? 0) + 1,
          })
          .eq('telegram_id', user.telegram_id)

        if (updateError) {
          console.error(
            `[telegram-agent-update] Failed to update last_message_date for telegram_id ${user.telegram_id}:`,
            updateError.message
          )
          // Not fatal — message was sent, just counter didn't update
        }

        sent++
      } else {
        errors++
        console.error(`[telegram-agent-update] sendMessage returned false for telegram_id ${user.telegram_id}`)
      }
    } catch (err) {
      errors++
      console.error(
        `[telegram-agent-update] Unexpected error for telegram_id ${user.telegram_id}:`,
        err instanceof Error ? err.message : err
      )
      // Continue to next user — never let one failure stop the batch
    }
  }

  const summary = { sent, skipped, errors, total: users.length }
  console.log('[telegram-agent-update] Run complete:', JSON.stringify(summary))

  return new Response(JSON.stringify(summary), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
