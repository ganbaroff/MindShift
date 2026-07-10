import './credit_gate_auto.mjs'
import { readFileSync, writeFileSync } from 'node:fs'

const env = readFileSync('C:/Projects/mindshift/.env', 'utf8')
const key = (env.match(/^GEMINI_API_KEY=(.*)$/m) || [])[1]?.trim().replace(/^["']|["']$/g, '')
if (!key) { console.error('no key'); process.exit(1) }

const data = JSON.parse(readFileSync('data.json', 'utf8'))
const tickerRU = ['Brent $72.9 ▼ — Ормузский пролив открыт, поставки растут', 'BTC $59 800 ▼', 'ETH $1 575 ▼', 'USD/AZN 1.70', 'EUR/USD 1.14', 'SpaceX купил Cursor за $60 млрд', 'Tether обогнал Ethereum по капитализации', 'ИИ-модели выходят каждые два дня']

const payload = {
  lines: data.lines.map(l => l.text),
  itemSubs: data.items.map(i => i.sub),
  itemSources: data.items.map(i => i.source),
  ticker: tickerRU,
}

const prompt = `Translate the Russian strings in this JSON to natural, idiomatic AZERBAIJANI (Azərbaycan dili, Latin script with ə ğ ş ç ö ü ı İ).
Rules:
- Adapt, do NOT translate word-for-word. Keep the punchy TV-news-anchor tone and the humor.
- Do NOT translate brand/product names or tickers: SpaceX, Cursor, Gemini, Claude Fable 5, Tether, Ethereum, Bitcoin, Brent, BTC, ETH, USD, AZN, EUR. Keep all numbers/symbols (▼, $, %) as-is.
- Return ONLY valid JSON with the SAME shape and array lengths: {"lines":[...],"itemSubs":[...],"itemSources":[...],"ticker":[...]}.
INPUT:
${JSON.stringify(payload)}`

async function call(model) {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST', headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.4 } }),
  })
  if (!r.ok) throw new Error(`${model} HTTP ${r.status} ${(await r.text()).slice(0, 160)}`)
  const j = await r.json()
  return j.candidates?.[0]?.content?.parts?.find(p => p.text)?.text
}

let txt
for (const m of ['gemini-3-flash-preview', 'gemini-2.5-flash']) {
  try { txt = await call(m); console.log('translated via', m); break } catch (e) { console.error(String(e).slice(0, 120)) }
}
if (!txt) { console.error('translation failed'); process.exit(2) }
const az = JSON.parse(txt)

const out = {
  ...data,
  lines: data.lines.map((l, i) => ({ ...l, text: az.lines[i] ?? l.text })),
  items: data.items.map((it, i) => ({ ...it, sub: az.itemSubs[i] ?? it.sub, source: az.itemSources[i] ?? it.source })),
  tickers: az.ticker,
}
writeFileSync('data_az.json', JSON.stringify(out))
console.log('\n--- AZ subtitles ---')
out.lines.forEach(l => console.log(' •', l.text))
console.log('--- AZ ticker ---'); out.tickers.forEach(t => console.log(' •', t))
