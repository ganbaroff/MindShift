// factory_control.mjs — the CONTROL STATE the whole factory obeys (Ф2, 2026-07-20).
//
// THE PROBLEM IT SOLVES: today the Пульт bot and the daily cron never touch — the bot can receive
// /stop /news /ladder but make-clip reads NO flag, so the CEO's "pult" is wired to nothing. This module
// is the single shared state both halves read/write: the bot UPSERTS it, the cron READS it.
//
// THREE CONTROLS the CEO asked for (2026-07-20):
//   · posting_enabled  → /pause /resume            (turn posting on/off)
//   · active_genre     → /genre news|quiz|…        (choose the genre)
//   · queued_script    → /script <text> or forward (publish YOUR own script next run)
//
// SAFETY LAW (non-negotiable): a control-read failure must NEVER break the daily pipeline. If the table
// is missing, Supabase is unreachable, or anything throws, getControl() returns the SAFE DEFAULT
// (posting on, genre=news, no queued script) — i.e. exactly today's behavior. The control layer can only
// ADD control; it can never subtract reliability. Fail-OPEN to the status quo.
//
// Storage: Supabase table `factory_control` (single row id=1). Offline/CI: local factory_control.local.json
// (gitignored) when PULT_MOCK=1 or no Supabase keys — so this is testable with zero network.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getEnv } from './env.mjs'

const DIR = dirname(fileURLToPath(import.meta.url))
const LOCAL = join(DIR, 'factory_control.local.json')
const MOCK = process.env.PULT_MOCK === '1'

// the genre registry — a genre is DATA: which engine renders it + the human label. Adding a genre later
// is one row here, no kernel change (the point of the recipe model). CEO start set: news + quiz.
export const GENRES = {
  news: { label: 'AI News', engine: 'make-clip.mjs', args: ['--upload'], desc: 'daily English AI-news digest (the live default)' },
  quiz: { label: 'Quiz / Ladder', engine: 'ladder_render.mjs', args: [], desc: '5-question engagement ladder' },
  // greeting is NOT here on purpose: it is the on-demand PAID product, not a daily-channel genre.
  // add more here as data, e.g.: explainer, product-ad — each maps to an engine that already exists.
}
export const DEFAULT_CONTROL = { posting_enabled: true, active_genre: 'news', queued_script: null, updated_by: 'default', updated_at: null }

// Read Supabase creds the SAME proven way journal.mjs does — via env.mjs getEnv, which loads the
// CI-written .env/.secrets.env FILES. The cron writes creds to .env, NOT to process.env; reading bare
// process.env here returned null in prod → getControl fail-opened → the Пульт silently did nothing.
// (Ф2 fix 2026-07-20: align with journal.mjs so the CEO's control actually takes effect.)
function supa() {
  const url = getEnv('VITE_SUPABASE_URL'), key = getEnv('SUPABASE_SERVICE_ROLE_KEY')
  return (url && key) ? { url: url.replace(/\/+$/, ''), key } : null
}
const timeout = (ms) => { const ac = new AbortController(); const t = setTimeout(() => ac.abort(), ms); return { signal: ac.signal, done: () => clearTimeout(t) } }

function readLocal() {
  try { return existsSync(LOCAL) ? { ...DEFAULT_CONTROL, ...JSON.parse(readFileSync(LOCAL, 'utf8')) } : { ...DEFAULT_CONTROL } }
  catch { return { ...DEFAULT_CONTROL } }
}
function writeLocal(state) { try { writeFileSync(LOCAL, JSON.stringify(state, null, 2)) } catch {} ; return state }

// normalize + validate whatever we read so a garbage row can never mis-steer the factory
function sanitize(raw) {
  const s = { ...DEFAULT_CONTROL, ...(raw || {}) }
  s.posting_enabled = s.posting_enabled !== false            // anything but explicit false = on
  if (!GENRES[s.active_genre]) s.active_genre = 'news'        // unknown genre → safe default
  if (typeof s.queued_script !== 'string' || !s.queued_script.trim()) s.queued_script = null
  return s
}

