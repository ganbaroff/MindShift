import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { NEWS_TARGET_WPM } from './env.mjs'

const meta = JSON.parse(readFileSync('voiceline_meta.json', 'utf8'))
const pads = [0.18, 0.45, 0.22, 0.2, 0.55, 0.22, 0.55, 0.22, 0.55, 0.14, 0.3]
if (meta.lines.length !== pads.length) {
  console.warn(`[reconcat] WARNING: expected ${pads.length} lines, got ${meta.lines.length}. Extra lines get 0.3s pad.`)
}
const trim = 'silenceremove=start_periods=1:start_duration=0:start_threshold=-45dB:detection=peak,areverse,silenceremove=start_periods=1:start_duration=0:start_threshold=-45dB:detection=peak,areverse'
const dur = (f) => parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim())

// trim silence off each pre-generated line
const N = meta.lines.length
const trimmed = []
for (let n = 0; n < N; n++) {
  const inp = `ln_${String(n).padStart(2, '0')}.wav`
  const out = `tr_${String(n).padStart(2, '0')}.wav`
  execFileSync('ffmpeg', ['-y', '-i', inp, '-af', trim, '-ar', '24000', '-ac', '1', out], { stdio: 'ignore' })
  trimmed.push({ wav: out, dur: dur(out), pad: pads[n] ?? 0.3 })
}

// Factory Law 2 — pace-lock in WORDS PER MINUTE (CEO 2026-07-05: 135). Target seconds derive
// from the actual script length; speed up only (never slow), clamp 1.5x for intelligibility.
const rawTotal = trimmed.reduce((a, it) => a + it.dur + it.pad, 0)
const words = meta.lines.reduce((a, L) => a + L.text.split(/\s+/).filter(Boolean).length, 0)
const targetSec = words / NEWS_TARGET_WPM * 60
const tempo = Math.min(1.5, Math.max(1.0, rawTotal / targetSec))

// rebuild raw timeline, then scale s/e by tempo so subtitles/mouth stay in sync with the sped-up audio
let t = 0
const lines = meta.lines.map((L, n) => {
  const seg = { s: +(t / tempo).toFixed(3), e: +((t + trimmed[n].dur) / tempo).toFixed(3), text: L.text, item: L.item }
  t += trimmed[n].dur + trimmed[n].pad
  return seg
})

// concat with controlled pads → atempo (pace-lock) → loudnorm. atempo AFTER concat, BEFORE loudnorm.
const args = []
for (const it of trimmed) args.push('-i', it.wav)
let fc = '', labels = ''
trimmed.forEach((it, i) => { fc += `[${i}:a]apad=pad_dur=${it.pad}[a${i}];`; labels += `[a${i}]` })
fc += `${labels}concat=n=${trimmed.length}:v=0:a=1,atempo=${tempo},loudnorm=I=-15:TP=-1.5:LRA=10[out]`
args.push('-filter_complex', fc, '-map', '[out]', '-ar', '24000', '-b:a', '192k', '-y', 'voice.mp3')
execFileSync('ffmpeg', args, { stdio: 'ignore' })

// total = REAL ffprobe duration of the sped-up output (not the arithmetic estimate)
const total = dur('voice.mp3')
writeFileSync('voiceline_meta.json', JSON.stringify({ total, voice: meta.voice, lines, items: meta.items }))
console.log(`tempo=${tempo.toFixed(3)} raw=${rawTotal.toFixed(1)}s -> final=${total.toFixed(1)}s | ${words} words @ ${(words / total * 60).toFixed(0)} wpm (law ${NEWS_TARGET_WPM})`)
console.log(`trimmed+reconcat: ${total.toFixed(2)}s (was ${meta.total.toFixed(2)}s), ${lines.length} lines`)
console.log('line ends:', lines.map(l => l.e.toFixed(1)).join(' '))
