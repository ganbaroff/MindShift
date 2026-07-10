// conductor.mjs — the format-blind kernel of Studio Conductor (P2: LIVE exec; STUDIO-CONDUCTOR-SPEC.md).
// Walks a RECIPE's stations in order and journals every step to studio_steps.jsonl; job states live in
// studio_jobs.jsonl (both = local prototypes of the studio_* tables; the Supabase migration is CEO-gated).
// The conductor reasons about NOTHING — the recipe declares, watchers/gates decide, code tallies.
//
// LIVE semantics (P2):
//   · station.produces + artifact exists + no --force  → SKIP (cheap idempotency; input-hash = P3)
//   · producer *.html/*.json                            → asset check (exists = pass), not exec
//   · station.human_gate + produces  → produce first, then PARK until --approve=<gate> (Law 7: ear
//     hears the sample BEFORE the expensive downstream render)
//   · station.human_gate, no produces → PARK BEFORE exec (pure approval, e.g. ceo_ok before deliver)
//   · producer exit ≠ 0 → journal fail + exit 1 (REWORK is visible, never silent)
//   · re-running the same --job resumes: skips green artifacts, re-parks at the open gate
// MOCK (--mock): walk + journal only, 0 spend, auto-pass human gates (CI-provable).
// Usage: node conductor.mjs <recipe.json> [--mock] [--job=ID] [--approve=<gate>] [--force]
import { readFileSync, appendFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const DIR = dirname(fileURLToPath(import.meta.url))
const recipePath = process.argv[2]
const MOCK = process.argv.includes('--mock')
const FORCE = process.argv.includes('--force')
const argOf = k => (process.argv.find(a => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=')
const jobId = argOf('job') || `job-${Math.random().toString(36).slice(2, 8)}`
const approveGate = argOf('approve')
// --approve without --job would mint a fresh random job and strand the parked one (panel #18)
if (approveGate && !argOf('job')) { console.error('[conductor] --approve requires --job=<id> (the parked job)'); process.exit(1) }
if (!recipePath) { console.error('usage: node conductor.mjs <recipe.json> [--mock] [--job=ID] [--approve=<gate>] [--force]'); process.exit(1) }

// Gate 0: a recipe that fails validation never walks.
execFileSync('node', [join(DIR, 'validate_recipe.mjs'), recipePath], { stdio: 'inherit' })
const recipe = JSON.parse(readFileSync(recipePath, 'utf8'))
const STEPS = join(DIR, 'studio_steps.jsonl'), JOBS = join(DIR, 'studio_jobs.jsonl')
const step = (stage, status, extra = {}) =>
  appendFileSync(STEPS, JSON.stringify({ job_id: jobId, recipe: recipe.name, v: recipe.version, stage, status, ts: new Date().toISOString(), ...extra }) + '\n')
const jobState = (state, extra = {}) =>
  appendFileSync(JOBS, JSON.stringify({ job_id: jobId, recipe: recipe.name, state, ts: new Date().toISOString(), ...extra }) + '\n')
const approvals = new Set()
// --force regenerates gated artifacts → prior approvals are STALE (the ear approved the OLD sample;
// Law 7 demands a fresh ear on a fresh voice — panel #14). Force starts approvals from scratch.
if (!FORCE && existsSync(JOBS)) for (const line of readFileSync(JOBS, 'utf8').split('\n')) {
  if (!line.trim()) continue
  try { const r = JSON.parse(line); if (r.job_id === jobId && r.state?.startsWith('approved_')) approvals.add(r.state.slice(9)) } catch {}
}
if (approveGate) { approvals.add(approveGate); jobState(`approved_${approveGate}`); console.log(`[conductor] gate '${approveGate}' approved for job=${jobId}`) }
// journal-based resume: stages already green for THIS job are not re-run (a critic re-run on resume
// would re-upload the clip to Gemini every tick — panel #6/#11). --force overrides.
const greenStages = new Set(), infraCount = {}
if (!FORCE && existsSync(STEPS)) for (const line of readFileSync(STEPS, 'utf8').split('\n')) {
  if (!line.trim()) continue
  try {
    const r = JSON.parse(line); if (r.job_id !== jobId) continue
    if (['pass', 'asset-ok'].includes(r.status)) greenStages.add(r.stage)
    if (r.status === 'fail') greenStages.delete(r.stage)
    if (r.status === 'parked-infra') infraCount[r.stage] = (infraCount[r.stage] || 0) + 1
  } catch {}
}

const isAsset = p => /\.(html|json|png|jpg)$/i.test(p)
const runProducer = s => {
  const t0 = Date.now()
  try {
    execFileSync('node', [s.producer, ...(s.args || [])], { stdio: 'inherit', cwd: DIR })
    return { ok: true, ms: Date.now() - t0 }
  } catch (e) { return { ok: false, ms: Date.now() - t0, code: e.status } }
}

console.log(`[conductor] job=${jobId} recipe=${recipe.name}@${recipe.version} (${MOCK ? 'MOCK' : 'LIVE'}) — ${recipe.stations.length} stations`)
const done = new Set()
for (const s of recipe.stations) {
  const blocked = (s.needs || []).filter(n => !done.has(n))
  if (blocked.length) { step(s.id, 'blocked', { blocked_on: blocked }); console.error(`[conductor] '${s.id}' blocked on ${blocked}`); process.exit(1) }

  if (MOCK) {
    step(s.id, s.human_gate ? 'mock-parked-human-gate' : 'mock-pass', { producer: s.producer, gate: s.human_gate })
    console.log(`  ${s.human_gate ? '⏸' : '✓'} ${s.id}${s.human_gate ? ` → HUMAN GATE '${s.human_gate}' (mock auto-pass)` : ''}`)
    done.add(s.id); continue
  }

  // pure approval gate (no produces): park BEFORE exec
  if (s.human_gate && !s.produces && !approvals.has(s.human_gate)) {
    step(s.id, 'awaiting_human', { gate: s.human_gate }); jobState(`awaiting_${s.human_gate}`, { stage: s.id })
    console.log(`  ⏸ ${s.id} → parked on '${s.human_gate}' (resume: --job=${jobId} --approve=${s.human_gate})`)
    process.exit(0)
  }

  // produce (journal-skip for stages already green this job, then existence-skip)
  const artifact = s.produces ? join(DIR, s.produces) : null
  if (greenStages.has(s.id)) {
    step(s.id, 'skipped-journal', {}); console.log(`  ↷ ${s.id} (journal: already green this job)`)
    done.add(s.id); continue
  }
  if (isAsset(s.producer)) {
    if (!existsSync(join(DIR, s.producer))) { step(s.id, 'fail', { missing: s.producer }); console.error(`  ✗ ${s.id}: asset missing ${s.producer}`); process.exit(1) }
    step(s.id, 'asset-ok', { producer: s.producer }); console.log(`  ✓ ${s.id} (asset ${s.producer})`)
  } else if (artifact && existsSync(artifact) && !FORCE) {
    step(s.id, 'skipped-exists', { artifact: s.produces }); console.log(`  ↷ ${s.id} (exists: ${s.produces})`)
  } else {
    console.log(`  ▶ ${s.id} — node ${s.producer} ${(s.args || []).join(' ')}`)
    const r = runProducer(s)
    if (!r.ok && r.code === 3) {
      // exit 3 = PARK (infra fault: 429/timeout/upload). Spec: park + retry next tick — a transient
      // fault must never masquerade as a quality REWORK. But a PERSISTENT fault must not drain quota
      // forever (panel #8): after 3 infra parks on the same stage → needs_human.
      const n = (infraCount[s.id] || 0) + 1
      if (n >= 3) { step(s.id, 'fail', { producer: s.producer, reason: `infra-park x${n} → ceiling` }); jobState('needs_human', { stage: s.id }); console.error(`  ✗ ${s.id} infra fault x${n} → ceiling reached, parked to needs_human`); process.exit(1) }
      step(s.id, 'parked-infra', { producer: s.producer, ms: r.ms, n }); jobState('parked_infra', { stage: s.id })
      console.log(`  ⏸ ${s.id} infra fault (${n}/3) → parked (retry next tick, NOT rework)`); process.exit(0)
    }
    if (!r.ok) { step(s.id, 'fail', { producer: s.producer, exit: r.code, ms: r.ms }); jobState('needs_human', { stage: s.id }); console.error(`  ✗ ${s.id} exit=${r.code} → REWORK (visible, parked to needs_human)`); process.exit(1) }
    step(s.id, 'pass', { producer: s.producer, ms: r.ms, artifact: s.produces })
    if (artifact && !existsSync(artifact)) { step(s.id, 'fail', { missing_artifact: s.produces }); console.error(`  ✗ ${s.id}: declared artifact not produced: ${s.produces}`); process.exit(1) }
    console.log(`  ✓ ${s.id} (${(r.ms / 1000).toFixed(1)}s)`)
  }

  // produce-then-park gate (Law 7: the ear sample exists BEFORE the expensive render continues)
  if (s.human_gate && s.produces && !approvals.has(s.human_gate)) {
    step(s.id, 'awaiting_human', { gate: s.human_gate, artifact: s.produces }); jobState(`awaiting_${s.human_gate}`, { stage: s.id })
    console.log(`  ⏸ ${s.id} produced '${s.produces}' → parked on '${s.human_gate}' (resume: --job=${jobId} --approve=${s.human_gate})`)
    process.exit(0)
  }
  done.add(s.id)
}
jobState(MOCK ? 'mock-walked' : 'complete')
console.log(`[conductor] job=${jobId} ${MOCK ? 'mock-walked' : 'COMPLETE'} ${done.size}/${recipe.stations.length} stations`)
