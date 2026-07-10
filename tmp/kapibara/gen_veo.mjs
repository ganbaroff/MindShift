import './credit_gate_auto.mjs'
// gen_veo.mjs — generate MOVING b-roll with Veo 3.1 (lite) on the existing GEMINI_API_KEY.
// Same key + REST pattern as gen_vzimg.mjs. SAFE BY DESIGN: prompts are PEOPLE-FREE
// (Veo RAI-filters person prompts to an empty result anyway) — generic stadiums/balls/turf,
// no faces, no logos, no text → the un-bannable moat. SynthID watermark is on all output;
// our on-screen "AI · без съёмки матча" disclosure is the legal shield.
//
// Usage:
//   node gen_veo.mjs "a single cinematic prompt"      # one test clip → veo_clips/test.mp4
//   node gen_veo.mjs veo_shots.json                   # batch from { "shots":[{name,prompt,dur?}] }
//
// Money rule: Veo bills to the project's $247 trial credit. Each failed gen is NOT charged.
// Idempotent: an existing non-empty veo_clips/<name>.mp4 is skipped (no double-spend on re-run).
// Veo URLs die in ~48h → we download each MP4 immediately on completion.
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs'
import { requireEnv } from './env.mjs'

const KEY = requireEnv('GEMINI_API_KEY')
const MODEL = process.env.VEO_MODEL || 'veo-3.1-lite-generate-preview'
const BASE = 'https://generativelanguage.googleapis.com/v1beta'
const OUT = 'veo_clips'
const POLL_MS = 10_000
const MAX_POLLS = 48          // ~8 min ceiling per clip
const SUBMIT_RETRIES = 3      // transient (code 13 / 5xx) retries

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

async function submit(prompt, dur) {
  const body = {
    instances: [{ prompt }],
    parameters: {
      aspectRatio: '9:16',
      durationSeconds: Number(dur || 8),   // API rejects string here despite docs — must be a number
      // numberOfVideos unsupported on lite (always 1); personGeneration OMITTED (allow_adult → 400; scenes are people-free)
    },
  }
  for (let attempt = 1; attempt <= SUBMIT_RETRIES; attempt++) {
    const res = await fetch(`${BASE}/models/${MODEL}:predictLongRunning`, {
      method: 'POST',
      headers: { 'x-goog-api-key': KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const txt = await res.text()
    if (res.ok) { return JSON.parse(txt).name }
    const transient = res.status >= 500 || res.status === 429 || /code.?.?13|UNAVAILABLE|INTERNAL/i.test(txt)
    console.warn(`  submit HTTP ${res.status} (attempt ${attempt}/${SUBMIT_RETRIES}): ${txt.slice(0, 160)}`)
    if (!transient || attempt === SUBMIT_RETRIES) throw new Error(`submit failed: HTTP ${res.status}`)
    await sleep(3000 * attempt)
  }
}

async function poll(opName) {
  for (let i = 0; i < MAX_POLLS; i++) {
    await sleep(POLL_MS)
    const res = await fetch(`${BASE}/${opName}`, { headers: { 'x-goog-api-key': KEY } })
    if (!res.ok) { console.warn(`  poll HTTP ${res.status}`); continue }
    const op = await res.json()
    if (op.done) {
      if (op.error) throw new Error(`op error: ${JSON.stringify(op.error).slice(0, 200)}`)
      const uri = op.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri
        || op.response?.generatedVideos?.[0]?.video?.uri   // tolerate alt shape
      if (!uri) throw new Error(`done but no video uri: ${JSON.stringify(op.response).slice(0, 300)}`)
      return uri
    }
    process.stdout.write('.')
  }
  throw new Error('poll timeout')
}

async function download(uri, dest) {
  const res = await fetch(uri, { headers: { 'x-goog-api-key': KEY }, redirect: 'follow' })
  if (!res.ok) throw new Error(`download HTTP ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  writeFileSync(dest, buf)
  return buf.length
}

async function genOne({ name, prompt, dur }) {
  const dest = `${OUT}/${name}.mp4`
  if (existsSync(dest) && statSync(dest).size > 10_000) {
    console.log(`  = ${name}.mp4 exists (${(statSync(dest).size / 1e6).toFixed(1)} MB) — skip`)
    return { name, dest, skipped: true }
  }
  console.log(`  → ${name}: submitting…`)
  const op = await submit(prompt, dur)
  console.log(`    op=${op}`)
  const uri = await poll(op)
  const bytes = await download(uri, dest)
  console.log(`\n  ✓ ${name}.mp4 (${(bytes / 1e6).toFixed(1)} MB)`)
  return { name, dest, bytes }
}

const arg = process.argv[2]
if (!arg) { console.error('usage: node gen_veo.mjs "<prompt>" | node gen_veo.mjs veo_shots.json'); process.exit(1) }
mkdirSync(OUT, { recursive: true })

let shots
if (arg.endsWith('.json')) {
  shots = JSON.parse(readFileSync(arg, 'utf8')).shots
} else {
  shots = [{ name: 'test', prompt: arg, dur: 8 }]
}

const results = []
for (const s of shots) {
  try { results.push(await genOne(s)) }
  catch (e) { console.error(`  ✗ ${s.name}: ${e.message}`); results.push({ name: s.name, error: e.message }) }
}
writeFileSync(`${OUT}/manifest.json`, JSON.stringify(results, null, 2))
const ok = results.filter(r => r.dest && !r.error).length
console.log(`[gen_veo] ${ok}/${shots.length} clips ready in ${OUT}/`)
