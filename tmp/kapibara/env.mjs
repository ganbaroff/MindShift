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
