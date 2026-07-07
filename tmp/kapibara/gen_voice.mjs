import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { LOCKED_VOICE } from './env.mjs'
import { synthPcm, pcmToWav } from './gemini_tts.mjs'

// Factory Law 6 — voice is the LOCKED_VOICE constant, not a CLI flag. No argv override.
const VOICE = LOCKED_VOICE
const MODEL = 'gemini-2.5-flash-preview-tts'

// Factory Law 7 — ONE frozen style directive for every line (was two: B anchor + F punchline,
// which made lines sound like different speakers). Punchline flavor now comes from the TEXT,
// not a different voice directive. Same warm, energetic, charismatic English news-anchor
// delivery that also lands jokes with light comedic timing.
const STYLE = 'Read aloud in one warm, energetic, charismatic English TV news-anchor voice — clear, upbeat, and lively, never monotone; keep the same speaker throughout and land the jokes with light comedic timing:'

// 11-line template → [scene-item index, pause(s) after]. One STYLE for all lines.
// [0] title, [1] hook(item0), [2-4] news1, [5-6] news2, [7-8] news3, [9] title, [10] signoff
const TPL = [
  { i: 0, p: 0.18, d: STYLE }, { i: 0, p: 0.55, d: STYLE },
  { i: 1, p: 0.22, d: STYLE }, { i: 1, p: 0.2, d: STYLE }, { i: 1, p: 0.6, d: STYLE },
  { i: 2, p: 0.22, d: STYLE }, { i: 2, p: 0.6, d: STYLE },
  { i: 3, p: 0.22, d: STYLE }, { i: 3, p: 0.6, d: STYLE },
  { i: 4, p: 0.14, d: STYLE }, { i: 4, p: 0.3, d: STYLE },
]

// FALLBACK content — used ONLY if today.json is missing/invalid (preserves the proven path). Hook de-shamed (Constitution Law 3).
const FALLBACK_ITEMS = [
  { key: 'news',    title: 'KAPIBARA NEWS',   sub: 'Today in AI',       source: 'today',          tint: 'indigo' },
  { key: 'rocket',  title: 'SpaceX × Cursor', sub: '$60B',              source: 'biggest deal',   tint: 'teal' },
  { key: 'chip',    title: 'Gemini 3.5 Pro',  sub: '2,000,000 tokens',  source: 'Google',         tint: 'indigo' },
  { key: 'lock',    title: 'Claude Fable 5',  sub: 'free tier closed',  source: 'Anthropic',      tint: 'gold' },
  { key: 'signoff', title: 'KAPIBARA NEWS',   sub: 'see you tomorrow',  source: 'live',           tint: 'indigo' },
]
const FALLBACK_TEXT = [
  'Kapibara News!',
  'Three AI stories — while the world was asleep.',
  'SpaceX just bought Cursor for sixty billion dollars.',
  'Yes, your code editor is now part of a rocket company.',
  'Autocomplete has officially left the atmosphere.',
  'The new Gemini holds two million tokens in its head.',
  'Two million! I walk into the kitchen and forget why.',
  'And free Claude Fable five got closed after just a couple of weeks.',
  'The free lunch, as always, waved us goodbye.',
  'That was Kapibara News.',
  'The world is going wild — we keep a calm paw on the pulse. See you tomorrow!',
]

// CONNECT (fix Kimi disconnect #1): voice the FRESH script from gen_news (today.json). Fallback if absent/invalid.
let texts = FALLBACK_TEXT, items = FALLBACK_ITEMS, srcTag = 'fallback'
if (existsSync('today.json')) {
  try {
    const tj = JSON.parse(readFileSync('today.json', 'utf8'))
    if (Array.isArray(tj.lines) && tj.lines.length === TPL.length && Array.isArray(tj.items) && tj.items.length === 5) {
      texts = tj.lines; items = tj.items; srcTag = 'today.json'
    } else {
      console.warn(`[gen_voice] today.json shape off (lines=${tj.lines?.length}, items=${tj.items?.length}, need ${TPL.length}/5) → fallback`)
    }
  } catch (e) { console.warn('[gen_voice] today.json parse failed → fallback:', e.message) }
}
const LINES = texts.map((t, n) => ({ t, i: TPL[n].i, p: TPL[n].p, d: TPL[n].d }))
console.log(`[gen_voice] script source: ${srcTag} (${LINES.length} lines, voice=${VOICE} [LOCKED], single STYLE for all lines)`)

