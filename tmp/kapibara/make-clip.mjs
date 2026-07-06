/**
 * make-clip.mjs — one-command pipeline for «Капибара Новости» (format #1).
 *
 * Usage:
 *   node make-clip.mjs                  # full daily run
 *   node make-clip.mjs --skip-news      # reuse existing today.json (saves API call)
 *   node make-clip.mjs --upload         # upload final mp4 to GCS (required for Buffer/IG)
 *   node make-clip.mjs --force          # re-run even if already ran today
 *   node make-clip.mjs --no-preview     # skip Telegram preview post
 *   node make-clip.mjs --no-publish     # skip IG/TikTok auto-publish (default = publish after QA gate)
 *   node make-clip.mjs --rebuild-outro  # re-voice and re-render outro (normally static)
 *
 * Stops on any stage failure (Disconnect #12 fix).
 * Idempotent: skips if state.json shows already ran today (Disconnect #8 fix).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const A = process.argv
const FORCE = A.includes('--force')
const SKIP_NEWS = A.includes('--skip-news')
const UPLOAD = A.includes('--upload')
const NO_PREVIEW = A.includes('--no-preview')
const NO_PUBLISH = A.includes('--no-publish')
const REBUILD_OUTRO = A.includes('--rebuild-outro')

const dateStr = new Date().toISOString().slice(0, 10)
const STATE_FILE = 'state.json'

let state = {}
try { state = JSON.parse(readFileSync(STATE_FILE, 'utf8')) } catch {}
if (state.lastRan === dateStr && !FORCE) {
  console.log(`[make-clip] Already ran for ${dateStr}. Use --force to rerun.`)
  process.exit(0)
}

const CWD = new URL('.', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')
function run(label, args) {
  console.log(`\n━━━ ${label}`)
  try {
    execFileSync('node', args, { stdio: 'inherit', cwd: CWD })
  } catch (e) {
    console.error(`\n✗ Stage "${label}" failed — pipeline stopped.`)
    process.exit(1)
  }
}
// Soft stage: runs, surfaces its output, but NEVER stops the pipeline (used for the report-mode QA gate).
function runSoft(label, args, env) {
  console.log(`\n━━━ ${label}`)
  try { execFileSync('node', args, { stdio: 'inherit', cwd: CWD, env: { ...process.env, ...env } }) }
  catch { console.warn(`[make-clip] ${label}: failed/blocked — non-blocking, pipeline continues (hard gate lives inside buffer_publish)`) }
}

// ── Stage 1: Fresh news script ────────────────────────────────────────────
if (SKIP_NEWS) {
  if (!existsSync('today.json')) { console.error('[make-clip] --skip-news but today.json missing'); process.exit(1) }
  console.log('[make-clip] --skip-news: reusing today.json')
} else {
  run('gen_news  →  today.json', ['gen_news.mjs', dateStr]) // pass real date — default was frozen at 2026-06-28
}

// ── Stage 2: TTS synthesis ────────────────────────────────────────────────
run('gen_voice  →  voice.mp3 + ln_*.wav', ['gen_voice.mjs'])

// ── Stage 3: Silence trim + re-sync ──────────────────────────────────────
run('reconcat  →  voice.mp3 (trimmed)', ['reconcat.mjs'])

// ── Stage 4: Frame envelope ───────────────────────────────────────────────
run('build-data2  →  data.json', ['build-data2.mjs'])

// ── Stage 5-6: Subtitle track (A/B day-parity: EN default vs AR variant for the Saudi test) ──
// Base voice is ENGLISH. Subtitles: even day-of-month = English (the spoken lines themselves, NO
// translation stage); odd day = Arabic (MSA) over the same EN voice. The chosen render-data file
// drives stage 7. (The AZ path — translate_az/build_subs_az — stays in the repo, unused: never delete.)
const dayOfMonth = new Date().getUTCDate()
const AR_DAY = dayOfMonth % 2 === 1
let subsData
if (AR_DAY) {
  console.log(`[make-clip] subs variant: ARABIC (day ${dayOfMonth} is odd) — EN voice + AR subtitles`)
  run('translate_ar  →  ar_final.json', ['translate_ar.mjs'])
  run('build_subs_ar  →  data_subs_ar.json', ['build_subs_ar.mjs'])
  subsData = 'data_subs_ar.json'
} else {
  console.log(`[make-clip] subs variant: ENGLISH (day ${dayOfMonth} is even) — spoken lines as subtitles, no translation stage`)
  subsData = 'data.json'
}

// ── Stage 7: Render frames (8 workers) ────────────────────────────────────
run(`render6  →  frames_fast/ (subs: ${subsData})`, ['render6.mjs', 'fast', '8', subsData])

// ── Stage 8: Outro (static — skip unless --rebuild-outro) ─────────────────
if (REBUILD_OUTRO || !existsSync('outro.mp4')) {
  console.log(REBUILD_OUTRO ? '[make-clip] --rebuild-outro: re-voicing outro' : '[make-clip] outro.mp4 missing — building')
  run('outro_build  →  outro.json + voice_outro.mp3', ['outro_build.mjs'])
  run('render_outro  →  frames_outro/', ['render_outro.mjs'])
  // assemble outro frames → outro.mp4
  const oData = JSON.parse(readFileSync('outro.json', 'utf8'))
  console.log('\n━━━ outro frames→mp4')
  execFileSync('ffmpeg', [
    '-y', '-framerate', String(oData.fps || 30),
    '-i', 'frames_outro/f_%05d.jpg',
    '-i', 'voice_outro.mp3',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '20', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-shortest',
    'outro.mp4',
  ], { stdio: 'inherit' })
  console.log('[make-clip] outro.mp4 rebuilt')
} else {
  console.log('\n[make-clip] outro.mp4 exists — skipping rebuild (use --rebuild-outro to refresh)')
}

// ── Stage 9: Assemble final video ─────────────────────────────────────────
const assembleArgs = ['assemble.mjs']
if (UPLOAD) assembleArgs.push('--upload')
run(`assemble  →  kapibara-${dateStr}.mp4`, assembleArgs)

// ── Stage 9.5: QA gate (Factory Law 10) — content-critic verdict on the assembled clip ──
// REPORT mode here so the daily preview is never blocked; the HARD gate belongs on buffer_publish.
runSoft('content_critic (report)  →  ship_ready verdict', ['content_critic.mjs', `kapibara-${dateStr}.mp4`], { CRITIC_NONBLOCKING: '1' })

// ── Stage 10: Telegram preview ────────────────────────────────────────────
if (!NO_PREVIEW) {
  run('tg_post  →  @atlasvideos preview', ['tg_post.mjs'])
  console.log('\n📨 Preview posted to Telegram.')
} else {
  console.log('\n[make-clip] --no-preview: skipping Telegram post')
}

// ── Stage 10.5: AUTO-PUBLISH (Вариант Б, CEO 2026-07-05: «всё публикуй, но только после проверок») ──
// buffer_publish.mjs enforces the HARD gates itself: content_critic ship_ready + published.json idempotency.
// Opt-out: --no-publish (used by CI dry_run).
if (!NO_PUBLISH) {
  let out = {}
  try { out = JSON.parse(readFileSync('latest_output.json', 'utf8')) } catch {}
  if (!out.gcsUrl && out.file) {
    // Buffer needs a public URL — upload if assemble ran without --upload (local runs)
    console.log('\n━━━ gcs-upload (auto-publish needs public URL)')
    const gcloud = process.platform === 'win32' ? 'gcloud.cmd' : 'gcloud'
    try {
      execFileSync(gcloud, ['storage', 'cp', out.file, `gs://kapibara-news-pub-0321449510/${out.file}`], { stdio: 'inherit', cwd: CWD })
      out.gcsUrl = `https://storage.googleapis.com/kapibara-news-pub-0321449510/${out.file}`
      writeFileSync('latest_output.json', JSON.stringify(out))
    } catch { console.error('[make-clip] ✗ GCS upload failed — cannot auto-publish (clip stays local + TG preview only)') }
  }
  if (out.gcsUrl) {
    runSoft('buffer_publish  →  IG+TikTok (auto, QA-gated)', ['buffer_publish.mjs'])
  }
} else {
  console.log('\n[make-clip] --no-publish: skipping IG/TikTok publish')
}

// ── Done ──────────────────────────────────────────────────────────────────
writeFileSync(STATE_FILE, JSON.stringify({ ...state, lastRan: dateStr }))

// ── Stage 11: refresh metrics + sync to Supabase + live dashboard ──
try { run('metrics  →  metrics.json',       ['metrics.mjs'])       } catch { console.warn('[make-clip] metrics skipped') }
try { run('supabase_sync  →  DB',           ['supabase_sync.mjs']) } catch { console.warn('[make-clip] supabase sync skipped') }
try { run('dashboard  →  dashboard.html',   ['dashboard.mjs'])     } catch { console.warn('[make-clip] dashboard skipped') }

console.log(`\n✅  make-clip complete for ${dateStr}`)
