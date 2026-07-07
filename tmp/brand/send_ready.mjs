// Deliver the ready videos to the CEO's Telegram: news episode + Ladder knowledge-check.
// Uses public GCS URLs (Telegram fetches them). No secrets except the bot token (read from file).
import { readFileSync } from 'node:fs'
const env = readFileSync('C:/Users/user/Downloads/videos/.secrets.env', 'utf8')
const tok = (env.match(/^TELEGRAM_CREATORBOT_TOKEN=(.*)$/m) || [])[1]?.trim().replace(/^["']|["']$/g, '')
const CHAT = 5150355926
const BUCKET = 'https://storage.googleapis.com/kapibara-news-pub-0321449510'
const vids = [
  { url: `${BUCKET}/kapibara-2026-07-07.mp4`, cap: '📰 Новостной выпуск (тот, что публикуем) — 2026-07-07, EN-лента.' },
  { url: `${BUCKET}/kapibara-ladder-ep01-token.mp4`, cap: '🧩 Проверка знаний / Ladder — образец квиза.' },
]
for (const v of vids) {
  const fd = new FormData()
  fd.append('chat_id', String(CHAT))
  fd.append('video', v.url)
  fd.append('caption', v.cap)
  fd.append('supports_streaming', 'true')
  const r = await fetch(`https://api.telegram.org/bot${tok}/sendVideo`, { method: 'POST', body: fd })
  const j = await r.json()
  console.log('sendVideo', v.url.split('/').pop(), 'ok=', j.ok, j.ok ? '' : JSON.stringify(j).slice(0, 200))
}
