import './credit_gate_auto.mjs'
// gen_voice_football.mjs — TTS for the football нарезка format (variable line count).
// Reuses the proven Gemini-TTS REST shape from gen_voice.mjs, but reads football_today.json
// (lines carry their own delivery `d` + pause `p` + image cue `vz`). Writes ln_*.wav,
// voice.mp3 and voiceline_meta.json (vz preserved through to data.json via build-data2's spread).
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { requireEnv } from './env.mjs'
const key = requireEnv('GEMINI_API_KEY')

// voice: --voice=Charon (or positional arg 2 for backwards compat)
const _voiceArg = process.argv.find(a => a.startsWith('--voice='))?.split('=')[1]
  || (process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : null)
const VOICE = _voiceArg || 'Puck'
const SPEED = parseFloat(process.argv.find(a => a.startsWith('--speed='))?.split('=')[1] || '1.0')
const FAST = process.argv.includes('--fast') || SPEED > 1.01   // --fast = 1.18x pitch-preserving
const SPEED_FACTOR = FAST ? (SPEED > 1.01 ? SPEED : 1.18) : 1.0
const MODEL = 'gemini-2.5-flash-preview-tts'

// sports register: lively broadcaster, witty on punchlines — never monotone
const SB = 'Read aloud in an energetic, charismatic Russian sports-broadcaster voice — dynamic, warm, building genuine excitement, clear, never monotone:'
const SF = 'Read aloud as a Russian sports anchor landing a witty, confident line — playful timing, a little smirk, land it:'

const cfg = JSON.parse(readFileSync('football_today.json', 'utf8'))
if (!Array.isArray(cfg.lines) || !cfg.lines.length) { console.error('[gen_voice_football] football_today.json has no lines'); process.exit(1) }
const items = Array.isArray(cfg.items) && cfg.items.length ? cfg.items : [{ key: 'ball', title: '', sub: '', source: '', tint: 'teal' }]

const LINES = cfg.lines.map((L) => ({ t: L.text, p: L.p ?? 0.4, d: L.d === 'punch' ? SF : SB, vz: L.vz ?? 0 }))
console.log(`[gen_voice_football] ${LINES.length} lines, voice=${VOICE}`)

if (process.env.DRY) {
  LINES.forEach((L, n) => console.log(`  ${n} [vz ${L.vz} / ${L.d === SF ? 'punch' : 'read'}]  ${L.t}`))
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
      console.error(`  retry ${attempt} HTTP ${res.status} ${(await res.text()).slice(0, 160)}`)
    }
    await new Promise(r => setTimeout(r, 800))
  }
  throw new Error('TTS failed after retries')
}

const ffprobeDur = (f) => parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim())

const inputs = [], meta = []
let t = 0
for (let n = 0; n < LINES.length; n++) {
  const L = LINES[n]
  const rawWav = `raw_${String(n).padStart(2, '0')}.wav`
  const finalWav = `ln_${String(n).padStart(2, '0')}.wav`
  await tts(`${L.d} "${L.t}"`, rawWav)
  execFileSync('ffmpeg', ['-i', rawWav, '-ar', '24000', '-y', finalWav], { stdio: 'ignore' })
  const dur = ffprobeDur(finalWav)

  meta.push({ s: +t.toFixed(3), e: +(t + dur).toFixed(3), text: L.t, item: 0, vz: L.vz })
  inputs.push({ wav: finalWav, dur, pad: L.p })
  t += dur + L.p
  console.log(`line ${n}: ${dur.toFixed(2)}s +${L.p}s  "${L.t.slice(0, 36)}…"`)
}

// concat with silence pads + loudnorm → voice.mp3
const args = []
for (const it of inputs) args.push('-i', it.wav)
let fc = '', labels = ''
inputs.forEach((it, idx) => { fc += `[${idx}:a]apad=pad_dur=${it.pad}[a${idx}];`; labels += `[a${idx}]` })
fc += `${labels}concat=n=${inputs.length}:v=0:a=1,loudnorm=I=-15:TP=-1.5:LRA=10[out]`
args.push('-filter_complex', fc, '-map', '[out]', '-ar', '24000', '-b:a', '192k', '-y', 'voice.mp3')
execFileSync('ffmpeg', args, { stdio: ['ignore', 'ignore', 'ignore'] })

let total = ffprobeDur('voice.mp3')

// Optional speed-up: atempo preserves pitch (supports 0.5–2.0× range)
// Rescales all phrase timestamps proportionally so caption timing stays in sync
if (FAST) {
  const args2 = ['-y', '-i', 'voice.mp3']
  // atempo is limited to 0.5–2.0 — chain two filters for factor > 2.0 (we don't, but defensive)
  const filters = SPEED_FACTOR <= 2.0 ? `atempo=${SPEED_FACTOR}` : `atempo=2.0,atempo=${SPEED_FACTOR / 2}`
  args2.push('-filter:a', filters, 'voice_fast.mp3')
  execFileSync('ffmpeg', args2, { stdio: 'ignore' })
  // overwrite voice.mp3 with the sped-up version
  execFileSync('ffmpeg', ['-y', '-i', 'voice_fast.mp3', 'voice.mp3'], { stdio: 'ignore' })
  try { if (existsSync('voice_fast.mp3')) unlinkSync('voice_fast.mp3') } catch {}
  total = ffprobeDur('voice.mp3')
  // rescale phrase timestamps by 1/SPEED_FACTOR so caption timings match sped-up audio
  const inv = 1 / SPEED_FACTOR
  meta.forEach(m => { m.s = +(m.s * inv).toFixed(3); m.e = +(m.e * inv).toFixed(3) })
  console.log(`[gen_voice_football] ✓ speed up ${SPEED_FACTOR}× applied → ${total.toFixed(2)}s`)
}

writeFileSync('voiceline_meta.json', JSON.stringify({ total, voice: VOICE, speed: SPEED_FACTOR, lines: meta, items }))
// expose the football ticker to build-data2 (it reads today.json) — mirror it
try {
  const tj = { ticker: cfg.ticker || [], brand: cfg.brand, live: cfg.live, ai: cfg.ai, tickerLabel: cfg.tickerLabel }
  writeFileSync('today.json', JSON.stringify(tj, null, 2))
} catch {}
console.log(`\nvoice.mp3 ready: ${total.toFixed(2)}s, ${meta.length} lines, voice=${VOICE}`)
