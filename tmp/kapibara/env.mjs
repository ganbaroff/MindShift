// Project-local env resolver — no hardcoded absolute paths (fixes audit blocker T1).
// Reads <project-root>/.env and <project-root>/.secrets.env relative to this file.
// Never prints values. Scripts call getEnv('NAME') instead of readFileSync('C:/.../.env').
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// Try project-local files first, then fall back to process.env (GitHub Actions / Railway CI)
// Also check legacy Windows paths so existing local installs keep working
const ROOT = dirname(fileURLToPath(import.meta.url)) // tmp/kapibara
const cache = {}
let loaded = false

function loadFile(name) {
  const p = join(ROOT, name)
  if (!existsSync(p)) return
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (m && !(m[1] in cache)) cache[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
}

const LEGACY = [
  ['C:/Projects/mindshift/.env', null],
  ['C:/Users/user/Downloads/videos/.secrets.env', null],
]
function loadAbsolute(p) {
  if (!existsSync(p)) return
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (m && !(m[1] in cache)) cache[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
}
function ensure() {
  if (loaded) return
  loadFile('.env'); loadFile('.secrets.env')       // project-local (CI writes these)
  for (const [p] of LEGACY) loadAbsolute(p)       // Windows legacy fallback
  for (const k of Object.keys(process.env)) if (process.env[k]) cache[k] = process.env[k] // CI env vars win
  loaded = true
}

export function getEnv(name) { ensure(); return cache[name] }
export function requireEnv(name) {
  ensure()
  if (!cache[name]) { console.error(`[env] missing required key: ${name} (add it to .env / .secrets.env)`); process.exit(1) }
  return cache[name]
}
export function hasEnv(name) { ensure(); return cache[name] != null && cache[name] !== '' }
export const PROJECT_ROOT = ROOT

// Factory Law 6 — ONE voice per format, hardcoded. Change ONLY with a fresh CEO
// ear-test receipt (approve a short sample first), NEVER via a CLI flag.
// CEO ear-pick 2026-06-27 (video card): Algieba primary / Enceladus backup; re-affirmed 2026-07-05
// («я выбирал другой голос, один голос постоянно») — Puck was a default nobody chose.
export const LOCKED_VOICE = 'Algieba'

// Factory Law 2 — news pace-lock. Voice-body target in seconds; +~12.8s outro
// ≈ 42s total, top of the 32-42s completion band. reconcat.mjs atempo-clamps to hit this.
// 27 produced tempo ~1.26 → critic heard "robotic/sped-up"; 29 trades 2s for naturalness.
export const NEWS_TARGET_SEC = 29
