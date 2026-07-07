// weekly_report.mjs — 7-day publish/CI/stats digest for the CEO (Telegram).
//
// Closes the sprint item «Недельный metrics-отчёт → в TG к воскресенью».
//
// WHAT IT GATHERS (last 7 UTC dates, today inclusive):
//   1. Supabase publish_journal  → posts/day, per svc, EN/AR caption mix (the A/B experiment).
//   2. Buffer per-post stats      → views/reach/reactions/comments/shares (missing → '—').
//   3. gh run list (kapibara-daily.yml) → per-day cron-vs-manual + success/failure counts.
//   4. published.json + Buffer    → per-POST breakdown for the week + top-1/bottom-1 post.
//   5. EXPERIMENTS.md             → surfaces RUNNING experiments + flags verdicts due this Sunday.
// Then composes a SHORT Russian message (ADHD-safe: total ≤ 25 lines, plain lines, no tables)
// and either prints it (--dry, DEFAULT — no side effects) or sends it to the CEO chat (--send).
//
// FEEDBACK→DECISION LOOP: sections 4-5 close the gap where numbers existed but no decision was
// ever born from them. The report now names the best/worst post of the week AND reminds the CEO
// which experiment owes a verdict — so every Sunday ends in a call, not just a chart.
//
// RESILIENCE (Factory-Law spirit — a dead pipeline is worse than a missing number):
// every data source is wrapped so a single failure (journal 404, Buffer down, gh missing)
// degrades to '—' lines and NEVER crashes the whole report.
//
// DATA-SOURCE NOTES (ground-truthed 2026-07-06):
//  - Buffer: the repo's WORKING pattern is the GraphQL endpoint https://api.buffer.com/
//    with post(input:{id}){ metrics{name value unit} } (see metrics.mjs / buffer_probe.mjs).
//    The task brief mentioned the legacy REST https://api.bufferapp.com/1/updates/<id>.json;
//    that host is kept as a documented fallback but GraphQL is primary because it is what
//    actually returns numbers here. Metric names: Views/Reach/Reactions/Comments/Shares.
//  - publish_journal columns: episode_date, format, svc, post_id, caption_lang, run_id.
//  - Reads VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY + BUFFER_ACCESS_TOKEN via env.mjs.
//    Values are NEVER printed (a hook blocks secret bytes; we only use them in headers).
//
// USAGE:
//   node weekly_report.mjs            # --dry (safety default): print message to stdout only
//   node weekly_report.mjs --dry      # same
//   node weekly_report.mjs --send     # POST the message to CEO chat 5150355926 via bot

import { execFileSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { getEnv, hasEnv, PROJECT_ROOT } from './env.mjs'

// ── Config ───────────────────────────────────────────────────────────────────────
const CEO_CHAT_ID = 5150355926 // Yusif — hardcoded per brief (pult_worker uses row.chat_id; this report is fixed-recipient)
const WORKFLOW = 'kapibara-daily.yml'
const AUTOPUBLISH_START = '2026-07-05' // day 1 of the 14-day autopublish counter
const AUTOPUBLISH_TOTAL = 14
const DAYS = 7 // window length, today inclusive

const SEND = process.argv.includes('--send') // default (no flag OR --dry) = dry-run, never sends

// Russian short weekday labels, keyed by JS getUTCDay() (0=Sun..6=Sat).
const RU_DOW = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']

// ── Date helpers (UTC) ─────────────────────────────────────────────────────────────
// Build the list of the last N UTC dates, today inclusive, oldest→newest.
function lastNDates(n) {
  const out = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i))
    out.push(d.toISOString().slice(0, 10))
  }
  return out
}
const dowLabel = (isoDate) => RU_DOW[new Date(isoDate + 'T00:00:00Z').getUTCDay()]
const mmdd = (isoDate) => isoDate.slice(5) // "2026-07-06" -> "07-06"

