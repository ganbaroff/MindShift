// Send the Kapibara brand kit to the CEO's Telegram chat (delivery to the user's own chat).
// Board as photo (quick view) + the 3 upload-ready files as documents (uncompressed).
import { readFileSync } from 'node:fs'
const env = readFileSync('C:/Users/user/Downloads/videos/.secrets.env', 'utf8')
const tok = (env.match(/^TELEGRAM_CREATORBOT_TOKEN=(.*)$/m) || [])[1]?.trim().replace(/^["']|["']$/g, '')
const CHAT = 5150355926
const D = 'C:/Projects/mindshift/tmp/brand'

async function sendPhoto(path, caption) {
  const fd = new FormData()
  fd.append('chat_id', String(CHAT))
  fd.append('caption', caption)
  fd.append('photo', new Blob([readFileSync(path)], { type: 'image/png' }), path.split('/').pop())
  const r = await fetch(`https://api.telegram.org/bot${tok}/sendPhoto`, { method: 'POST', body: fd })
  const j = await r.json(); console.log('photo', path.split('/').pop(), 'ok=', j.ok, j.ok ? '' : JSON.stringify(j).slice(0, 160)); return j.ok
}
async function sendDoc(path, caption) {
  const fd = new FormData()
  fd.append('chat_id', String(CHAT))
  if (caption) fd.append('caption', caption)
  fd.append('document', new Blob([readFileSync(path)], { type: 'image/png' }), path.split('/').pop())
  const r = await fetch(`https://api.telegram.org/bot${tok}/sendDocument`, { method: 'POST', body: fd })
  const j = await r.json(); console.log('doc', path.split('/').pop(), 'ok=', j.ok, j.ok ? '' : JSON.stringify(j).slice(0, 160)); return j.ok
}

await sendPhoto(`${D}/kapibara-brand-board.png`, 'Kapibara AI — бренд-кит на VOLAURA-системе. Ниже 3 файла для загрузки (аватар / баннер) + тексты био.')
await sendDoc(`${D}/kapibara-avatar-1080.png`, 'Аватар (все 3 площадки)')
await sendDoc(`${D}/kapibara-youtube-banner.png`, 'YouTube-баннер 2560×1440')
console.log('DONE')
