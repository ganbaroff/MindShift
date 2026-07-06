// journal.mjs — cross-runner publish idempotency via Supabase publish_journal.
//
// WHY: state.json + published.json are gitignored + runner-local, so every fresh CI
// runner was blind and re-published (double-publish incident 2026-07-06, 27 min apart).
// This table is the ONE cross-runner source of truth. Table + RLS(no policies) created
// via MCP (migration "publish_journal"); repo record = supabase/migrations/036_publish_journal.sql.
//
// FAILURE SEMANTICS (important): if the journal is unreachable (network/HTTP error),
// isPublished / recordPublish log ONE loud line and return null. Callers treat null as
// "unknown" and fall back to their existing local published.json logic. The factory must
// NOT die on a Supabase blip — a missed dedup is recoverable, a dead pipeline is not.
//
// Reads VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY via env.mjs (never printed).
// Service role bypasses RLS, so the table with no policies is writable/readable here only.
//
// CLI:
//   node journal.mjs check 2026-07-06 ai-news          -> prints true|false
//   node journal.mjs record <date> <format> <svc> <postId>   -> insert one row
//   node journal.mjs backfill                          -> seed reality (see backfill() below)

import { readFileSync, existsSync } from 'node:fs'
import { getEnv } from './env.mjs'

const SUPA_URL = getEnv('VITE_SUPABASE_URL')
const SVC_KEY = getEnv('SUPABASE_SERVICE_ROLE_KEY')

/**
 * closeJournal() — close undici's global fetch connection pool.
 * MUST be awaited right before a caller calls process.exit(0) on a journal-skip path.
 * Node 24 + undici on Windows throws a libuv double-close assertion (UV_HANDLE_CLOSING,
 * src/win/async.c) when process.exit() fires while a keep-alive fetch socket is still
 * settling — that would turn a clean "already published, skipping" no-op into a non-zero
 * CI failure. Closing the pool first drains the socket deterministically. Best-effort:
 * `undici` ships inside Node (no npm add); if the import ever fails, we swallow and let
 * the caller exit anyway (worst case = the same benign assertion, never a wrong result).
 */
export async function closeJournal() {
  try {
    const { getGlobalDispatcher } = await import('undici')
    await getGlobalDispatcher().close()
  } catch { /* undici unavailable — nothing to drain */ }
}

