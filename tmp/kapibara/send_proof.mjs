import { readFileSync } from 'node:fs'
import { requireEnv } from './env.mjs'

const tok = requireEnv('TELEGRAM_CREATORBOT_TOKEN')
const CEO_CHAT_ID = '5150355926'
const FILE_PATH = process.argv[2] || 'kapibara-ladder-llmbasics-combined.mp4'
const CAPTION = process.argv[3] || `🎬 <b>Kapibara Ladder — LLM Basics (5 Rungs)</b>\n\nBuilt entirely by Antigravity (Gemini) as requested.\n\n✅ <b>Critic Verdict:</b> ship_ready (Mean 4.00)\n📖 <i>"A highly polished, clear, and engaging educational quiz video with excellent pacing and clean visuals."</i>`

async function run() {
  console.log(`Loading video bytes from ${FILE_PATH}...`)
  const fileBytes = readFileSync(FILE_PATH)
  const fd = new FormData()
  fd.append('chat_id', CEO_CHAT_ID)
  fd.append('caption', CAPTION)
  fd.append('supports_streaming', 'true')
  fd.append('video', new Blob([fileBytes], { type: 'video/mp4' }), FILE_PATH.split(/[\\/]/).pop())

  console.log(`Sending video to CEO chat (${CEO_CHAT_ID})...`)
  const r = await fetch(`https://api.telegram.org/bot${tok}/sendVideo`, {
    method: 'POST',
    body: fd
  })
  const j = await r.json()
  if (j.ok === true) {
    console.log('SUCCESS: Video sent to CEO Telegram.')
  } else {
    console.error('FAILED to send video:', JSON.stringify(j))
    process.exit(1)
  }
}

run().catch(e => {
  console.error(e)
  process.exit(1)
})
