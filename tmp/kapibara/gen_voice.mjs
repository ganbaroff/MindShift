import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { requireEnv } from './env.mjs'
const key = requireEnv('GEMINI_API_KEY')

const VOICE = process.argv[2] || 'Puck'
const MODEL = 'gemini-2.5-flash-preview-tts'

// delivery styles
const B = 'Read aloud in an energetic, charismatic, lively Russian TV news-anchor voice — clear, upbeat, dynamic, never monotone:'
const F = 'Read aloud as a Russian news anchor delivering a punchline — playful comedic timing, a little smirk, land it:'

// 11-line template → [scene-item index, pause(s) after, delivery]
// [0] title, [1] hook(item0), [2-4] news1, [5-6] news2, [7-8] news3, [9] title, [10] signoff
const TPL = [
  { i: 0, p: 0.18, d: B }, { i: 0, p: 0.55, d: B },
  { i: 1, p: 0.22, d: B }, { i: 1, p: 0.2, d: B }, { i: 1, p: 0.6, d: F },
  { i: 2, p: 0.22, d: B }, { i: 2, p: 0.6, d: F },
  { i: 3, p: 0.22, d: B }, { i: 3, p: 0.6, d: F },
  { i: 4, p: 0.14, d: B }, { i: 4, p: 0.3, d: B },
]

// FALLBACK content — used ONLY if today.json is missing/invalid (preserves the proven path). Hook de-shamed (Constitution Law 3).
const FALLBACK_ITEMS = [
  { key: 'news',    title: 'КАПИБАРА НОВОСТИ', sub: 'Главное про ИИ',     source: 'сегодня',           tint: 'indigo' },
  { key: 'rocket',  title: 'SpaceX × Cursor',   sub: '$60 млрд',          source: 'крупнейшая сделка', tint: 'teal' },
  { key: 'chip',    title: 'Gemini 3.5 Pro',    sub: '2 000 000 токенов', source: 'Google',            tint: 'indigo' },
  { key: 'lock',    title: 'Claude Fable 5',    sub: 'халява закрыта',    source: 'Anthropic',         tint: 'gold' },
  { key: 'signoff', title: 'КАПИБАРА НОВОСТИ', sub: 'до завтра',         source: 'в эфире',           tint: 'indigo' },
]
const FALLBACK_TEXT = [
  'Капибара Новости!',
  'Три новости из мира ИИ — пока мир спал.',
  'SpaceX купил Cursor за шестьдесят миллиардов долларов.',
  'Да, твой редактор кода теперь часть ракетной компании.',
  'Автокомплит официально улетел в космос.',
  'Новый Gemini держит в голове два миллиона токенов.',
  'Два миллиона! А я захожу на кухню и забываю зачем.',
  'А бесплатный Claude Fable пять прикрыли уже через пару недель.',
  'Халява, как всегда, помахала лапкой.',
  'Это была Капибара Новости.',
  'Мир сходит с ума — а мы держим лапу на пульсе. До завтра!',
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
console.log(`[gen_voice] script source: ${srcTag} (${LINES.length} lines, voice=${VOICE})`)

// DRY=1 → print the mapped script and exit, no TTS (cheap connection check)
if (process.env.DRY) {
  console.log('\n=== MAPPED LINES ===')
  LINES.forEach((L, n) => console.log(`  ${n} [item ${L.i} / ${L.d === F ? 'punch' : 'read'}]  ${L.t}`))
  console.log('\n=== SCENE ITEMS ===')
  items.forEach((it, n) => console.log(`  ${n} [${it.key}] ${it.title} — ${it.sub} (${it.source}) {${it.tint}}`))
  process.exit(0)
}

async function tts(text, outWav) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text }] }],
        generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } } },
      }),
    })
    if (res.ok) {
      const j = await res.json()
      const b64 = j.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data
      if (b64) {
        const pcm = Buffer.from(b64, 'base64')
        const sr = 24000, ch = 1, bps = 16, ba = ch * bps / 8, br = sr * ba
        const h = Buffer.alloc(44)
        h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8)
        h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(ch, 22)
        h.writeUInt32LE(sr, 24); h.writeUInt32LE(br, 28); h.writeUInt16LE(ba, 32); h.writeUInt16LE(bps, 34)
        h.write('data', 36); h.writeUInt32LE(pcm.length, 40)
        writeFileSync(outWav, Buffer.concat([h, pcm]))
        return pcm.length / br
      }
    } else {
      const body = (await res.text()).slice(0, 200)
      console.error(`  retry ${attempt} HTTP ${res.status} ${body}`)
    }
    await new Promise(r => setTimeout(r, 800))
  }
  throw new Error('TTS failed after retries')
}

function ffprobeDur(f) {
  return parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim())
}

// 1) synth each line, 2) build timeline with pauses, 3) concat -> voice.mp3
const inputs = [], meta = []
let t = 0
for (let n = 0; n < LINES.length; n++) {
  const L = LINES[n]
  const wav = `ln_${String(n).padStart(2, '0')}.wav`
  const dur = await tts(`${L.d} "${L.t}"`, wav)
  meta.push({ s: +t.toFixed(3), e: +(t + dur).toFixed(3), text: L.t, item: L.i })
  inputs.push({ wav, dur, pad: L.p })
  t += dur + L.p
  console.log(`line ${n}: ${dur.toFixed(2)}s +${L.p}s pause  "${L.t.slice(0, 32)}…"`)
}

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