// READ — used by make-clip at the top of each run. NEVER throws (fail-open to DEFAULT_CONTROL).
export async function getControl() {
  if (MOCK || !supa()) return sanitize(readLocal())
  try {
    const { url, key } = supa(); const t = timeout(8000)
    const r = await fetch(`${url}/rest/v1/factory_control?id=eq.1&select=*`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: t.signal })
    t.done()
    if (!r.ok) { console.warn(`[factory_control] read HTTP ${r.status} → SAFE DEFAULT (posting on, news)`); return { ...DEFAULT_CONTROL } }
    const rows = await r.json()
    return sanitize(Array.isArray(rows) && rows[0] ? rows[0] : DEFAULT_CONTROL)
  } catch (e) { console.warn(`[factory_control] read failed (${String(e.message).slice(0, 60)}) → SAFE DEFAULT`); return { ...DEFAULT_CONTROL } }
}

// WRITE — used by the Пульт bot verbs. patch = subset of {posting_enabled, active_genre, queued_script}.
export async function setControl(patch, by = 'ceo') {
  const clean = {}
  if ('posting_enabled' in patch) clean.posting_enabled = patch.posting_enabled !== false
  if ('active_genre' in patch) { if (!GENRES[patch.active_genre]) throw new Error(`unknown genre '${patch.active_genre}' (have: ${Object.keys(GENRES).join(', ')})`); clean.active_genre = patch.active_genre }
  if ('queued_script' in patch) clean.queued_script = (typeof patch.queued_script === 'string' && patch.queued_script.trim()) ? patch.queued_script.trim() : null
  clean.updated_by = by; clean.updated_at = new Date().toISOString()
  if (MOCK || !supa()) return writeLocal({ ...readLocal(), ...clean })
  const { url, key } = supa(); const t = timeout(8000)
  const r = await fetch(`${url}/rest/v1/factory_control?id=eq.1`, {
    method: 'PATCH', headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify(clean), signal: t.signal })
  t.done()
  if (!r.ok) throw new Error(`setControl HTTP ${r.status}: ${(await r.text()).slice(0, 120)}`)
  const rows = await r.json(); return sanitize(rows[0])
}

// one-line human status for /status
export function describe(s) {
  return `📊 Фабрика: постинг ${s.posting_enabled ? '🟢 ВКЛ' : '🔴 ВЫКЛ'} · жанр «${GENRES[s.active_genre]?.label || s.active_genre}»`
    + (s.queued_script ? ` · 📝 твой сценарий в очереди (${s.queued_script.length} симв.)` : ' · сценарий: авто')
    + (s.updated_at ? `\nизменено: ${s.updated_at.slice(0, 16)} (${s.updated_by})` : '')
}

// CLI: node factory_control.mjs [status|set posting on|off|genre <g>|script <text>]  (uses local store offline)
if (process.argv[1]?.endsWith('factory_control.mjs')) {
  const [, , cmd, a, ...rest] = process.argv
  const run = async () => {
    if (!cmd || cmd === 'status') { console.log(describe(await getControl())); return }
    if (cmd === 'set') {
      if (a === 'posting') console.log(describe(await setControl({ posting_enabled: rest[0] !== 'off' }, 'cli')))
      else if (a === 'genre') console.log(describe(await setControl({ active_genre: rest[0] }, 'cli')))
      else if (a === 'script') console.log(describe(await setControl({ queued_script: rest.join(' ') }, 'cli')))
      else console.error('usage: set posting on|off | set genre <g> | set script <text>')
      return
    }
    console.error('usage: node factory_control.mjs [status | set posting on|off | set genre <g> | set script <text>]')
  }
  run().catch(e => { console.error(e.message); process.exit(1) })
}
