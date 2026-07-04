import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const FPS = 30, SR = 16000
execFileSync('ffmpeg', ['-y', '-i', 'voice.mp3', '-ac', '1', '-ar', String(SR), '-f', 'f32le', 'voice.pcm'], { stdio: 'ignore' })

const buf = readFileSync('voice.pcm')
const samples = new Float32Array(buf.buffer, buf.byteOffset, Math.floor(buf.length / 4))
const duration = samples.length / SR
const frameCount = Math.ceil(duration * FPS)
const per = SR / FPS
const raw = []
for (let i = 0; i < frameCount; i++) {
  const a = Math.floor(i * per), b = Math.min(samples.length, Math.floor((i + 1) * per))
  let s = 0; for (let j = a; j < b; j++) s += samples[j] * samples[j]
  raw.push(b > a ? Math.sqrt(s / (b - a)) : 0)
}
const sorted = [...raw].filter(v => v > 0).sort((x, y) => x - y)
const p95 = sorted[Math.floor(sorted.length * 0.95)] || 1
let prev = 0
const env = raw.map(v => {
  let t = Math.min(1, v / p95); t = Math.pow(t, 0.7)
  prev += (t - prev) * (t > prev ? 0.6 : 0.28)
  return Math.round(prev * 1000) / 1000
})

const meta = JSON.parse(readFileSync('voiceline_meta.json', 'utf8'))
// pass through today.json ticker → scene (fixes hardcoded crypto-ticker fallback for all formats)
let tickers = null
// optional scene labels (football vertical sets brand=СПОРТ / live=ЧМ-2026 / tickerLabel=СПОРТ;
// AI-news today.json lacks these keys → stay undefined → scene uses its own defaults)
let scene = {}
try {
  const tj = JSON.parse(readFileSync('today.json', 'utf8'))
  if (Array.isArray(tj.ticker) && tj.ticker.length) tickers = tj.ticker
  for (const k of ['brand', 'live', 'ai', 'tickerLabel']) if (tj[k] != null) scene[k] = tj[k]
} catch {}
// Ticker truncation-profanity guard: a scrolling word clipped by the СВОДКА label or screen edge
// can leave a vulgar Russian suffix on a frozen frame (real catch: «потребляют» → «ебляют»).
// Any ticker item containing a word with a risky substring is dropped (headlines fallback covers).
const RISKY = ['ебля', 'ебл', 'еба', 'ёб', 'бля', 'хуй', 'хуе', 'пизд', 'залуп', 'мудак', 'сука']
if (tickers) {
  const before = tickers.length
  tickers = tickers.filter(t => !RISKY.some(r => t.toLowerCase().includes(r)))
  if (!tickers.length) tickers = null
  if (tickers && tickers.length < before) console.log(`[build-data2] ticker guard: dropped ${before - tickers.length} item(s) with truncation-risky words`)
}
// itemStart = when each line's item-run began (for scene transition timing)
const lines = meta.lines.map((L) => ({ ...L }))
for (let i = 0; i < lines.length; i++) {
  if (i > 0 && lines[i].item === lines[i - 1].item) lines[i].itemStart = lines[i - 1].itemStart
  else lines[i].itemStart = lines[i].s
}

writeFileSync('data.json', JSON.stringify({ fps: FPS, frameCount, duration: +duration.toFixed(3), env, lines, items: meta.items, ...(tickers ? { tickers } : {}), ...scene }))
console.log(`frames=${frameCount} dur=${duration.toFixed(2)}s lines=${lines.length} items=${meta.items.length}`)
