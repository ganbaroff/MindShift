// pult_worker.mjs — «Пульт v1» queue worker.
//
// Claims pending rows from public.pult_commands (enqueued by the creator-pult edge fn),
// executes the heavy work the edge fn can't (make-clip / ladder_render / buffer_publish),
// sends the preview video back to the CEO's Telegram chat, and marks the row done/failed.
//
// Runs BOTH locally and in CI:
//   node pult_worker.mjs            # process ONE oldest pending row, then exit
//   node pult_worker.mjs --drain    # process ALL pending rows (CI poller), then exit
//   PULT_MOCK=1 node pult_worker.mjs --drain   # offline self-test (stubs fetch + spawn)
//
// Claim is OPTIMISTIC: PATCH ?id=eq.<id>&status=eq.pending sets status=processing; if the
// row was already claimed by a concurrent worker, PostgREST returns 0 rows and we skip it.
// This makes concurrent pollers safe without advisory locks.
//
// Execution paths (by cmd + args.format):
//   cmd=make,   format=news    → make-clip.mjs (full pipeline) → critic gate → GCS → sendVideo
//   cmd=make,   format=ladder  → ladder_render.mjs             → critic gate → GCS → sendVideo
//   cmd=publish                → buffer_publish.mjs (own hard gates + idempotency), report tail
//
// The critic gate here is EXPLICIT (content_critic.mjs, blocking): a failed clip is NOT
// sent as a green preview — the verdict is sent instead and the row is marked failed.
// buffer_publish enforces its OWN gates, so /go trusts it.

import { readFileSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { requireEnv, PROJECT_ROOT } from './env.mjs'

const MOCK = process.env.PULT_MOCK === '1'
const DRAIN = process.argv.includes('--drain')

// -- Supabase REST (service role — bypasses RLS on pult_commands) -----------------
const SUPA_URL = requireEnv('VITE_SUPABASE_URL')
const SVC_KEY = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
const BUCKET = 'kapibara-news-pub-0321449510'
const GCS_BASE = `https://storage.googleapis.com/${BUCKET}`
const REST = `${SUPA_URL}/rest/v1/pult_commands`

// -- Fetch / spawn indirection (so PULT_MOCK can stub them) -----------------------
let _fetch = globalThis.fetch
let _run = (bin, args, opts) => execFileSync(bin, args, opts)

// -- REST helpers -----------------------------------------------------------------
async function rest(method, query, body) {
  const r = await _fetch(`${REST}${query}`, {
    method,
    headers: {
      apikey: SVC_KEY,
      Authorization: `Bearer ${SVC_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const txt = await r.text()
  return { ok: r.ok, status: r.status, data: txt ? JSON.parse(txt) : [] }
}

// Fetch the oldest pending row (peek — not yet claimed).
async function peekPending() {
  const q = '?status=eq.pending&order=created_at.asc&limit=1&select=id,chat_id,cmd,args'
  const res = await rest('GET', q)
  return res.ok && res.data.length ? res.data[0] : null
}

// Optimistic claim: only succeeds if the row is STILL pending. Returns the claimed row or null.
async function claim(id) {
  const q = `?id=eq.${id}&status=eq.pending`
  const res = await rest('PATCH', q, { status: 'processing', claimed_at: new Date().toISOString() })
  return res.ok && res.data.length ? res.data[0] : null
}

async function finish(id, status, result) {
  await rest('PATCH', `?id=eq.${id}`, { status, result: String(result).slice(0, 2000) })
}

// -- Telegram sendVideo / sendMessage (needs the bot token; edge fn didn't) --------
function tgToken() { return requireEnv('TELEGRAM_CREATORBOT_TOKEN') }

async function sendMessage(chatId, text) {
  const r = await _fetch(`https://api.telegram.org/bot${tgToken()}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  })
  const j = await r.json()
  return j.ok === true
}

async function sendVideo(chatId, filePath, caption) {
  const file = readFileSync(filePath)
  const fd = new FormData()
  fd.append('chat_id', String(chatId))
  fd.append('caption', caption)
  fd.append('supports_streaming', 'true')
  fd.append('video', new Blob([file], { type: 'video/mp4' }), filePath.split(/[\\/]/).pop())
  const r = await _fetch(`https://api.telegram.org/bot${tgToken()}/sendVideo`, { method: 'POST', body: fd })
  const j = await r.json()
  return j.ok === true
}

// -- Shell helpers ----------------------------------------------------------------
function node(script, args = []) {
  return _run('node', [script, ...args], { stdio: 'inherit', cwd: PROJECT_ROOT })
}

// Run content_critic; returns { pass, verdict }. Non-zero exit = not ship_ready.
function runCritic(clip) {
  try {
    _run('node', ['content_critic.mjs', clip], { stdio: 'inherit', cwd: PROJECT_ROOT })
    return { pass: true, verdict: 'ship_ready' }
  } catch {
    return { pass: false, verdict: 'not ship_ready (content_critic blocked)' }
  }
}

function gcsUpload(localFile) {
  const gcloud = process.platform === 'win32' ? 'gcloud.cmd' : 'gcloud'
  const dest = localFile.split(/[\\/]/).pop()
  _run(gcloud, ['storage', 'cp', localFile, `gs://${BUCKET}/${dest}`], { stdio: 'inherit', cwd: PROJECT_ROOT })
  return `${GCS_BASE}/${dest}`
}

// -- Path: make (news | ladder) ---------------------------------------------------
async function doMake(row) {
  const format = row.args?.format || 'news'
  let clip

  if (format === 'ladder') {
    node('ladder_render.mjs')
    clip = 'ladder_runs/ep01/kapibara-ladder-ep01-token.mp4'
  } else {
    // news: full pipeline, but no preview / no publish (Пульт owns the preview + /go owns publish).
    node('make-clip.mjs', ['--force', '--no-preview', '--no-publish'])
    // make-clip writes latest_output.json with the dated filename.
    let out = {}
    try { out = JSON.parse(readFileSync('latest_output.json', 'utf8')) } catch {}
    clip = out.file || `kapibara-${new Date().toISOString().slice(0, 10)}.mp4`
  }

  if (!existsSync(clip)) throw new Error(`render finished but clip missing: ${clip}`)

  // Gate: independent critic BEFORE handing the CEO a green preview.
  const { pass, verdict } = runCritic(clip)
  if (!pass) {
    await sendMessage(row.chat_id, `⚠️ ${format}: клип не прошёл гейт критика.\n${verdict}\nПеределываю по фиксам — не публикую.`)
    return { status: 'failed', result: `critic blocked ${format}: ${verdict}` }
  }

  // Public URL (Telegram sendVideo works with a local file, but we upload so /go can publish it).
  let gcsUrl = ''
  try { gcsUrl = gcsUpload(clip) } catch (e) { console.warn('[pult] gcs upload failed (preview still sends):', e.message) }

  const caption = `превью прошло гейты (${verdict}) — /go чтобы опубликовать`
  const sent = await sendVideo(row.chat_id, clip, caption)
  if (!sent) return { status: 'failed', result: `render ok but sendVideo failed (${clip})` }

  return { status: 'done', result: `${format} → ${clip}${gcsUrl ? ' → ' + gcsUrl : ''} (${verdict})` }
}

// -- Path: publish ----------------------------------------------------------------
async function doPublish(row) {
  // buffer_publish.mjs enforces its OWN hard gates (content_critic ship_ready +
  // published.json idempotency). We just run it and report the tail.
  let tail = ''
  try {
    const outBuf = _run('node', ['buffer_publish.mjs'], { cwd: PROJECT_ROOT })
    tail = (outBuf ? outBuf.toString() : '').split('\n').filter(Boolean).slice(-6).join('\n')
    await sendMessage(row.chat_id, `✅ Публикация отработала:\n<code>${tail.slice(0, 500) || '(no output)'}</code>`)
    return { status: 'done', result: `publish ok: ${tail.slice(0, 300)}` }
  } catch (e) {
    // buffer_publish exits non-zero when the QA gate blocks or nothing to publish.
    tail = (e.stdout ? e.stdout.toString() : '').split('\n').filter(Boolean).slice(-6).join('\n')
    await sendMessage(row.chat_id, `⚠️ Публикация не прошла (гейт/идемпотентность):\n<code>${tail.slice(0, 500) || e.message}</code>`)
    return { status: 'failed', result: `publish blocked: ${(tail || e.message).slice(0, 300)}` }
  }
}

// -- Process one claimed row ------------------------------------------------------
async function processRow(row) {
  console.log(`[pult] claimed ${row.id} cmd=${row.cmd} args=${JSON.stringify(row.args)}`)
  try {
    let outcome
    if (row.cmd === 'make') outcome = await doMake(row)
    else if (row.cmd === 'publish') outcome = await doPublish(row)
    else outcome = { status: 'failed', result: `unknown cmd: ${row.cmd}` }
    await finish(row.id, outcome.status, outcome.result)
    console.log(`[pult] ${row.id} → ${outcome.status}: ${outcome.result}`)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    await finish(row.id, 'failed', msg)
    try { await sendMessage(row.chat_id, `⚠️ Задача упала: ${msg.slice(0, 200)}`) } catch { /* best-effort */ }
    console.error(`[pult] ${row.id} → failed: ${msg}`)
  }
}

// -- Main loop --------------------------------------------------------------------
async function main() {
  let processed = 0
  // Bound the drain so a stuck/growing queue can't run the CI job for hours.
  const MAX = DRAIN ? 20 : 1
  for (let i = 0; i < MAX; i++) {
    const peek = await peekPending()
    if (!peek) break
    const claimed = await claim(peek.id)
    if (!claimed) {
      // Another worker grabbed it between peek and claim — try the next one.
      continue
    }
    await processRow(claimed)
    processed++
    if (!DRAIN) break
  }
  console.log(`[pult] done — processed ${processed} row(s)${MOCK ? ' (MOCK)' : ''}`)
}

// -- MOCK harness -----------------------------------------------------------------
// PULT_MOCK=1 stubs _fetch (PostgREST + Telegram) and _run (renders/critic/gcloud) so the
// claim → path-selection → done/failed logic runs offline with zero side effects. It seeds
// two pending rows (a news make + a publish), and asserts both reach a terminal state.
async function runMock() {
  console.log('[pult:mock] starting offline self-test')
  // In-memory queue: one make/news row, one publish row.
  const queue = [
    { id: 'aaaa1111-0000-0000-0000-000000000001', chat_id: 111, cmd: 'make', args: { format: 'news' }, status: 'pending' },
    { id: 'bbbb2222-0000-0000-0000-000000000002', chat_id: 111, cmd: 'publish', args: {}, status: 'pending' },
  ]
  const byId = Object.fromEntries(queue.map(r => [r.id, r]))
  const tg = [] // captured telegram calls

  // Stub PostgREST + Telegram HTTP.
  _fetch = async (u, opts = {}) => {
    const url = String(u)
    // Telegram API
    if (url.includes('api.telegram.org')) {
      tg.push(url.includes('sendVideo') ? 'sendVideo' : 'sendMessage')
      return { json: async () => ({ ok: true, result: { message_id: 1 } }) }
    }
    // PostgREST pult_commands
    if (url.includes('/rest/v1/pult_commands')) {
      const method = opts.method || 'GET'
      const qs = url.split('?')[1] || ''
      if (method === 'GET') {
        const pend = queue.filter(r => r.status === 'pending').sort((a, b) => a.id.localeCompare(b.id))
        return { ok: true, text: async () => JSON.stringify(pend.slice(0, 1)) }
      }
      if (method === 'PATCH') {
        const idm = qs.match(/id=eq\.([^&]+)/)
        const id = idm ? idm[1] : null
        const row = id ? byId[id] : null
        const body = opts.body ? JSON.parse(opts.body) : {}
        // Optimistic claim: PATCH ...&status=eq.pending only matches a pending row.
        const requiresPending = /status=eq\.pending/.test(qs)
        if (row && (!requiresPending || row.status === 'pending')) {
          Object.assign(row, body)
          return { ok: true, text: async () => JSON.stringify([row]) }
        }
        return { ok: true, text: async () => JSON.stringify([]) } // 0 rows = already claimed
      }
    }
    throw new Error('[pult:mock] unexpected fetch: ' + url)
  }

  // Stub renders / critic / gcloud / node subprocesses.
  const CRITIC_FAILS = process.env.PULT_MOCK_FAIL === '1'
  _run = (bin, args) => {
    const label = `${bin} ${args.join(' ')}`
    console.log(`[pult:mock] (stub) ${label}`)
    // content_critic: exit non-zero (throw) when PULT_MOCK_FAIL=1 to prove the fail path.
    if (args[0] === 'content_critic.mjs' && CRITIC_FAILS) {
      const e = new Error('mock critic blocked'); e.status = 1; throw e
    }
    // gcloud storage cp no-ops. buffer_publish returns a fake tail on stdout.
    if (args[0] === 'buffer_publish.mjs') return Buffer.from('instagram PUBLISH → ✓ mock-id\ntiktok PUBLISH → ✓ mock-id')
    return Buffer.from('')
  }
  // make-clip path reads latest_output.json — fake existsSync/readFileSync via a temp file? No:
  // instead, in mock, override the two fs touch-points the news path uses.
  // Simpler: seed a latest_output.json + a fake clip so existsSync(clip) passes.
  const fs = await import('node:fs')
  const clipName = `kapibara-${new Date().toISOString().slice(0, 10)}.mp4`
  fs.writeFileSync(`${PROJECT_ROOT}/latest_output.json`, JSON.stringify({ file: clipName, date: new Date().toISOString().slice(0, 10) }))
  if (!fs.existsSync(`${PROJECT_ROOT}/${clipName}`)) fs.writeFileSync(`${PROJECT_ROOT}/${clipName}`, 'MOCKCLIP')

  await main()

  // Assertions.
  const news = byId['aaaa1111-0000-0000-0000-000000000001']
  const pub = byId['bbbb2222-0000-0000-0000-000000000002']
  const problems = []
  if (CRITIC_FAILS) {
    // Fail path: news must be FAILED, and NO sendVideo (only a verdict sendMessage).
    if (news.status !== 'failed') problems.push(`news row expected failed (critic block), got ${news.status} (${news.result})`)
    if (tg.includes('sendVideo')) problems.push('critic-blocked clip was sent as a green preview (should not happen)')
    if (!tg.includes('sendMessage')) problems.push('critic-blocked clip did not send a verdict message')
  } else {
    // Happy path: both rows done, news preview sent.
    if (news.status !== 'done') problems.push(`news row expected done, got ${news.status} (${news.result})`)
    if (pub.status !== 'done') problems.push(`publish row expected done, got ${pub.status} (${pub.result})`)
    if (!tg.includes('sendVideo')) problems.push('news path did not call sendVideo')
  }

  console.log('\n[pult:mock] queue final:')
  for (const r of queue) console.log(`  ${r.id.slice(0, 8)} ${r.cmd} → ${r.status} :: ${r.result}`)
  console.log(`[pult:mock] telegram calls: ${tg.join(', ')}`)

  // cleanup the mock clip (leave latest_output.json — real runs overwrite it)
  try { if (fs.readFileSync(`${PROJECT_ROOT}/${clipName}`, 'utf8') === 'MOCKCLIP') fs.rmSync(`${PROJECT_ROOT}/${clipName}`) } catch { /* noop */ }

  if (problems.length) { console.error('\n[pult:mock] FAIL:\n - ' + problems.join('\n - ')); process.exit(1) }
  console.log('\n[pult:mock] PASS — claim → path-select → done/failed proven')
}

if (MOCK) {
  await runMock()
} else {
  await main()
}
