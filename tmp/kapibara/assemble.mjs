import { readFileSync, writeFileSync, existsSync, rmSync, readdirSync, renameSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const UPLOAD = process.argv.includes('--upload')
const KEEP_FRAMES = process.argv.includes('--keep-frames')
const GCS_BUCKET = 'gs://kapibara-news-pub-0321449510'

if (!existsSync('data.json')) { console.error('[assemble] data.json missing — run build-data2 first'); process.exit(1) }
const data = JSON.parse(readFileSync('data.json', 'utf8'))

const dateStr = new Date().toISOString().slice(0, 10)
const tmpNews = `_news_${dateStr}.mp4`
const outFinal = `kapibara-${dateStr}.mp4`

function run(label, cmd, args) {
  console.log(`[assemble] ${label}`)
  execFileSync(cmd, args, { stdio: ['ignore', 'inherit', 'inherit'] })
}

// Guard: ensure inputs exist
if (!existsSync('frames_fast/f_00000.jpg')) { console.error('[assemble] frames_fast/ empty — run render6 first'); process.exit(1) }
if (!existsSync('voice.mp3')) { console.error('[assemble] voice.mp3 missing — run gen_voice first'); process.exit(1) }

// Step 1: frames + audio → news mp4 (mix a low music bed under the voice if music/bed.* exists)
const MUSIC = ['music/bed.mp3', 'music/bed.m4a', 'music/bed.wav'].find(f => existsSync(f))
const a1 = ['-y', '-framerate', String(data.fps), '-i', 'frames_fast/f_%05d.jpg', '-i', 'voice.mp3']
if (MUSIC) {
  a1.push('-stream_loop', '-1', '-i', MUSIC,
    '-filter_complex', '[2:a]volume=0.12,aresample=async=1[bed];[1:a][bed]amix=inputs=2:duration=first:normalize=0[a]',
    '-map', '0:v', '-map', '[a]')
} else {
  a1.push('-map', '0:v', '-map', '1:a')
}
a1.push('-c:v', 'libx264', '-preset', 'fast', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-shortest', tmpNews)
run(MUSIC ? `frames→mp4 (+music bed ${MUSIC})` : 'frames→mp4 (no music — drop a track at music/bed.mp3)', 'ffmpeg', a1)

// Step 2: concat with outro
if (existsSync('outro.mp4')) {
  writeFileSync('_concat.txt', `file '${tmpNews.replace(/'/g, "'\\''")}'\nfile 'outro.mp4'\n`)
  run('concat+outro', 'ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', '_concat.txt', '-c', 'copy', outFinal])
  try { rmSync('_concat.txt'); rmSync(tmpNews) } catch {}
} else {
  console.warn('[assemble] outro.mp4 not found — final = news only (run outro_build + render_outro to fix)')
  // rename tmp to final (cross-platform — was powershell Move-Item, broke on Linux CI)
  renameSync(tmpNews, outFinal)
}

// Step 3: cleanup temp files
if (!KEEP_FRAMES) {
  for (const dir of ['frames_fast', 'frames_outro']) {
    if (existsSync(dir)) { rmSync(dir, { recursive: true }); console.log(`[assemble] cleaned ${dir}/`) }
  }
  const tmpFiles = readdirSync('.').filter(f => /^(ln|tr|octa)_\d+\.(wav|pcm)$/.test(f) || f === 'voice.pcm')
  for (const f of tmpFiles) { try { rmSync(f) } catch {} }
  if (tmpFiles.length) console.log(`[assemble] cleaned ${tmpFiles.length} tmp wav/pcm files`)
}

// Step 4: optional GCS upload (for Buffer/IG publish)
let gcsUrl = null
if (UPLOAD) {
  const gcsKey = `kapibara-${dateStr}.mp4`
  run('gcs-upload', 'gsutil', ['-q', 'cp', outFinal, `${GCS_BUCKET}/${gcsKey}`])
  run('gcs-acl', 'gsutil', ['-q', 'acl', 'ch', '-u', 'AllUsers:R', `${GCS_BUCKET}/${gcsKey}`])
  gcsUrl = `https://storage.googleapis.com/kapibara-news-pub-0321449510/${gcsKey}`
  console.log(`[assemble] GCS public: ${gcsUrl}`)
}

const sz = readFileSync(outFinal).length
console.log(`\n✓ ${outFinal}  (${(sz / 1e6).toFixed(1)} MB)`)
writeFileSync('latest_output.json', JSON.stringify({ file: outFinal, date: dateStr, gcsUrl, sizeMB: +(sz / 1e6).toFixed(1) }))
