import './credit_gate_auto.mjs'
import { getEnv } from './env.mjs'
import { writeFileSync } from 'node:fs'
const k = getEnv('GEMINI_API_KEY')
const PROMPT = 'Upbeat modern corporate technology background instrumental. Driving clean electronic beat, optimistic and confident, premium, steady forward pulse, tasteful synths and light percussion, no vocals. Background bed under a voiceover for a web design agency advert.'
const body = { contents: [{ parts: [{ text: PROMPT }] }], generationConfig: { responseModalities: ['AUDIO'] } }
const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/lyria-3-clip-preview:generateContent', {
  method: 'POST', headers: { 'x-goog-api-key': k, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
})
console.log('HTTP', r.status)
const j = await r.json()
if (!r.ok) { console.log('ERR', JSON.stringify(j).slice(0, 400)); process.exit(1) }
const parts = j.candidates?.[0]?.content?.parts || []
for (const p of parts) {
  if (p.inlineData) { const b = Buffer.from(p.inlineData.data, 'base64'); console.log('AUDIO mime=', p.inlineData.mimeType, 'bytes=', b.length); writeFileSync('music_raw.bin', b) }
  else console.log('part keys:', Object.keys(p), JSON.stringify(p).slice(0,120))
}
console.log('meta:', JSON.stringify(j.usageMetadata||{}).slice(0,160))
