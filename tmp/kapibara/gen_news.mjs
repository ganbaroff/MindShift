import './credit_gate_auto.mjs'
import { readFileSync, writeFileSync } from 'node:fs'
import { requireEnv } from './env.mjs'
const key = requireEnv('GEMINI_API_KEY')
const TODAY = process.argv[2] || '2026-06-28' // pass date in (no Date.now reliance)

const prompt = `Use Google Search to find the THREE biggest, REAL artificial-intelligence industry news items from the last 24-48 hours (around ${TODAY}). Then write one episode of «Kapibara News» — a calm, witty ENGLISH AI-news show read by an unflappable capybara anchor.

STYLE: warm, clever, ADHD-safe (no shame, no panic, never "red"/doom). Short punchy lines. Each news beat ends with a light, intelligent joke that LANDS in natural English. Keep proper nouns & numbers exact. Write in ENGLISH.

HARD CHARACTER BUDGETS (Factory Law 2 — physically shorter script so the ~40s runtime holds):
- lines[0] = "Kapibara News!" (fixed).
- lines[1] (hook) ≤ 70 characters.
- Each news SETUP line (lines[2], [3], [5], [7]) ≤ 85 characters.
- Each PUNCHLINE line (lines[4], [6], [8]) ≤ 55 characters.
- lines[9] = "That was Kapibara News." (fixed short).
- lines[10] (sign-off) fixed short, ≤ 45 characters, ends with "See you tomorrow!".
Total spoken text across all 11 lines MUST be under 700 characters.

Return ONLY valid JSON (no markdown), this exact shape:
{
 "lines": [ 11 strings: [0] "Kapibara News!", [1] one-line hook (NOT shaming the viewer), [2-4] news #1 (2 setup + 1 punchline), [5-6] news #2 (setup + punchline), [7-8] news #3 (setup + punchline), [9] "That was Kapibara News.", [10] sign-off + "See you tomorrow!" ],
 "items": [ 5 objects for the on-screen monitor cards: intro, news1, news2, news3, signoff. each {"key": one of "news"|"rocket"|"chip"|"lock"|"chart"|"robot", "title": short headline in ENGLISH (proper noun ok), "sub": the key number/fact, "source": short attribution, "tint": one of "indigo"|"teal"|"gold"} ],
 "ticker": [ 6-8 short strings in ENGLISH: the 3 headlines + a few extra real AI/market tidbits, with ▼/▲ if relevant ]
}
items[0]=intro {key:"news",title:"KAPIBARA NEWS",sub:"Today in AI",source:"${TODAY}",tint:"indigo"}; items[4]=signoff {key:"robot",title:"KAPIBARA NEWS",sub:"see you tomorrow",source:"live",tint:"indigo"}.`

const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent`
const res = await fetch(url, {
  method: 'POST', headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
  body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], tools: [{ googleSearch: {} }], generationConfig: { temperature: 0.6 } }),
})
if (!res.ok) { console.error('HTTP', res.status, (await res.text()).slice(0, 300)); process.exit(2) }
const j = await res.json()
let txt = j.candidates?.[0]?.content?.parts?.map(p => p.text).filter(Boolean).join('') || ''
const m = txt.match(/\{[\s\S]*\}/)
if (!m) { console.error('no JSON in response:', txt.slice(0, 300)); process.exit(3) }
const data = JSON.parse(m[0])
// Factory Law 2 — soft validate the character budget. The atempo pace-lock in reconcat.mjs is the
// HARD guarantee, so an over-budget script only warns; it never crashes the daily run.
const totalChars = Array.isArray(data.lines) ? data.lines.reduce((a, l) => a + String(l).length, 0) : 0
if (totalChars > 850) {
  console.warn(`[gen_news] WARNING: spoken text is ${totalChars} chars (budget <700, hard cap 850). Pace-lock (atempo) will compensate, but shorten next time.`)
}
writeFileSync('today.json', JSON.stringify(data, null, 2))
// grounding sources (proof it used real search)
const srcs = j.candidates?.[0]?.groundingMetadata?.groundingChunks?.map(c => c.web?.title).filter(Boolean) || []
console.log('=== SCRIPT ==='); data.lines.forEach(l => console.log(' •', l))
console.log('\n=== MONITOR CARDS ==='); data.items.forEach(it => console.log(` • [${it.key}] ${it.title} — ${it.sub} (${it.source})`))
console.log('\n=== TICKER ==='); data.ticker.forEach(t => console.log(' •', t))
console.log('\nsources:', srcs.slice(0, 6).join(' | ') || '(none reported)')
