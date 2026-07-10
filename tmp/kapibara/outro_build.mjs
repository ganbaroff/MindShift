import './credit_gate_auto.mjs'
// Outro duet: Mochi (capy) + Yusif low baritone, per-speaker lip-sync.
// Factory Law 6: one voice per CHARACTER, constants — no CLI overrides.
// Capy = LOCKED_VOICE (must match the show body, else a jarring speaker-switch — critic catch 2026-07-05).
// Yusif = second CHARACTER (his avatar on screen) → legitimate distinct voice, pinned.
import { readFileSync, writeFileSync, renameSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { requireEnv, LOCKED_VOICE } from './env.mjs'
const key = requireEnv('GEMINI_API_KEY')

const CAPY_VOICE = LOCKED_VOICE                   // Mochi — same voice as the show body
const YUSIF_VOICE = 'Charon'                      // Yusif — deep baritone, pinned
const MODEL = 'gemini-2.5-flash-preview-tts'
const FPS = 30, SR = 16000

// shame-free duet (Constitution Law 3). Mochi hands off, founder calls to subscribe.
// Same delivery core as gen_voice.mjs STYLE — one voice + one delivery = no speaker-switch feel
// at the body→outro boundary (critic evidence 2026-07-05 at 00:31). Sign-off warmth comes from the text.
const DN = 'Read aloud in one warm, energetic, charismatic English TV news-anchor voice — clear, upbeat, and lively, never monotone; keep the same speaker throughout and land the jokes with light comedic timing:'
const DY = 'Read aloud in a deep, low baritone male voice — resonant chest tone, warm and energetic like a charismatic founder talking straight to camera in English, lively and confident, never flat or monotone:'
// sp = per-line audio speed-up (atempo, pitch-preserving). CEO 2026-07-07: the Yusif part
// ("I'm Yusif — I make the news") drags — speed his two lines only, keep Mochi natural.
const LINES = [
  { who: 'capy',  voice: CAPY_VOICE,  t: 'That was Kapibara News. Thanks for watching!',   p: 0.34, d: DN, sp: 1.0 },
  { who: 'yusif', voice: YUSIF_VOICE, t: "I'm Yusif — I make Kapibara News.",               p: 0.22, d: DY, sp: 1.3 },
  { who: 'yusif', voice: YUSIF_VOICE, t: 'Enjoyed it? Subscribe — see you tomorrow!',        p: 0.26, d: DY, sp: 1.3 },
]

async function tts(text, voice, outWav) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, {
      method: 'POST', headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text }] }], generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } } }),
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
    } else { console.error(`  retry ${attempt} HTTP ${res.status} ${(await res.text()).slice(0, 160)}`) }
    await new Promise(r => setTimeout(r, 800))
  }
  throw new Error('TTS failed after retries')
}
function ffprobeDur(f) { return parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim()) }
function rawFromWav(wav) {
  const pcmf = wav.replace(/\.wav$/, '.pcm')
  execFileSync('ffmpeg', ['-y', '-i', wav, '-ac', '1', '-ar', String(SR), '-f', 'f32le', pcmf], { stdio: 'ignore' })
  const buf = readFileSync(pcmf)
  const s = new Float32Array(buf.buffer, buf.byteOffset, Math.floor(buf.length / 4))
  const per = SR / FPS, n = Math.ceil(s.length / SR * FPS), out = []
  for (let i = 0; i < n; i++) { const a = Math.floor(i * per), b = Math.min(s.length, Math.floor((i + 1) * per)); let q = 0; for (let j = a; j < b; j++) q += s[j] * s[j]; out.push(b > a ? Math.sqrt(q / (b - a)) : 0) }
  return out
}
function smoothNorm(raw) {
  const nz = raw.filter(v => v > 0).sort((x, y) => x - y); const p95 = nz[Math.floor(nz.length * 0.95)] || 1
  let prev = 0
  return raw.map(v => { let z = Math.min(1, v / p95); z = Math.pow(z, 0.7); prev += (z - prev) * (z > prev ? 0.6 : 0.28); return Math.round(prev * 1000) / 1000 })
}

// 1) synth each line, capture timeline + per-line raw envelope
const inputs = [], lineMeta = []
let t = 0
for (let n = 0; n < LINES.length; n++) {
  const L = LINES[n]
  const wav = `octa_${n}.wav`
  let dur = await tts(`${L.d} "${L.t}"`, L.voice, wav)
  if (L.sp && L.sp !== 1) {                 // pitch-preserving speed-up for this speaker's line
    const fast = `octa_${n}_f.wav`
    execFileSync('ffmpeg', ['-y', '-i', wav, '-filter:a', `atempo=${L.sp}`, fast], { stdio: 'ignore' })
    renameSync(fast, wav)
    dur = ffprobeDur(wav)                   // envelope + timeline derive from the sped file → lip-sync stays aligned
  }
  lineMeta.push({ s: +t.toFixed(3), e: +(t + dur).toFixed(3), text: L.t, who: L.who, raw: rawFromWav(wav) })
  inputs.push({ wav, pad: L.p })
  t += dur + L.p
  console.log(`line ${n} [${L.who}/${L.voice}]${L.sp !== 1 ? ` x${L.sp}` : ''}: ${dur.toFixed(2)}s +${L.p}s  "${L.t.slice(0, 36)}"`)
}

// 2) concat (in order) with silence pads + loudnorm -> voice_outro.mp3
const args = []
for (const it of inputs) args.push('-i', it.wav)
let fc = '', labels = ''
inputs.forEach((it, idx) => { fc += `[${idx}:a]apad=pad_dur=${it.pad}[a${idx}];`; labels += `[a${idx}]` })
fc += `${labels}concat=n=${inputs.length}:v=0:a=1,loudnorm=I=-16:TP=-1.5:LRA=11[out]`
args.push('-filter_complex', fc, '-map', '[out]', '-ar', '24000', '-b:a', '192k', '-y', 'voice_outro.mp3')
execFileSync('ffmpeg', args, { stdio: ['ignore', 'ignore', 'ignore'] })

// 3) per-speaker envelopes scattered onto the global timeline
const total = ffprobeDur('voice_outro.mp3')
const frameCount = Math.ceil(total * FPS)
const rawCapy = new Array(frameCount).fill(0), rawYusif = new Array(frameCount).fill(0)
for (const L of lineMeta) {
  const sf = Math.round(L.s * FPS), tgt = L.who === 'capy' ? rawCapy : rawYusif
  for (let k = 0; k < L.raw.length; k++) { const idx = sf + k; if (idx >= 0 && idx < frameCount) tgt[idx] = L.raw[k] }
}
const envCapy = smoothNorm(rawCapy), envYusif = smoothNorm(rawYusif)

const out = {
  fps: FPS, frameCount, duration: +total.toFixed(3), envCapy, envYusif,
  lines: lineMeta.map(({ s, e, text, who }) => ({ s, e, text, who })),
  brand: { top: 'KAPIBARA', bottom: 'NEWS' },
  kicker: 'THANKS FOR WATCHING',
  cta: 'SUBSCRIBE', ctaSub: '@volaura.kapibara · new episode daily',
  names: { capy: 'anchor', yusif: 'Yusif · founder' },
  voices: { capy: CAPY_VOICE, yusif: YUSIF_VOICE },
}
writeFileSync('outro.json', JSON.stringify(out))
console.log(`\noutro.json ready: ${total.toFixed(2)}s, ${frameCount} frames, capy=${CAPY_VOICE} yusif=${YUSIF_VOICE}`)
