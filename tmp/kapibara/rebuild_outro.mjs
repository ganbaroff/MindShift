// rebuild_outro.mjs — standalone outro rebuild (needs GEMINI_API_KEY for TTS).
// outro_build (voice+json) → render_outro (frames) → ffmpeg assemble → outro.mp4.
// Extracted from make-clip.mjs stage 8 so CI (and anyone with the key) can rebuild the
// static outro without running the whole daily pipeline. The daily pipeline uses the
// committed outro.mp4 binary, so after this runs the file must be committed back.
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const run = (label, args) => { console.log(`\n━━━ ${label}`); execFileSync('node', args, { stdio: 'inherit' }) }
run('outro_build  →  outro.json + voice_outro.mp3', ['outro_build.mjs'])
run('render_outro →  frames_outro/', ['render_outro.mjs'])

const o = JSON.parse(readFileSync('outro.json', 'utf8'))
console.log('\n━━━ outro frames→mp4')
execFileSync('ffmpeg', [
  '-y', '-framerate', String(o.fps || 30),
  '-i', 'frames_outro/f_%05d.jpg',
  '-i', 'voice_outro.mp3',
  '-c:v', 'libx264', '-preset', 'fast', '-crf', '20', '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '192k', '-shortest',
  'outro.mp4',
], { stdio: 'inherit' })
console.log(`\noutro.mp4 rebuilt: ${o.duration}s, ${o.frameCount} frames, ctaSub="${o.ctaSub}"`)
