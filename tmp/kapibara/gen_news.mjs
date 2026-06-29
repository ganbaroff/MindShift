import { readFileSync, writeFileSync } from 'node:fs'
import { requireEnv } from './env.mjs'
const key = requireEnv('GEMINI_API_KEY')
const TODAY = process.argv[2] || '2026-06-28' // pass date in (no Date.now reliance)

const prompt = `Use Google Search to find the THREE biggest, REAL artificial-intelligence industry news items from the last 24-48 hours (around ${TODAY}). Then write one episode of «Капибара Новости» — a calm, witty Russian AI-news show read by an unflappable capybara anchor.

STYLE: warm, clever, ADHD-safe (no shame, no panic, never "red"/doom). Short punchy lines. Each news beat ends with a light, intelligent joke. Keep proper nouns & numbers exact. Russian.

Return ONLY valid JSON (no markdown), this exact shape:
{
 "lines": [ 11 strings: [0] "Капибара Новости!", [1] one-line hook (NOT shaming the viewer), [2-4] news #1 (2 setup + 1 punchline), [5-6] news #2 (setup + punchline), [7-8] news #3 (setup + punchline), [9] "Это была Капибара Новости.", [10] sign-off + "До завтра!" ],
 "items": [ 5 objects for the on-screen monitor cards: intro, news1, news2, news3, signoff. each {"key": one of "news"|"rocket"|"chip"|"lock"|"chart"|"robot", "title": short headline (proper noun ok), "sub": the key number/fact, "source": short attribution, "tint": one of "indigo"|"teal"|"gold"} ],
 "ticker": [ 6-8 short strings: the 3 headlines + a few extra real AI/market tidbits, with ▼/▲ if relevant ]
}
items[0]=intro {key:"news",title:"КАПИБАРА НОВОСТИ",sub:"Главное про ИИ",source:"${TODAY}",tint:"indigo"}; items[4]=signoff {key:"robot",title:"КАПИБАРА НОВОСТИ",sub:"до завтра",source:"в эфире",tint:"indigo"}.`

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
writeFileSync('today.json', JSON.stringify(data, null, 2))
// grounding sources (proof it used real search)
const srcs = j.candidates?.[0]?.groundingMetadata?.groundingChunks?.map(c => c.web?.title).filter(Boolean) || []
console.log('=== SCRIPT ==='); data.lines.forEach(l => console.log(' •', l))
console.log('\n=== MONITOR CARDS ==='); data.items.forEach(it => console.log(` • [${it.key}] ${it.title} — ${it.sub} (${it.source})`))
console.log('\n=== TICKER ==='); data.ticker.forEach(t => console.log(' •', t))
console.log('\nsources:', srcs.slice(0, 6).join(' | ') || '(none reported)')
