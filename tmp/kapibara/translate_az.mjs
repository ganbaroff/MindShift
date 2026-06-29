import { readFileSync, writeFileSync } from 'node:fs'
import { requireEnv } from './env.mjs'
const key = requireEnv('GEMINI_API_KEY')

const data = JSON.parse(readFileSync('data.json', 'utf8'))
const lines = data.lines.map(l => l.text)
console.log(`[translate_az] translating ${lines.length} lines RU → AZ`)

const prompt = `Translate the Russian TV news-anchor strings to natural, idiomatic AZERBAIJANI (Azərbaycan dili, Latin script — use ə ğ ş ç ö ü ı İ correctly).
Rules:
- Adapt for natural Azerbaijani rhythm; do NOT translate word-for-word.
- Keep the punchy, warm, ADHD-safe humor and TV anchor tone.
- Do NOT translate brand/product names: SpaceX, Cursor, Gemini, Claude, OpenAI, TikTok, Tesla, Apple, Google, etc. Keep numbers/symbols (▼, ▲, $, %) unchanged.
- "Капибара Новости" → "Kapibara Xəbərləri". "До завтра" → "Sabahınadək".
Return ONLY valid JSON (no markdown): {"lines":[...${lines.length} translated strings...]}
INPUT: ${JSON.stringify(lines)}`

async function call(model) {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.4 } }),
  })
  if (!r.ok) throw new Error(`${model} HTTP ${r.status}`)
  const j = await r.json()
  return j.candidates?.[0]?.content?.parts?.find(p => p.text)?.text
}

let az = null
for (const model of ['gemini-3-flash-preview', 'gemini-2.5-flash']) {
  try {
    const txt = await call(model)
    if (!txt) throw new Error('empty response')
    const parsed = JSON.parse(txt)
    if (!Array.isArray(parsed.lines) || parsed.lines.length !== lines.length) {
      throw new Error(`shape mismatch: got ${parsed.lines?.length}, need ${lines.length}`)
    }
    az = parsed
    console.log(`[translate_az] success via ${model}`)
    break
  } catch (e) {
    console.warn(`[translate_az] ${model} failed: ${e.message}`)
  }
}

if (!az) {
  console.warn('[translate_az] all models failed — writing RU as fallback (subtitles will be Russian)')
  az = { lines }
}

writeFileSync('az_final.json', JSON.stringify(az))
console.log(`[translate_az] az_final.json written (${az.lines.length} lines)`)
