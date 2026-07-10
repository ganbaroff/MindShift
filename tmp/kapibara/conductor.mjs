// conductor.mjs — the format-blind kernel of Studio Conductor (P1 skeleton; STUDIO-CONDUCTOR-SPEC.md).
// Walks a RECIPE's stations in dependency order and journals every step to studio_steps.jsonl
// (job_id, stage, producer, watcher, status, ts) — the local prototype of the studio_steps table
// (the Supabase migration is CEO-gated; the journal schema here IS the table schema). The conductor
// reasons about NOTHING: recipe + watchers decide. --mock walks without executing (CI-provable, 0 spend).
// Usage: node conductor.mjs recipes/news.recipe.json --mock [--job=ID]
import { readFileSync, appendFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const dir = dirname(fileURLToPath(import.meta.url))
const recipePath = process.argv[2]
const MOCK = process.argv.includes('--mock')
const jobId = (process.argv.find(a => a.startsWith('--job=')) || '').split('=')[1] || `job-${Math.random().toString(36).slice(2, 8)}`
if (!recipePath) { console.error('usage: node conductor.mjs <recipe.json> [--mock] [--job=ID]'); process.exit(1) }

// Gate 0: a recipe that fails validation never walks (same fail-closed posture as line.mjs).
execFileSync('node', [join(dir, 'validate_recipe.mjs'), recipePath], { stdio: 'inherit' })
const recipe = JSON.parse(readFileSync(recipePath, 'utf8'))
const JOURNAL = join(dir, 'studio_steps.jsonl')
const step = (stage, status, extra = {}) => {
  const row = { job_id: jobId, recipe: recipe.name, v: recipe.version, stage, status, ts: new Date().toISOString(), ...extra }
  appendFileSync(JOURNAL, JSON.stringify(row) + '\n')
  return row
}

console.log(`[conductor] job=${jobId} recipe=${recipe.name}@${recipe.version} (${MOCK ? 'MOCK walk' : 'LIVE'}) — ${recipe.stations.length} stations`)
const done = new Set()
for (const s of recipe.stations) {
  const blocked = (s.needs || []).filter(n => !done.has(n))
  if (blocked.length) { step(s.id, 'blocked', { blocked_on: blocked }); console.error(`[conductor] '${s.id}' blocked on ${blocked} — DAG violated at runtime`); process.exit(1) }
  if (s.human_gate) {
    // Human gates are PARKED signal states (spec: park + notify, never fail-closed) — in mock we log the park.
    step(s.id, MOCK ? 'mock-parked-human-gate' : 'awaiting_human', { gate: s.human_gate, producer: s.producer })
    console.log(`  ⏸ ${s.id} → HUMAN GATE '${s.human_gate}' ${MOCK ? '(mock: auto-pass)' : '— parked, notify CEO'}`)
    if (!MOCK) process.exit(0)
  } else {
    step(s.id, MOCK ? 'mock-pass' : 'todo-live-exec', { producer: s.producer, watcher: s.watcher })
    console.log(`  ✓ ${s.id} (${s.producer} → gate ${s.watcher})${MOCK ? '' : ' [live exec: P2]'}`)
  }
  done.add(s.id)
}
console.log(`[conductor] job=${jobId} walked ${done.size}/${recipe.stations.length} stations — journal: studio_steps.jsonl`)
