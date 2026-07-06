// pult_setwebhook.mjs — point Telegram @CreatorBy_bot at the creator-pult edge function.
//
// Resolves the Supabase project ref from VITE_SUPABASE_URL (same var supabase_sync.mjs uses),
// builds .../functions/v1/creator-pult?k=<PULT_URL_KEY>, and calls setWebhook. Then prints
// getWebhookInfo (never prints the token).
//
// Run once (and after any redeploy that changes the URL/key):
//   node pult_setwebhook.mjs
//
// NOTE: this bot (@CreatorBy_bot) currently also has the telegram-webhook (funnel) wired.
// A Telegram bot has ONE webhook — setting this REPOINTS it to creator-pult. If the funnel
// must keep running on the SAME bot, do NOT run this against the shared token; use a separate
// bot for the Пульт. This is flagged in the handoff — confirm with the CEO before repointing.

import { requireEnv } from './env.mjs'

const tok = requireEnv('TELEGRAM_CREATORBOT_TOKEN')
const SUPA_URL = requireEnv('VITE_SUPABASE_URL') // e.g. https://<ref>.supabase.co

// Must match the constant compiled into supabase/functions/creator-pult/index.ts.
const PULT_URL_KEY = 'HPKaWGb6sjdGIG-5c1NXtnMOP9NEXKmQ'

// Project ref is the host of the Supabase URL; the functions endpoint hangs off it.
const ref = new URL(SUPA_URL).host // <ref>.supabase.co
const webhookUrl = `https://${ref}/functions/v1/creator-pult?k=${PULT_URL_KEY}`

// Restrict to message updates only (we ignore everything else in the fn anyway).
const body = {
  url: webhookUrl,
  allowed_updates: ['message'],
  drop_pending_updates: true,
}

const set = await fetch(`https://api.telegram.org/bot${tok}/setWebhook`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})
const sj = await set.json()
// Print the URL WITHOUT the ?k= secret so it never lands in logs.
console.log('[setWebhook] target:', `https://${ref}/functions/v1/creator-pult?k=***`)
console.log('[setWebhook] ok =', sj.ok, '| error =', sj.description || '-')

const info = await fetch(`https://api.telegram.org/bot${tok}/getWebhookInfo`)
const ij = await info.json()
const r = ij.result || {}
// Redact the ?k= value out of the returned url before printing.
const redacted = (r.url || '').replace(/([?&]k=)[^&]+/, '$1***')
console.log('[getWebhookInfo]', JSON.stringify({
  url: redacted,
  pending_update_count: r.pending_update_count,
  last_error_date: r.last_error_date || null,
  last_error_message: r.last_error_message || null,
  allowed_updates: r.allowed_updates || null,
}, null, 2))
