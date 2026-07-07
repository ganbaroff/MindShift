// ladder_render.mjs — render the Kapibara Ladder quiz-short on the render6 pattern (per-frame, real motion).
//
// Pipeline (mirrors the news engine gen_voice → build-data2 → render6 → assemble):
//   1. per-beat Gemini TTS with LOCKED_VOICE (env.mjs, Factory Law 6 — NO argv voice), ONE frozen STYLE.
//   2. concat VO lines with pads into a single voice.mp3 (loudnorm), WPM pace-lock (Factory Law 2):
//        tempo = clamp(rawTotal / (words / NEWS_TARGET_WPM * 60), 1.0, 1.5), applied via atempo;
//        beat timings scale by 1/tempo so on-screen states track the sped-up audio.
//   3. decode final voice.mp3 → per-frame RMS envelope @30fps (build-data2 approach) for lip-sync.
//   4. render EVERY frame @30fps via Playwright workers calling window.setFrame(i).
//   5. assemble frames + voice → 1080x1920 h264+aac mp4, with guards:
//        assert rendered frame count == expected; duration sanity ±2.5s vs voice.
//
// Usage: node ladder_render.mjs   (no voice arg — LOCKED_VOICE is law).
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, existsSync, copyFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { chromium } from 'playwright'
import { LOCKED_VOICE, NEWS_TARGET_WPM } from './env.mjs'
import { synthPcm, pcmToWav } from './gemini_tts.mjs'

const VOICE = LOCKED_VOICE                 // Factory Law 6 — one voice per character, no CLI override

// CTA guard — the on-screen bot username must EXIST in Telegram before it gets baked into frames.
// (Live catch 2026-07-05: placeholder @KapibaraSchoolBot from the strategy doc shipped into the
// exemplar; the CEO caught it, no gate did. A t.me page titled "Telegram: Contact @x" = unregistered.)
async function assertBotExists(handle) {
  const u = handle.replace(/^@/, '')
  const html = await (await fetch(`https://t.me/${u}`)).text()
  const title = (html.match(/property="og:title" content="([^"]*)"/) || [])[1] || ''
  if (!title || /^Telegram: Contact/i.test(title)) {
    console.error(`[cta-guard] bot ${handle} does NOT exist in Telegram (t.me title: "${title}") — fix EP.bot before rendering.`)
    process.exit(1)
  }
  console.log(`[cta-guard] ${handle} exists: "${title}" ✓`)
}
const TTS_MODEL = 'gemini-2.5-flash-preview-tts'
const EP = JSON.parse(readFileSync(process.argv[2] || 'ladder_ep01_token.json', 'utf8'))
await assertBotExists(EP.bot) // CTA guard fires before any TTS/render spend
const epSlug = (process.argv[2] || 'ep01').replace(/\.json$/, '').replace(/^.*[\\/]/, '')
const OUT = `ladder_runs/${epSlug}`
const FPS = 30, SR = 16000
mkdirSync(OUT, { recursive: true })

// Factory Law 7 — ONE frozen STYLE directive for every line (same warm, energetic, charismatic anchor
// delivery as the news engine, worded for this quiz-host in English since the episode is lang:en). It
// keeps one speaker throughout and lands the playful beats with light comedic timing.
const STYLE = 'Read aloud in one warm, energetic, charismatic quiz-host voice — clear, upbeat, and lively, never monotone; keep the same speaker throughout and land the playful lines with light comedic timing:'

const PAD = 0.28 // seconds of held silence after each VO line

// 7 beats: hook → question → options → micro → think → reveal → cta (Factory Law 1 skeleton).
// VO text is read from the episode JSON (Factory Law 9 — one source of truth). think has no VO line
// in the JSON's phrasing? it does (vo.think). options+micro are one JSON line ("options" ends with the
// eliminate payoff); split here so the beat holds long enough — but text stays sourced from EP.vo.
const V = EP.vo
// CEO 2026-07-05: NO option may disappear before the viewer's think-time — all 4 chips live
// through the countdown; the elimination beat comes AFTER 3-2-1 as the reveal warm-up.
const BEATS = []
if (EP.hasHook) {
  BEATS.push({ state: 'hook', text: V.hook })
}
BEATS.push(
  { state: 'question', text: V.question },
  { state: 'options',  text: EP.options.map(o => `${o.id}: ${o.text}`).join('. ') + '.' },
  { state: 'think',    text: V.think },
  { state: 'micro',    text: V.micro || `Not that one — ${(EP.options.find(o => o.id === EP.eliminateEarlyId) || {}).text || 'one'} is out.` },
  { state: 'reveal',   text: V.reveal }
)
if (EP.isLast) {
  BEATS.push({ state: 'cta', text: V.cta })
} else {
  BEATS.push({ state: 'bridge', text: V.bridge })
}

