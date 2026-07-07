import { readFileSync, existsSync } from 'node:fs'
import { requireEnv } from './env.mjs'
const tok = requireEnv('TELEGRAM_CREATORBOT_TOKEN'), chat = requireEnv('TELEGRAM_CHANNEL_ID')

// Resolve video file: prefer latest_output.json, fallback to arg, else error
let videoPath = process.argv[2]
if (!videoPath && existsSync('latest_output.json')) {
  videoPath = JSON.parse(readFileSync('latest_output.json', 'utf8')).file
}
if (!videoPath || !existsSync(videoPath)) { console.error(`[tg_post] video not found: ${videoPath || '(none)'}`); process.exit(1) }

// Build caption from today.json — TOPIC-AWARE (football vs AI)
const KEY_EMOJI = { news: '📰', rocket: '🚀', chip: '🧠', lock: '🔒', chart: '📈', robot: '🤖', trophy: '🏆', ball: '⚽', gloves: '🧤', boot: '👟', whistle: '📣' }
const FOOTBALL_KEYS = new Set(['trophy', 'ball', 'gloves', 'boot', 'whistle'])
let caption
if (existsSync('today.json')) {
  const tj = JSON.parse(readFileSync('today.json', 'utf8'))
  const isFootball = (tj.items || []).some(it => FOOTBALL_KEYS.has(it.key))
  const news = (tj.items || []).slice(1, 4)
  const bullets = news.map(it => `${KEY_EMOJI[it.key] || (isFootball ? '⚽' : '📰')} ${it.title} — ${it.sub}`).join('\n')
  // Subtitle A/B day-parity must MATCH make-clip.mjs stage 5-6: odd UTC day-of-month = Arabic subs.
  const arDay = new Date().getUTCDate() % 2 === 1
  if (isFootball) {
    // Football branch stays Russian (out of the EN conveyor; never-delete rule keeps it).
    const hook = tj.lines?.[1] || 'Что вы пропустили на чемпионате мира'
    caption = `${hook}

За минуту:
${bullets}

Капибара держит лапу на пульсе. До завтра 🐾

💬 Попробуй бесплатный AI-тест навыков → ссылка в био

сделано ИИ

#футбол #чемпионатмира #worldcup2026 #football #footballtok #капибара`
  } else {
    // English AI-news conveyor — mirrors buffer_publish.mjs caption + day-parity AR note.
    const hook = tj.lines?.[1] || "Three AI stories while the world was asleep"
    const tags = '#ai #ainews #capybara #tech #learnai' + (arDay ? ' #الذكاء_الاصطناعي #تقنية' : '')
    caption = `${hook} 🦫📰

In one minute:
${bullets}

The capybara stays calm. The capybara stays in the know 🐾

💬 Try the free AI skills test → link in bio

AI-made${arDay ? ' · 🇸🇦 Arabic subtitles' : ''}

${tags}`
  }
} else {
  // static fallback — only if today.json absent (EN, neutral CTA)
  caption = `Three AI stories while the world was asleep 🦫📰

The capybara stays calm. The capybara stays in the know 🐾

💬 Try the free AI skills test → link in bio

AI-made

#ai #ainews #capybara #tech #learnai`
}

console.log('[tg_post] video:', videoPath)
console.log('[tg_post] caption preview:', caption.slice(0, 120).replace(/\n/g, ' ↵ ') + '…')

const file = readFileSync(videoPath)
const fd = new FormData()
fd.append('chat_id', chat)
fd.append('caption', caption)
fd.append('supports_streaming', 'true')
fd.append('video', new Blob([file], { type: 'video/mp4' }), 'kapibara-news.mp4')

const r = await fetch(`https://api.telegram.org/bot${tok}/sendVideo`, { method: 'POST', body: fd })
const j = await r.json()
console.log('ok =', j.ok, '| message_id =', j.result?.message_id, '| chat =', j.result?.chat?.username || j.result?.chat?.title || '', '| error =', j.description || '-')