// ── 1. publish_journal (Supabase PostgREST, service role) ──────────────────────────
// Returns { rowsByDate: Map<date, row[]>, ok: bool }. On ANY failure ok=false + empty map.
async function fetchJournal(dates) {
  const url = getEnv('VITE_SUPABASE_URL')
  const key = getEnv('SUPABASE_SERVICE_ROLE_KEY')
  const empty = { rowsByDate: new Map(), ok: false }
  if (!url || !key) { console.warn('[weekly] journal creds missing — journal lines degrade to —'); return empty }
  const since = dates[0]
  const q = `${url}/rest/v1/publish_journal?episode_date=gte.${encodeURIComponent(since)}` +
    `&select=episode_date,format,svc,post_id,caption_lang,run_id&order=episode_date.asc`
  try {
    const r = await fetch(q, { headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(10000) })
    if (!r.ok) { console.warn(`[weekly] journal HTTP ${r.status} — degrading to —`); return empty }
    const rows = await r.json()
    if (!Array.isArray(rows)) { console.warn('[weekly] journal non-array body — degrading to —'); return empty }
    const rowsByDate = new Map()
    for (const row of rows) {
      const d = row.episode_date
      if (!rowsByDate.has(d)) rowsByDate.set(d, [])
      rowsByDate.get(d).push(row)
    }
    return { rowsByDate, ok: true }
  } catch (e) {
    console.warn('[weekly] journal fetch failed:', e.message, '— degrading to —')
    return empty
  }
}

// ── 2. Buffer per-post stats ───────────────────────────────────────────────────────
// Primary: GraphQL https://api.buffer.com/ (the repo's proven path — metrics.mjs).
// Returns a stats object or null (null => '—' everywhere for that post).
const BUFFER_GQL = 'https://api.buffer.com/'
const POST_Q =
  'query($input:PostInput!){ post(input:$input){ id status error{__typename} metrics{name value unit} } }'
const pickMetric = (metrics, name) => {
  const m = (metrics || []).find(x => x.name === name)
  return m && m.value != null ? m.value : null
}

async function bufferStats(postId, tok) {
  if (!postId || !tok) return null
  try {
    const r = await fetch(BUFFER_GQL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
      body: JSON.stringify({ query: POST_Q, variables: { input: { id: postId } } }),
      signal: AbortSignal.timeout(10000),
    })
    if (!r.ok) return null
    const j = await r.json()
    const p = j?.data?.post
    if (!p) return null
    return {
      status: p.status || null,
      error: p.error?.__typename || null,
      views: pickMetric(p.metrics, 'Views'),
      reach: pickMetric(p.metrics, 'Reach'),
      eng: pickMetric(p.metrics, 'Eng. Rate'), // engagement rate (%) — same metric name metrics.mjs uses
      reactions: pickMetric(p.metrics, 'Reactions'),
      comments: pickMetric(p.metrics, 'Comments'),
      shares: pickMetric(p.metrics, 'Shares'),
    }
  } catch {
    return null // network/parse failure → treated as "no stats yet"
  }
}

