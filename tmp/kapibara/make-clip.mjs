/**
 * make-clip.mjs — one-command pipeline for «Капибара Новости» (format #1).
 *
 * Usage:
 *   node make-clip.mjs                  # full daily run
 *   node make-clip.mjs --skip-news      # reuse existing today.json (saves API call)
 *   node make-clip.mjs --upload         # upload final mp4 to GCS (required for Buffer/IG)
 *   node make-clip.mjs --force          # re-run even if already ran today
 *   node make-clip.mjs --no-preview     # skip Telegram preview post
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
const REBUILD_OUTRO = A.includes('--rebuild-outro')

const dateStr = new Date().toISOString().slice(0, 10)
const STATE_FILE = 'state.json'

let state = {}
try { state = JSON.parse(readFileSync(STATE_FILE, 'utf8')) } catch {}
if (state.lastRan === dateStr && !FORCE) {
  console.log(`[make-clip] Already ran for ${dateStr}. Use --force to rerun.`)
  process.exit(0)
}

function run(label, args) {
  console.log(`\n━━━ ${label}`)
  try {
    execFileSync('node', args, { stdio: 'inherit', cwd: new URL('.', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1') })
  } catch (e) {
    console.error(`\n✗ Stage "${label}" failed — pipeline stopped.`)
    process.exit(1)
  }
}

// ── Stage 1: Fresh news script ────────────────────────────────────────────
if (SKIP_NEWS) {
  if (!existsSync('today.json')) { console.error('[make-clip] --skip-news but today.json missing'); process.exit(1) }
  console.log('[make-clip] --skip-news: reusing today.json')
} else {
  run('gen_news  →  today.json', ['gen_news.mjs'])
}

// ── Stage 2: TTS synthesis ────────────────────────────────────────────────
run('gen_voice  →  voice.mp3 + ln_*.wav', ['gen_voice.mjs'])

// ── Stage 3: Silence trim + re-sync ──────────────────────────────────────
run('reconcat  →  voice.mp3 (trimmed)', ['reconcat.mjs'])

// ── Stage 4: Frame envelope ───────────────────────────────────────────────
run('build-data2  →  data.json', ['build-data2.mjs'])

// ── Stage 5: AZ subtitle auto-translation ────────────────────────────────
run('translate_az  →  az_final.json', ['translate_az.mjs'])

// ── Stage 6: Merge AZ subs into render data ───────────────────────────────
run('build_subs_az  →  data_subs_az.json', ['build_subs_az.mjs'])

// ── Stage 7: Render frames (8 workers) ────────────────────────────────────
run('render6  →  frames_fast/', ['render6.mjs', 'fast', '8', 'data_subs_az.json'])

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

// ── Stage 10: Telegram preview ────────────────────────────────────────────
if (!NO_PREVIEW) {
  run('tg_post  →  @atlasvideos preview', ['tg_post.mjs'])
  console.log('\n📨 Preview posted to Telegram. Awaiting CEO "го" before IG/TikTok publish.')
  console.log('   Publish command: node buffer_create.mjs --upload && node buffer_publish.mjs')
} else {
  console.log('\n[make-clip] --no-preview: skipping Telegram post')
}

// ── Done ──────────────────────────────────────────────────────────────────
writeFileSync(STATE_FILE, JSON.stringify({ ...state, lastRan: dateStr }))

// ── Stage 11: refresh metrics + sync to Supabase + live dashboard ──
try { run('metrics  →  metrics.json',       ['metrics.mjs'])       } catch { console.warn('[make-clip] metrics skipped') }
try { run('supabase_sync  →  DB',           ['supabase_sync.mjs']) } catch { console.warn('[make-clip] supabase sync skipped') }
try { run('dashboard  →  dashboard.html',   ['dashboard.mjs'])     } catch { console.warn('[make-clip] dashboard skipped') }

console.log(`\n✅  make-clip complete for ${dateStr}`)
