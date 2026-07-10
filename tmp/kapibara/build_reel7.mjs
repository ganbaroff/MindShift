// build_reel7.mjs — CEO fix: the SITE moves (static device, continuous scroll inside). Forward march
// through framed3d, ONE cut per body VO line (no rewinds, no re-zoom of the same frame), then CTA card.
import { readFileSync, writeFileSync, rmSync, mkdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
const dur = f => parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim())
const SH = 'shots7'; rmSync(SH, { recursive: true, force: true }); mkdirSync(SH, { recursive: true })
const meta = JSON.parse(readFileSync('agency_vo_meta.json', 'utf8'))
const D = +dur('agency_voice.mp3').toFixed(2)
const FD = +dur('framed3d.mp4').toFixed(2)
const starts = meta.map(m => m.start)
const bodyT = starts[4]                                   // body = lines 0..3, CTA line = 4
const cardT = +(D - bodyT).toFixed(2)
// forward span of framed3d shared across the 4 body lines, proportional to each line's screen time
const V0 = 0.25, V1 = Math.max(V0 + 2, FD - 0.20), span = V1 - V0
const lineDurs = []
for (let i = 0; i < 4; i++) lineDurs.push(+((starts[i + 1] - starts[i]).toFixed(3)))
const totalBody = lineDurs.reduce((a, d) => a + d, 0)
let vpos = V0
const files = []
lineDurs.forEach((ld, i) => {
  const vlen = +(span * (ld / totalBody)).toFixed(3)     // framed3d length mapped to this line
  const a = +vpos.toFixed(3)
  const factor = +(vlen / ld).toFixed(4)                 // ~1 → natural continuous speed (no slow-mo drag)
  const out = `${SH}/${String(i).padStart(2, '0')}.mp4`
  execFileSync('ffmpeg', ['-y', '-ss', String(a), '-t', String(vlen), '-i', 'framed3d.mp4',
    '-vf', `setpts=${(1 / factor).toFixed(4)}*PTS,scale=1080:1920,setsar=1,fps=30`, '-an', '-c:v', 'libx264', '-preset', 'fast', '-pix_fmt', 'yuv420p', out], { stdio: 'ignore' })
  files.push(out.split('/').pop()); vpos = a + vlen
})
// CTA end card (fade in)
const card = `${SH}/zz_card.mp4`
execFileSync('ffmpeg', ['-y', '-loop', '1', '-t', String(cardT), '-i', 'endcard.png',
  '-vf', `scale=1080:1920,fps=30,fade=t=in:st=0:d=0.4`, '-c:v', 'libx264', '-preset', 'fast', '-pix_fmt', 'yuv420p', card], { stdio: 'ignore' })
files.push('zz_card.mp4')
writeFileSync(`${SH}/list.txt`, files.map(f => `file '${f}'`).join('\n'))
execFileSync('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', `${SH}/list.txt`, '-c', 'copy', `${SH}/vis.mp4`], { stdio: 'ignore' })
// subtitles + brand overline (body only)
const t = s => { const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), sec = (s % 60).toFixed(2); return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(5, '0')}` }
const head = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Sub,IBM Plex Sans,58,&H00F7F1EA,&H00F7F1EA,&H2039221D,&H2039221D,-1,0,0,0,100,100,0.4,0,3,9,1,2,80,80,150,1
Style: Brand,IBM Plex Sans,36,&H00C7B463,&H00C7B463,&H00000000,&H00000000,-1,0,0,0,100,100,7,0,0,0,0,8,90,90,116,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`
let ev = `Dialogue: 0,${t(0)},${t(bodyT)},Brand,,0,0,0,,INTEGRONIX\n`
for (const m of meta) ev += `Dialogue: 0,${t(m.start)},${t(m.end)},Sub,,0,0,0,,{\\fad(120,100)}${m.text}\n`
writeFileSync('reel7.ass', head + ev)
execFileSync('ffmpeg', ['-y', '-i', `${SH}/vis.mp4`, '-i', 'agency_mix.mp3', '-filter_complex', '[0:v]subtitles=reel7.ass[v]',
  '-map', '[v]', '-map', '1:a', '-af', `afade=t=out:st=${(D - 0.5).toFixed(2)}:d=0.5`, '-t', String(D), '-r', '30',
  '-c:v', 'libx264', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', 'reel7.mp4'], { stdio: 'inherit' })
console.log(`[reel7] ${dur('reel7.mp4').toFixed(2)}s · 4 fwd cuts + CTA ${cardT}s · framed3d ${FD}s`)