// ── 3. CI health via gh CLI ─────────────────────────────────────────────────────────
// Returns { byDate: Map<date, {cron, manual, success, failure}>, ok: bool }.
// gh may be absent (local) or unauthenticated — degrade to ok=false.
function fetchCi(dates) {
  const byDate = new Map()
  const windowSet = new Set(dates)
  try {
    const raw = execFileSync(
      'gh',
      ['run', 'list', `--workflow=${WORKFLOW}`, '--limit', '30', '--json', 'conclusion,event,createdAt'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    )
    const runs = JSON.parse(raw)
    if (!Array.isArray(runs)) return { byDate, ok: false }
    for (const run of runs) {
      const d = (run.createdAt || '').slice(0, 10) // createdAt is UTC ISO
      if (!windowSet.has(d)) continue
      if (!byDate.has(d)) byDate.set(d, { cron: 0, manual: 0, success: 0, failure: 0 })
      const rec = byDate.get(d)
      if (run.event === 'schedule') rec.cron++
      else rec.manual++ // workflow_dispatch / anything else = manual
      if (run.conclusion === 'success') rec.success++
      else if (run.conclusion === 'failure') rec.failure++
      // in-progress / cancelled runs are counted in cron/manual but neither success nor failure
    }
    return { byDate, ok: true }
  } catch (e) {
    console.warn('[weekly] gh run list failed (CI lines degrade to —):', (e.message || '').split('\n')[0])
    return { byDate, ok: false }
  }
}

// ── Compose the Russian CEO message ─────────────────────────────────────────────────
function svcTag(svc) {
  if (svc === 'instagram') return 'IG'
  if (svc === 'tiktok') return 'TT'
  return svc
}
// One number or '—'. Buffer often has 0 for hours after "sent" — 0 is a real value, keep it.
const num = (v) => (v == null ? '—' : String(v))

// ── 4. Per-post breakdown for the week (published.json + Buffer) ─────────────────────
// EXP-001 variant tag is DERIVED from the UTC day parity (even day = EN subs, odd = AR subs) —
// published.json carries no caption_lang, so the experiment's own rule is the source of truth.
const abTag = (isoDate) => (Number(isoDate.slice(8, 10)) % 2 === 0 ? 'EN' : 'AR')

// One post → one caveman line. reach / engagement only shown when Buffer actually has them.
function fmtPost(pp) {
  const parts = [`${mmdd(pp.date)} ${svcTag(pp.svc)} [${pp.ab}]`, `${num(pp.views)} просм`]
  if (pp.reach != null) parts.push(`reach ${pp.reach}`)
  if (pp.eng != null) parts.push(`eng ${Number(pp.eng).toFixed(1)}%`)
  return parts.join(' · ')
}

// Returns { lines[], top|null, bottom|null }. Reads published.json relative to the script
// (never cwd), filters to the 7-day window, fetches Buffer stats per post. Degrades to a
// single explanatory line on any failure — never throws, never blocks the report.
// `langByPost` (post_id → caption_lang, from the journal) is authoritative for the variant
// tag; day-parity (EXP-001's rule) is the fallback only for posts the journal hasn't recorded.
async function postBreakdown(dates, tok, langByPost) {
  const p = join(PROJECT_ROOT, 'published.json')
  if (!existsSync(p)) return { lines: ['посты за неделю: published.json нет'], top: null, bottom: null }
  let eps
  try { eps = JSON.parse(readFileSync(p, 'utf8')) } catch { return { lines: ['посты за неделю: published.json битый'], top: null, bottom: null } }
  if (!Array.isArray(eps)) return { lines: ['посты за неделю: published.json не массив'], top: null, bottom: null }

  const lo = dates[0], hi = dates[dates.length - 1]
  const posts = []
  for (const ep of eps) {
    if (!ep.date || ep.date < lo || ep.date > hi) continue
    for (const post of (ep.posts || [])) {
      const s = await bufferStats(post.id, tok)
      const recorded = langByPost && langByPost.get(post.id)
      const ab = recorded ? recorded.toUpperCase() : abTag(ep.date)
      posts.push({ date: ep.date, svc: post.svc, views: s ? s.views : null, reach: s ? s.reach : null, eng: s ? s.eng : null, ab })
    }
  }
  if (posts.length === 0) return { lines: ['посты за неделю: в окне публикаций нет'], top: null, bottom: null }

  const lines = []
  const shown = posts.slice(0, 8) // cap keeps the whole report ≤ 25 lines even at full 1/day cadence
  for (const pp of shown) lines.push(fmtPost(pp))
  if (posts.length > 8) lines.push(`…ещё ${posts.length - 8}`)

  // top-1 / bottom-1 by views (only posts that actually have a number can be ranked).
  const ranked = posts.filter(pp => typeof pp.views === 'number').sort((a, b) => b.views - a.views)
  const top = ranked.length ? ranked[0] : null
  const bottom = ranked.length > 1 ? ranked[ranked.length - 1] : null
  return { lines, top, bottom }
}

// ── 5. Experiments — surface RUNNING rows, flag verdicts due (feedback→decision) ─────
// Parses the EXPERIMENTS.md markdown table by header name (robust to column reordering).
// Returns [{ id, hyp, due }] for RUNNING rows only.
function runningExperiments() {
  const p = join(PROJECT_ROOT, 'EXPERIMENTS.md')
  if (!existsSync(p)) return []
  let rows
  try { rows = readFileSync(p, 'utf8').split(/\r?\n/).filter(l => l.trim().startsWith('|')) } catch { return [] }
  if (rows.length < 2) return []
  const cells = (l) => l.split('|').slice(1, -1).map(c => c.trim())
  const header = cells(rows[0]).map(h => h.toLowerCase())
  const idxId = header.indexOf('id')
  const idxHyp = header.findIndex(h => h.includes('hypothesis'))
  const idxDue = header.findIndex(h => h.includes('verdict due'))
  const idxStatus = header.indexOf('status')
  if (idxStatus < 0) return []
  const out = []
  for (const line of rows.slice(1)) {
    const c = cells(line)
    if (c.every(x => x === '' || /^:?-+:?$/.test(x))) continue // markdown separator row
    if ((c[idxStatus] || '').toUpperCase() !== 'RUNNING') continue
    out.push({ id: idxId >= 0 ? c[idxId] : '?', hyp: idxHyp >= 0 ? c[idxHyp] : '', due: idxDue >= 0 ? c[idxDue] : '' })
  }
  return out
}

// Build the experiment lines. todayIso = the report's Sunday (last date in window).
function experimentLines(todayIso) {
  const exps = runningExperiments()
  const lines = []
  for (const e of exps) {
    const hyp = e.hyp.length > 44 ? e.hyp.slice(0, 44) + '…' : e.hyp
    const name = hyp ? `${e.id}: ${hyp}` : e.id
    lines.push(`🧪 ЭКСПЕРИМЕНТ: ${name} — вердикт к ${e.due || '?'}`)
    if (e.due && e.due <= todayIso) lines.push('❗ ТРЕБУЕТ ВЕРДИКТА в это воскресенье')
  }
  return lines
}

async function compose() {
  const dates = lastNDates(DAYS)
  const journal = await fetchJournal(dates)
  const ci = fetchCi(dates)
  const tok = hasEnv('BUFFER_ACCESS_TOKEN') ? getEnv('BUFFER_ACCESS_TOKEN') : null
  if (!tok) console.warn('[weekly] BUFFER_ACCESS_TOKEN missing — stats lines degrade to —')

  let totalPosts = 0
  let enCount = 0
  let arCount = 0
  const lines = []

  for (const date of dates) {
    const rows = journal.rowsByDate.get(date) || []
    const dow = dowLabel(date)
    const dd = mmdd(date)

    // CI suffix for the day (compact): "cron✓" / "manual✓" / "3 запуска, 1 упал"
    let ciSuffix = ''
    if (ci.ok) {
      const c = ci.byDate.get(date)
      if (c) {
        const runs = c.cron + c.manual
        const src = c.cron > 0 && c.manual === 0 ? 'крон' : c.manual > 0 && c.cron === 0 ? 'ручной' : 'смешанный'
        if (c.failure > 0) ciSuffix = ` · CI ${runs} зап. (${src}), ${c.failure} упал`
        else ciSuffix = ` · CI ${src} ✓`
      } else {
        ciSuffix = ' · CI не запускался'
      }
    } // ci.ok === false → no suffix (we say it once in the tail)

    if (rows.length === 0) {
      lines.push(`${dow} ${dd}: постов нет${ciSuffix}`)
      continue
    }

    totalPosts += rows.length
    for (const row of rows) {
      if (row.caption_lang === 'en') enCount++
      else if (row.caption_lang === 'ar') arCount++
    }

    // Fetch Buffer stats per post (graceful: null → '—'). Aggregate IG/TT views for the line.
    const parts = []
    for (const row of rows) {
      const s = await bufferStats(row.post_id, tok)
      const v = s ? num(s.views) : '—'
      parts.push(`${svcTag(row.svc)} ${v}`)
    }
    // caption-lang marker if this day carried the A/B (AR present)
    const langs = [...new Set(rows.map(r => r.caption_lang).filter(Boolean))]
    const langTag = langs.length ? ` [${langs.join('/').toUpperCase()}]` : ''

    lines.push(`${dow} ${dd}: ${rows.length} пост(а)${langTag} · ${parts.join(' / ')} просм.${ciSuffix}`)
  }

  // Autopublish counter: day N of 14 (inclusive of start day).
  const startMs = Date.parse(AUTOPUBLISH_START + 'T00:00:00Z')
  const todayIso = dates[dates.length - 1]
  const todayMs = Date.parse(todayIso + 'T00:00:00Z')
  const dayN = Math.floor((todayMs - startMs) / 86400000) + 1

  // Header + degraded-source honesty + tail counter.
  const degraded = []
  if (!journal.ok) degraded.push('журнал недоступен')
  if (!ci.ok) degraded.push('CI-статус недоступен')
  if (!tok) degraded.push('Buffer-токен недоступен')

  const header = `🦫 Недельный отчёт (${mmdd(dates[0])}–${mmdd(todayIso)} UTC)`
  const summary = `Итого за 7 дней: ${totalPosts} постов · подписи EN ${enCount} / AR ${arCount}`
  const counter = `Автопубликация: день ${dayN} из ${AUTOPUBLISH_TOTAL} (старт ${mmdd(AUTOPUBLISH_START)})`

  // Sections 4 + 5 — per-post breakdown, best/worst, and experiment verdicts (the decision layer).
  // Map post_id → caption_lang from the journal so the per-post variant tag stays consistent with
  // the day-section above (day-parity is only the fallback for posts the journal hasn't logged).
  const langByPost = new Map()
  for (const rows of journal.rowsByDate.values()) {
    for (const row of rows) if (row.post_id && row.caption_lang) langByPost.set(row.post_id, row.caption_lang)
  }
  const pb = await postBreakdown(dates, tok, langByPost)
  const topBottom = []
  if (pb.top) topBottom.push(`🔝 лучший: ${fmtPost(pb.top)}`)
  if (pb.bottom) topBottom.push(`🔻 слабее всех: ${fmtPost(pb.bottom)}`)
  const expLines = experimentLines(todayIso)

  const msg = [
    header,
    ...lines,
    summary,
    ...(degraded.length ? [`⚠️ нет данных: ${degraded.join(', ')}`] : []),
    '— посты за неделю —',
    ...pb.lines,
    ...topBottom,
    ...(expLines.length ? ['— эксперименты —', ...expLines] : []),
    counter,
  ].join('\n')

  return msg
}

// ── Telegram send (only on --send) ───────────────────────────────────────────────────
async function sendToCeo(text) {
  const tgTok = getEnv('TELEGRAM_CREATORBOT_TOKEN')
  if (!tgTok) { console.error('[weekly] TELEGRAM_CREATORBOT_TOKEN missing — cannot --send'); process.exitCode = 1; return }
  try {
    const r = await fetch(`https://api.telegram.org/bot${tgTok}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CEO_CHAT_ID, text }),
    })
    const j = await r.json()
    if (j.ok === true) console.log('[weekly] sent to CEO chat', CEO_CHAT_ID)
    else { console.error('[weekly] Telegram sendMessage failed:', JSON.stringify(j).slice(0, 200)); process.exitCode = 1 }
  } catch (e) {
    console.error('[weekly] Telegram send error:', e.message); process.exitCode = 1
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────────────
async function main() {
  const msg = await compose()
  if (SEND) {
    await sendToCeo(msg)
  } else {
    // --dry (default): print only, no side effects.
    console.log(msg)
  }
}

main().catch(e => { console.error('[weekly] fatal:', e.message); process.exitCode = 1 })