function headers(extra = {}) {
  return {
    apikey: SVC_KEY,
    Authorization: `Bearer ${SVC_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  }
}

// Are creds even present? If not, treat the journal as unreachable (null) rather than
// crashing — callers fall back to local guards. (env.requireEnv would process.exit(1),
// which is exactly what we must NOT do here.)
function credsMissing() {
  return !SUPA_URL || !SVC_KEY
}

/**
 * isPublished(dateStr, format) — has ANY svc row already been journaled for this episode?
 * @returns {Promise<boolean|null>} true if >=1 row, false if none, null if journal unreachable.
 */
export async function isPublished(dateStr, format) {
  if (credsMissing()) {
    console.warn('[journal] UNREACHABLE — falling back to local published.json')
    return null
  }
  const url = `${SUPA_URL}/rest/v1/publish_journal?episode_date=eq.${encodeURIComponent(dateStr)}&format=eq.${encodeURIComponent(format)}&select=svc,post_id`
  try {
    const r = await fetch(url, { headers: headers() })
    if (!r.ok) {
      console.warn('[journal] UNREACHABLE — falling back to local published.json')
      return null
    }
    const rows = await r.json()
    return Array.isArray(rows) && rows.length >= 1
  } catch {
    console.warn('[journal] UNREACHABLE — falling back to local published.json')
    return null
  }
}

/**
 * recordPublish({ date, format, posts, gcsUrl, lang, runId }) — one row per post svc.
 * on_conflict ignore-duplicates => replaying/retrying a slot never errors or double-inserts.
 * @returns {Promise<boolean|null>} true on success, null if journal unreachable (caller keeps local log).
 */
export async function recordPublish({ date, format, posts, gcsUrl, lang, runId }) {
  if (credsMissing()) {
    console.warn('[journal] UNREACHABLE — falling back to local published.json')
    return null
  }
  const rows = (posts || [])
    .filter(p => p && p.svc)
    .map(p => ({
      episode_date: date,
      format,
      svc: p.svc,
      post_id: p.id != null ? String(p.id) : null,
      caption_lang: lang || null,
      gcs_url: gcsUrl || null,
      run_id: runId || null,
    }))
  if (!rows.length) return true // nothing to record is not a failure
  const url = `${SUPA_URL}/rest/v1/publish_journal?on_conflict=episode_date,format,svc`
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: headers({ Prefer: 'resolution=ignore-duplicates,return=minimal' }),
      body: JSON.stringify(rows),
    })
    if (!r.ok) {
      const body = await r.text().catch(() => '')
      console.warn(`[journal] UNREACHABLE — falling back to local published.json (HTTP ${r.status} ${body.slice(0, 160)})`)
      return null
    }
    return true
  } catch {
    console.warn('[journal] UNREACHABLE — falling back to local published.json')
    return null
  }
}

// ── Task 5: backfill reality so tomorrow's backup slots skip correctly ─────────────
// 2026-07-05 ai-news: read the post ids from local published.json for that date.
// 2026-07-06 ai-news: the FIRST publish pair from the incident (the pair that must win;
//   the second, duplicate pair 6a4b6c46/6a4b6c51 is captured in run_id for the record).
async function backfill() {
  const results = []

  // -- 2026-07-05 ai-news from published.json --
  let posts0705 = []
  if (existsSync('published.json')) {
    try {
      const log = JSON.parse(readFileSync('published.json', 'utf8'))
      const entry = log.find(e => e.date === '2026-07-05' && e.format === 'ai-news')
      if (entry) posts0705 = (entry.posts || []).map(p => ({ svc: p.svc, id: p.id }))
    } catch (e) {
      console.warn('[journal:backfill] could not read published.json:', e.message)
    }
  }
  if (posts0705.length) {
    const ok = await recordPublish({
      date: '2026-07-05', format: 'ai-news', posts: posts0705,
      gcsUrl: null, lang: 'en', runId: 'backfill-2026-07-05',
    })
    results.push(`2026-07-05 ai-news: ${posts0705.map(p => p.svc + '=' + p.id).join(', ')} -> ${ok === null ? 'UNREACHABLE' : 'recorded'}`)
  } else {
    results.push('2026-07-05 ai-news: NO local published.json entry found — skipped')
  }

  // -- 2026-07-06 ai-news: FIRST (winning) publish pair from the incident --
  const posts0706 = [
    { svc: 'instagram', id: '6a4b660e7e52c06f81c2c61f' },
    { svc: 'tiktok', id: '6a4b66197e52c06f81c2c664' },
  ]
  const ok0706 = await recordPublish({
    date: '2026-07-06', format: 'ai-news', posts: posts0706,
    gcsUrl: null, lang: 'en',
    runId: 'backfill-incident-see-second-pair-6a4b6c46/6a4b6c51',
  })
  results.push(`2026-07-06 ai-news: ${posts0706.map(p => p.svc + '=' + p.id).join(', ')} -> ${ok0706 === null ? 'UNREACHABLE' : 'recorded'}`)

  return results
}

// ── CLI ────────────────────────────────────────────────────────────────────────────
const isMain = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, '/')}`).href
if (isMain) {
  // NB: set process.exitCode and let the loop drain — do NOT call process.exit() here.
  // Node 24 + undici on Windows throws a libuv double-close assertion (UV_HANDLE_CLOSING)
  // when process.exit() fires while a keep-alive fetch socket is still settling. Draining
  // naturally closes the socket first; the exit code is still a clean receipt.
  const [cmd, a1, a2, a3, a4] = process.argv.slice(2)
  if (cmd === 'check') {
    const res = await isPublished(a1, a2)
    console.log(String(res))
    process.exitCode = res === true ? 0 : 1 // exit code doubles as a receipt (0=published,1=not/unknown)
  } else if (cmd === 'record') {
    const ok = await recordPublish({
      date: a1, format: a2, posts: [{ svc: a3, id: a4 }],
      gcsUrl: null, lang: null, runId: process.env.GITHUB_RUN_ID || 'local-cli',
    })
    console.log(`record ${a1} ${a2} ${a3}=${a4} -> ${ok === null ? 'UNREACHABLE' : 'ok'}`)
    process.exitCode = ok === null ? 1 : 0
  } else if (cmd === 'backfill') {
    const out = await backfill()
    for (const line of out) console.log('[journal:backfill] ' + line)
    console.log('[journal:backfill] done')
    process.exitCode = 0
  } else {
    console.log('usage: node journal.mjs check <date> <format> | record <date> <format> <svc> <postId> | backfill')
    process.exitCode = 2
  }
}
