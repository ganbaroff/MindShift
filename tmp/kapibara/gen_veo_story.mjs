import './credit_gate_auto.mjs'
// gen_veo_story.mjs — Text-to-Video story-specific clips (Pixar/animated style)
// Reads football_today.json videoPrompts[] → Veo T2V → veo_i2v/i2v_NN.mp4
//
// WHY T2V OVER I2V: For animated/Pixar style, T2V generates BETTER results.
//   T2V: you describe a SCENE → Veo composes it with cinematic style
//   I2V: you animate a PHOTO → harder to control animated style
// Outputs to veo_i2v/ so assemble_reel.mjs auto-detects I2V mode and uses them.
//
// Parallel architecture: submit all N ops (fast) → poll ALL simultaneously
// Wall clock ~12 min for 5 clips vs ~50 min sequential.
//
// Run: node gen_veo_story.mjs [--test] [--from=N] [--fresh]

import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs'
import { requireEnv } from './env.mjs'

const KEY = requireEnv('GEMINI_API_KEY')
const MODEL_VEO = process.env.VEO_MODEL || 'veo-3.1-lite-generate-preview'
const BASE = 'https://generativelanguage.googleapis.com/v1beta'
const OUT = 'veo_i2v'
const POLL_MS = 8_000
const MAX_POLLS = 75  // ~10 min max per clip

mkdirSync(OUT, { recursive: true })

const TEST_ONLY = process.argv.includes('--test')
const FROM_IDX = parseInt(process.argv.find(a => a.startsWith('--from='))?.split('=')[1] || '0')
const FRESH = process.argv.includes('--fresh')

const cfg = JSON.parse(readFileSync('football_today.json', 'utf8'))
const prompts = Array.isArray(cfg.videoPrompts) ? cfg.videoPrompts : []
if (!prompts.length) { console.error('[story] no videoPrompts[] in football_today.json'); process.exit(1) }

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function submitT2V(prompt) {
  const body = {
    instances: [{ prompt }],
    parameters: { aspectRatio: '9:16', durationSeconds: 8 }
  }
  const res = await fetch(`${BASE}/models/${MODEL_VEO}:predictLongRunning`, {
    method: 'POST',
    headers: { 'x-goog-api-key': KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  const txt = await res.text()
  if (!res.ok) throw new Error(`submit HTTP ${res.status}: ${txt.slice(0, 200)}`)
  return JSON.parse(txt).name
}

async function pollOp(opName, idx) {
  for (let p = 0; p < MAX_POLLS; p++) {
    await sleep(POLL_MS)
    const res = await fetch(`${BASE}/${opName}`, { headers: { 'x-goog-api-key': KEY } })
    if (!res.ok) { process.stdout.write('?'); continue }
    const op = await res.json()
    if (TEST_ONLY && p === 0) {
      console.log(`\n[story TEST] clip ${idx} first poll:\n${JSON.stringify(op, null, 2).slice(0, 600)}`)
    }
    if (op.done) {
      if (op.error) throw new Error(`op error: ${JSON.stringify(op.error).slice(0, 200)}`)
      const uri = op.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri
        || op.response?.generatedVideos?.[0]?.video?.uri
      if (!uri) {
        console.error(`\n[story] done but no URI:\n${JSON.stringify(op.response).slice(0, 400)}`)
        throw new Error('no video URI in response')
      }
      return uri
    }
    process.stdout.write(`[${idx}]`)
  }
  throw new Error(`clip ${idx}: poll timeout (~10 min)`)
}

async function downloadClip(uri, dest) {
  const res = await fetch(uri, { headers: { 'x-goog-api-key': KEY }, redirect: 'follow' })
  if (!res.ok) throw new Error(`download HTTP ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  writeFileSync(dest, buf)
  return buf.length
}

const toProcess = TEST_ONLY
  ? [0]
  : prompts.map((_, i) => i).filter(i => {
    if (i < FROM_IDX) return false
    if (!FRESH) {
      const dest = `${OUT}/i2v_${String(i).padStart(2, '0')}.mp4`
      if (existsSync(dest) && statSync(dest).size > 100_000) {
        console.log(`[story] = clip ${i} exists — skip`)
        return false
      }
    }
    return true
  })

if (!toProcess.length) {
  console.log('[story] all clips already exist — nothing to do')
  console.log('[story] next: node render_assets.mjs && node assemble_reel.mjs')
  process.exit(0)
}

console.log(`[story] ${TEST_ONLY ? 'TEST — clip 0 only' : `${toProcess.length} clips`} → ${OUT}/ (Pixar T2V mode)`)
if (!TEST_ONLY) console.log('[story] parallel architecture: submit all → poll all simultaneously (~12 min total)')

// Phase 1: submit all ops (each submit is a fast HTTP call, returns opName immediately)
const ops = []
for (const i of toProcess) {
  try {
    const prompt = prompts[i]
    console.log(`[story] submit ${i}: ${prompt.slice(0, 65)}...`)
    const opName = await submitT2V(prompt)
    console.log(`  op: ${opName.slice(-32)}`)
    ops.push({ i, opName })
    if (toProcess.indexOf(i) < toProcess.length - 1) await sleep(500)
  } catch (e) {
    console.error(`[story] submit ${i} failed: ${e.message}`)
    if (TEST_ONLY) process.exit(1)
  }
}

if (!ops.length) { console.error('[story] no ops submitted'); process.exit(1) }
console.log(`\n[story] ${ops.length} ops submitted — polling ALL in parallel`)
console.log('[story] progress: [N] = clip N still rendering')

// Phase 2: poll ALL ops simultaneously
const results = await Promise.allSettled(ops.map(async ({ i, opName }) => {
  const dest = `${OUT}/i2v_${String(i).padStart(2, '0')}.mp4`
  const uri = await pollOp(opName, i)
  console.log(`\n[story] clip ${i} done — downloading...`)
  if (TEST_ONLY) {
    console.log(`[story TEST] URI: ${uri.slice(0, 100)}`)
    console.log('[story TEST] ✓ T2V API accepted Pixar prompt — run WITHOUT --test to generate all 5 clips')
    return { i, test: true }
  }
  const bytes = await downloadClip(uri, dest)
  console.log(`[story] ✓ i2v_${String(i).padStart(2, '0')}.mp4 (${(bytes / 1e6).toFixed(1)} MB)`)
  return { i, dest, bytes }
}))

const ok = results.filter(r => r.status === 'fulfilled' && !r.value?.test).length
const fail = results.filter(r => r.status === 'rejected').length
results.filter(r => r.status === 'rejected').forEach(r => console.error('[story]', r.reason?.message || r.reason))

if (!TEST_ONLY) {
  console.log(`\n[story] done: ${ok} clips ready, ${fail} failed`)
  if (ok >= prompts.length) {
    console.log('[story] ✓ all clips ready')
    console.log('[story] next: node render_assets.mjs && node assemble_reel.mjs')
    console.log('[story]    or: node make-sport.mjs --skip-veo')
  }
  if (fail > 0) {
    const missing = prompts.findIndex((_, i) => !existsSync(`${OUT}/i2v_${String(i).padStart(2, '0')}.mp4`))
    if (missing >= 0) console.log(`[story] resume: node gen_veo_story.mjs --from=${missing}`)
  }
}
