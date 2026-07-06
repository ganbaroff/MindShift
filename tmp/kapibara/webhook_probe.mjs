// webhook_probe.mjs — read-only Telegram webhook health check. Prints SAFE fields only
// (host, pending count, last error) — never the token, never the full URL query.
import { readFileSync } from 'node:fs'
const env = readFileSync('.secrets.env', 'utf8')
const tok = env.match(/TELEGRAM_CREATORBOT_TOKEN=(.+)/)[1].trim()
const r = await fetch(`https://api.telegram.org/bot${tok}/getWebhookInfo`)
const j = await r.json()
const i = j.result || {}
console.log('webhook host   :', (i.url || 'NONE').replace(/^https:\/\//, '').split('/')[0])
console.log('path           :', (i.url || '').split('/').slice(3).join('/').split('?')[0])
console.log('has ?k= key    :', /[?&]k=/.test(i.url || ''))
console.log('pending updates:', i.pending_update_count ?? 0)
console.log('last_error     :', i.last_error_message || 'none', i.last_error_date ? new Date(i.last_error_date * 1000).toISOString() : '')
