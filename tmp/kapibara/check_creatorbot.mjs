// check_creatorbot.mjs — do we hold a working token for the CEO's creator bot? Names + getMe only, zero secret bytes printed.
import { readFileSync, existsSync } from 'node:fs'
const sources = ['C:/Users/user/Downloads/videos/.secrets.env', 'C:/Projects/mindshift/.env', 'C:/Users/user/Downloads/videos/апи.txt']
const found = {}
for (const p of sources) {
  if (!existsSync(p)) continue
  const txt = readFileSync(p, 'utf8')
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.+)$/)
    if (m && /telegram|creator|bot/i.test(m[1]) && !(m[1] in found)) found[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
}
console.log('candidate key NAMES:', Object.keys(found).join(', ') || '(none)')
for (const [name, tok] of Object.entries(found)) {
  if (!/^\d+:[\w-]+$/.test(tok)) { console.log(`${name}: not a bot-token shape — skip`); continue }
  try {
    const r = await fetch(`https://api.telegram.org/bot${tok}/getMe`)
    const j = await r.json()
    console.log(`${name}: ${j.ok ? '✓ ALIVE → @' + j.result.username + ' ("' + j.result.first_name + '")' : '✗ ' + (j.description || r.status)}`)
  } catch (e) { console.log(`${name}: fetch error ${e.message}`) }
}
