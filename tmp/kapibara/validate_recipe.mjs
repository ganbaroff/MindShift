// validate_recipe.mjs — CI-able gate for Studio Conductor recipes (P1 of STUDIO-CONDUCTOR-SPEC.md).
// Checks: required fields, unique station ids, every producer/watcher FILE EXISTS on disk, the needs[]
// DAG only references upstream stations (dry-walk), human gates declared, and no red hex anywhere in
// the recipe (Foundation Law 1). Usage: node validate_recipe.mjs recipes/news.recipe.json  → exit 0/1.
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = dirname(fileURLToPath(import.meta.url))
const file = process.argv[2]
if (!file) { console.error('usage: node validate_recipe.mjs <recipe.json>'); process.exit(1) }
const errs = []
let r
try { r = JSON.parse(readFileSync(file, 'utf8')) } catch (e) { console.error(`[recipe] unparseable JSON: ${e.message}`); process.exit(1) }

for (const f of ['name', 'version', 'format', 'constants', 'stations', 'human_gates']) if (!(f in r)) errs.push(`missing field: ${f}`)
if (Array.isArray(r.stations)) {
  const seen = new Set()
  for (const s of r.stations) {
    if (!s.id) { errs.push('station without id'); continue }
    if (seen.has(s.id)) errs.push(`duplicate station id: ${s.id}`)
    for (const need of s.needs || []) if (!seen.has(need)) errs.push(`station '${s.id}' needs '${need}' which is not produced upstream`)
    seen.add(s.id)
    for (const role of ['producer', 'watcher']) {
      const p = s[role]
      if (!p) { errs.push(`station '${s.id}' missing ${role}`); continue }
      if (!existsSync(join(dir, p))) errs.push(`station '${s.id}' ${role} not found on disk: ${p}`)
    }
    if (s.human_gate && !(r.human_gates || []).includes(s.human_gate)) errs.push(`station '${s.id}' human_gate '${s.human_gate}' not declared in human_gates`)
  }
}
// Foundation Law 1: no red hex may enter via recipe data
const raw = readFileSync(file, 'utf8')
const red = raw.match(/#(?:EF4444|DC2626|FF0000|F87171|B91C1C)/i)
if (red) errs.push(`RED HEX in recipe: ${red[0]} (Foundation Law 1)`)

if (errs.length) {
  console.error(`[recipe] FAIL ${file} — ${errs.length} error(s):`)
  for (const e of errs) console.error('  - ' + e)
  process.exit(1)
}
console.log(`[recipe] PASS ${file} — ${r.stations.length} stations, DAG ok, all producers/watchers exist, gates: ${r.human_gates.join('+')}`)
