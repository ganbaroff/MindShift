import { readFileSync, writeFileSync } from 'node:fs'
import { requireEnv } from './env.mjs'
const key = requireEnv('GEMINI_API_KEY')

// A/B Saudi test: EN voice + ARABIC bottom subtitles. Chrome/monitor/ticker/brand stay ENGLISH.
// Cloned from translate_az.mjs (same shape/guards), only the target language differs.
const data = JSON.parse(readFileSync('data.json', 'utf8'))
const lines = data.lines.map(l => l.text)
console.log(`[translate_ar] translating ${lines.length} lines EN → AR (MSA)`)

const prompt = `Translate the English TV news-anchor strings to natural, idiomatic MODERN STANDARD ARABIC (العربية الفصحى).
Rules:
- Adapt for natural Arabic rhythm and news-anchor register; do NOT translate word-for-word.
- Keep the punchy, warm, ADHD-safe humor and calm TV anchor tone; the jokes must still land in Arabic.
- Do NOT translate brand/product names: SpaceX, Cursor, Gemini, Claude, OpenAI, TikTok, Tesla, Apple, Google, Anthropic, etc. Keep numbers/symbols (▼, ▲, $, %) unchanged.
- "Kapibara News" → "أخبار كابيبارا". "See you tomorrow" → "إلى اللقاء غدًا".
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

let ar = null
for (const model of ['gemini-3-flash-preview', 'gemini-2.5-flash']) {
  try {
    const txt = await call(model)
    if (!txt) throw new Error('empty response')
    const parsed = JSON.parse(txt)
    if (!Array.isArray(parsed.lines) || parsed.lines.length !== lines.length) {
      throw new Error(`shape mismatch: got ${parsed.lines?.length}, need ${lines.length}`)
    }
    ar = parsed
    console.log(`[translate_ar] success via ${model}`)
    break
  } catch (e) {
    console.warn(`[translate_ar] ${model} failed: ${e.message}`)
  }
}

if (!ar) {
  console.warn('[translate_ar] all models failed — writing EN as fallback (subtitles will be English)')
  ar = { lines }
}

writeFileSync('ar_final.json', JSON.stringify(ar))
console.log(`[translate_ar] ar_final.json written (${ar.lines.length} lines)`)