// ── TTS one line → wav, returns duration (seconds) ──
// Credits-first (gemini_tts.mjs): free AI-Studio key, auto-fallback to Vertex-on-credits on 429.
async function tts(text, outWav) {
  if (existsSync(outWav)) {
    return dur(outWav)
  }
  const { pcm, via } = await synthPcm(`${STYLE} "${text}"`, VOICE)
  if (via !== 'aistudio-free') console.log(`  tts via ${via}`)
  writeFileSync(outWav, pcmToWav(pcm))
  return pcm.length / (24000 * 2)
}
const dur = f => parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim())

// ── 1) synth each beat's VO ──
const segs = []
for (let i = 0; i < BEATS.length; i++) {
  const b = BEATS[i]
  const wav = `${OUT}/vo_${i}_${b.state}.wav`
  
  // Cache lookup: check if any file ending with _${b.state}.wav exists in OUT
  if (!existsSync(wav)) {
    const existing = readdirSync(OUT).find(f => f.endsWith(`_${b.state}.wav`))
    if (existing && b.state !== 'bridge') {
      console.log(`[cache] Reusing existing beat audio: copying ${existing} -> ${wav}`)
      copyFileSync(`${OUT}/${existing}`, wav)
    }
  }

  const d = await tts(b.text, wav)
  segs.push({ ...b, wav, voDur: d })
  console.log(`beat ${i} [${b.state}] vo=${d.toFixed(2)}s`)
}

// ── 2) WPM pace-lock (Factory Law 2) ──
const words = BEATS.reduce((a, b) => a + b.text.trim().split(/\s+/).filter(Boolean).length, 0)
const rawTotal = segs.reduce((a, s) => a + s.voDur + PAD, 0)
const targetSec = words / NEWS_TARGET_WPM * 60
const TEMPO = Math.min(1.5, Math.max(1.0, rawTotal / targetSec))
console.log(`words=${words} rawTotal=${rawTotal.toFixed(2)}s target(@${NEWS_TARGET_WPM}wpm)=${targetSec.toFixed(2)}s tempo=${TEMPO.toFixed(3)} -> final~${(rawTotal / TEMPO).toFixed(2)}s`)

// per-beat segment duration AFTER tempo; beat timeline (seconds) for setFrame state alignment
let acc = 0
const beatTimeline = segs.map(s => {
  const segDur = +((s.voDur + PAD) / TEMPO).toFixed(3)
  const beat = { state: s.state, text: s.text, s: +acc.toFixed(3), e: +(acc + segDur).toFixed(3) }
  acc += segDur
  return beat
})
const videoSec = acc

// ── 3) build voice.mp3: each line + PAD silence, concat, atempo (pace-lock), loudnorm ──
const aArgs = []
for (const s of segs) aArgs.push('-i', s.wav)
let fc = '', labels = ''
segs.forEach((s, i) => { fc += `[${i}:a]apad=pad_dur=${PAD}[a${i}];`; labels += `[a${i}]` })
fc += `${labels}concat=n=${segs.length}:v=0:a=1,atempo=${TEMPO.toFixed(3)},loudnorm=I=-16:TP=-1.5:LRA=11[out]`
aArgs.push('-filter_complex', fc, '-map', '[out]', '-ar', '24000', '-b:a', '192k', '-y', `${OUT}/voice.mp3`)
execFileSync('ffmpeg', aArgs, { stdio: ['ignore', 'ignore', 'ignore'] })
const voiceSec = dur(`${OUT}/voice.mp3`)
console.log(`voice.mp3 = ${voiceSec.toFixed(2)}s  (video timeline = ${videoSec.toFixed(2)}s)`)