// DRY=1 → print the mapped script and exit, no TTS (cheap connection check)
if (process.env.DRY) {
  console.log('\n=== MAPPED LINES ===')
  LINES.forEach((L, n) => console.log(`  ${n} [item ${L.i} / STYLE]  ${L.t}`))
  console.log('\n=== SCENE ITEMS ===')
  items.forEach((it, n) => console.log(`  ${n} [${it.key}] ${it.title} — ${it.sub} (${it.source}) {${it.tint}}`))
  process.exit(0)
}

// Credits-first: free AI Studio key, auto-fallback to Vertex-on-credits on 429/quota (gemini_tts.mjs).
async function tts(text, outWav) {
  const { pcm, via } = await synthPcm(text, VOICE)
  if (via !== 'aistudio-free') console.log(`  tts via ${via}`)
  writeFileSync(outWav, pcmToWav(pcm))
  return pcm.length / (24000 * 2)
}

function ffprobeDur(f) {
  return parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim())
}

// Per-line checkpoint cache (reliable-execution rule 7 + WORKFLOW-AUDIT item 7).
// Without this, a 429 mid-run re-spends ALL 11 TTS calls on the next --skip-news rerun,
// which is what burns the free-tier 100-req/day cap (retryDelay ~18h when hit).
// A line's wav is reused ONLY when its EXACT text+voice already produced it; if today.json
// changed (fresh news) the text won't match → regenerate. Never reuses stale/wrong audio.
const CACHE = 'voice_cache.json'
let cache = {}
if (existsSync(CACHE)) { try { cache = JSON.parse(readFileSync(CACHE, 'utf8')) } catch { cache = {} } }

// 1) synth each line (or reuse cached), 2) build timeline with pauses, 3) concat -> voice.mp3
const inputs = [], meta = []
let t = 0, reused = 0
for (let n = 0; n < LINES.length; n++) {
  const L = LINES[n]
  const wav = `ln_${String(n).padStart(2, '0')}.wav`
  const c = cache[n]
  let dur
  if (c && c.text === L.t && c.voice === VOICE && existsSync(wav)) {
    dur = ffprobeDur(wav); reused++
    console.log(`line ${n}: ${dur.toFixed(2)}s +${L.p}s pause  [cached] "${L.t.slice(0, 32)}…"`)
  } else {
    dur = await tts(`${L.d} "${L.t}"`, wav)
    cache[n] = { text: L.t, voice: VOICE }        // checkpoint immediately so a later 429 keeps this line
    writeFileSync(CACHE, JSON.stringify(cache))
    console.log(`line ${n}: ${dur.toFixed(2)}s +${L.p}s pause  "${L.t.slice(0, 32)}…"`)
  }
  meta.push({ s: +t.toFixed(3), e: +(t + dur).toFixed(3), text: L.t, item: L.i })
  inputs.push({ wav, dur, pad: L.p })
  t += dur + L.p
}
if (reused) console.log(`[gen_voice] reused ${reused}/${LINES.length} cached lines (saved ${reused} TTS calls)`)

// build ffmpeg concat with silence pads via filter_complex
const args = []
for (const it of inputs) args.push('-i', it.wav)
let fc = '', labels = ''
inputs.forEach((it, idx) => {
  // each line, then pad silence appended via apad
  fc += `[${idx}:a]apad=pad_dur=${it.pad}[a${idx}];`
  labels += `[a${idx}]`
})
fc += `${labels}concat=n=${inputs.length}:v=0:a=1,loudnorm=I=-16:TP=-1.5:LRA=11[out]`
args.push('-filter_complex', fc, '-map', '[out]', '-ar', '24000', '-b:a', '192k', '-y', 'voice.mp3')
execFileSync('ffmpeg', args, { stdio: ['ignore', 'ignore', 'ignore'] })

const total = ffprobeDur('voice.mp3')
writeFileSync('voiceline_meta.json', JSON.stringify({ total, voice: VOICE, lines: meta, items }))
console.log(`\nvoice.mp3 ready: ${total.toFixed(2)}s, ${meta.length} lines, voice=${VOICE}`)