// ── 4) envelope from the FINAL voice (build-data2 approach): RMS per 1/FPS frame, p95-normalised ──
execFileSync('ffmpeg', ['-y', '-i', `${OUT}/voice.mp3`, '-ac', '1', '-ar', String(SR), '-f', 'f32le', `${OUT}/voice.pcm`], { stdio: 'ignore' })
const pbuf = readFileSync(`${OUT}/voice.pcm`)
const samples = new Float32Array(pbuf.buffer, pbuf.byteOffset, Math.floor(pbuf.length / 4))
const audioDur = samples.length / SR
const frameCount = Math.ceil(audioDur * FPS)
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
const env = raw.map(v => { let t = Math.min(1, v / p95); t = Math.pow(t, 0.7); prev += (t - prev) * (t > prev ? 0.6 : 0.28); return Math.round(prev * 1000) / 1000 })

const data = { fps: FPS, frameCount, duration: +audioDur.toFixed(3), env, beats: beatTimeline, series: EP.series, disclosure: EP.disclosure }
writeFileSync(`${OUT}/ladder_data.json`, JSON.stringify(data))
console.log(`data: frames=${frameCount} dur=${audioDur.toFixed(2)}s beats=${beatTimeline.length}`)

// ── 5) render EVERY frame @30fps via Playwright workers ──
const FRAMES = `${OUT}/frames`
rmSync(FRAMES, { recursive: true, force: true })
mkdirSync(FRAMES, { recursive: true })
const url = pathToFileURL('kapibara_ladder.html').href
const WORKERS = 3
async function worker(wid) {
  const b = await chromium.launch()
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 })
  await p.addInitScript(ep => { window.EP = ep }, EP)
  await p.goto(url)
  await p.evaluate(d => window.loadData(d), data)
  for (let i = wid; i < frameCount; i += WORKERS) {
    await p.evaluate(f => window.setFrame(f), i)
    await p.screenshot({ path: `${FRAMES}/f_${String(i).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 90, animations: 'disabled' })
  }
  await b.close()
}
await Promise.all(Array.from({ length: WORKERS }, (_, i) => worker(i)))

// GUARD: rendered frame count must equal expected
const rendered = readdirSync(FRAMES).filter(f => /^f_\d{5}\.jpg$/.test(f)).length
if (rendered !== frameCount) { console.error(`FATAL: rendered ${rendered} frames, expected ${frameCount}`); process.exit(1) }
console.log(`frames rendered: ${rendered}/${frameCount} ✓`)

// ── 6) assemble frames + voice → final mp4 ──
const finalOut = `${OUT}/kapibara-ladder-${epSlug}.mp4`
execFileSync('ffmpeg', [
  '-framerate', String(FPS), '-i', `${FRAMES}/f_%05d.jpg`,
  '-i', `${OUT}/voice.mp3`,
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-vf', 'scale=1080:1920',
  '-c:a', 'aac', '-b:a', '192k', '-shortest', '-y', finalOut,
], { stdio: ['ignore', 'ignore', 'ignore'] })

const finalSec = dur(finalOut)
console.log(`\nDONE ${finalOut}`)
console.log(`voice=${voiceSec.toFixed(2)}s frames=${frameCount} (${(frameCount / FPS).toFixed(2)}s) final=${finalSec.toFixed(2)}s`)

// GUARD: final duration sanity ±2.5s vs voice
const drift = Math.abs(finalSec - voiceSec)
if (drift > 2.5) { console.error(`FATAL: final duration ${finalSec.toFixed(2)}s drifts ${drift.toFixed(2)}s from voice ${voiceSec.toFixed(2)}s (>2.5s)`); process.exit(1) }

// report the pace numbers the acceptance step asks for
const wpm = words / (voiceSec / 60)
console.log(`\nPACE: words=${words} voice=${voiceSec.toFixed(2)}s wpm=${wpm.toFixed(1)} tempo=${TEMPO.toFixed(3)} (target ${NEWS_TARGET_WPM})`)
console.log(`GUARDS: frames ${rendered}==${frameCount} ✓  drift ${drift.toFixed(2)}s ≤2.5 ✓`)
