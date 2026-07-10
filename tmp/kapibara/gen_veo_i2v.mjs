import './credit_gate_auto.mjs'
// gen_veo_i2v.mjs — Image-to-Video: existing vz_*.jpg → Veo animate → story-specific clips
//
// WHY BETTER THAN T2V:
//   T2V: same 6 generic clips recycled every story (tunnel/floodlights/ball_roll/boots_turf/net_ripple/grandstand)
//   I2V: each story gets clips that MATCH its content (Messi story → stadium wide, ball bokeh, crowd energy)
//        Your image controls the COMPOSITION and MOOD. Veo adds camera motion + animation.
//
// PARALLEL ARCHITECTURE (key optimization):
//   WRONG: sequential = submit clip 0 → wait 10min → submit clip 1 → wait 10min → ... = 50 min
//   RIGHT: submit all 5 (fast) → poll all 5 in parallel (they render server-side simultaneously) = 12 min
//   Trial account concurrent cap = 2-5; polling is cheap — all ops queue server-side regardless.
//
// I2V API (Gemini Developer API, same endpoint as T2V):
//   POST generativelanguage.googleapis.com/v1beta/models/veo-3.1-lite-generate-preview:predictLongRunning
//   instances[0] = { prompt, image: { bytesBase64Encoded, mimeType } }
//   parameters  = { aspectRatio: "9:16", durationSeconds: 8 }
//   ✓ image field confirmed in official schema (same as Vertex AI minus referenceType wrapper)
//
// ⚠️  GCP $247 trial credit, EXPIRES JUL 8 2026. Each I2V clip ≈ same cost as T2V gen.
//     Open billing: https://console.cloud.google.com/billing (project gen-lang-client-0321449510)
//     Idempotent: existing i2v_NN.mp4 clips are skipped (safe to re-run after partial failure)
//
// ⚠️  Run --test first to verify Veo accepts the image field (prints raw op + first clip):
//     node gen_veo_i2v.mjs --test
//
// Optional: --fresh  → re-generate portrait images from Gemini even if vz_*.jpg exist
//           --from=N → start from index N (resume after partial failure)
//
// Prereqs: vz_0.jpg…vz_N.jpg from gen_vzimg.mjs; GEMINI_API_KEY in env; ffmpeg in PATH
// Run order: gen_voice_football → gen_veo_i2v → render_assets → assemble_reel
// Or single command: node make-sport.mjs

import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { requireEnv } from './env.mjs'

const KEY = requireEnv('GEMINI_API_KEY')
const MODEL_VEO = process.env.VEO_MODEL || 'veo-3.1-lite-generate-preview'
const MODEL_IMG = 'gemini-3-pro-image-preview'
const BASE = 'https://generativelanguage.googleapis.com/v1beta'
const OUT = 'veo_i2v'
const POLL_MS = 8_000
const MAX_POLLS = 60   // ~8 min per clip

mkdirSync(OUT, { recursive: true })

const TEST_ONLY = process.argv.includes('--test')
const FRESH_IMAGES = process.argv.includes('--fresh')
const FROM_IDX = parseInt(process.argv.find(a => a.startsWith('--from='))?.split('=')[1] || '0')

const cfg = JSON.parse(readFileSync('football_today.json', 'utf8'))
const imagePrompts = Array.isArray(cfg.imagePrompts) ? cfg.imagePrompts : []
if (!imagePrompts.length) { console.error('[i2v] no imagePrompts[] in football_today.json'); process.exit(1) }

// singleImage mode: football_today.json has "singleImage": true
// → generates ONE portrait (index 0), copies it to all other indices.
// CEO use-case: same face structure throughout, only motionPrompts change per clip.
const SINGLE_IMAGE = Boolean(cfg.singleImage)
if (SINGLE_IMAGE) console.log('[i2v] singleImage mode — one portrait, all clips share the same face')

// Motion prompts: how Veo animates each image (what moves, how the camera behaves)
// Override per story by adding "motionPrompts": [] to football_today.json
const DEFAULT_MOTION = [
  'camera slowly zooms in toward center pitch, atmospheric haze deepens, floodlights pulse with dramatic energy',
  'ball rotates in place gently, dew droplets catch floodlight, bokeh swirls slowly in the deep background',
  'crowd shifts rhythmically, silhouetted scarves wave and sway in unison, euphoric atmosphere builds',
  'camera drifts slowly across the worn leather, dew catches floodlight, grass blades sway gently',
  'camera tilts slowly upward revealing the grand scale of the stadium, distant lights shimmer softly',
]
const motionHints = Array.isArray(cfg.motionPrompts) ? cfg.motionPrompts : DEFAULT_MOTION

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

// ── Image prep: get 9:16 portrait image for Veo input ───────────────────────
// Default: center-crop existing vz_*.jpg (works for centered football subjects)
// --fresh: generate new portrait images from Gemini before I2V
async function getPortraitImage(i) {
  const portraitPath = `vz_portrait_${i}.jpg`

  if (!FRESH_IMAGES && existsSync(portraitPath) && statSync(portraitPath).size > 5_000) {
    return portraitPath
  }
  const landscapePath = `vz_${i}.jpg`
  if (!FRESH_IMAGES && existsSync(landscapePath) && statSync(landscapePath).size > 5_000) {
    execFileSync('ffmpeg', [
      '-y', '-i', landscapePath,
      '-vf', 'scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280',
      '-q:v', '3', portraitPath
    ], { stdio: 'ignore' })
    return portraitPath
  }

  // Generate fresh portrait from Gemini (adds vertical framing hint to prompt)
  const prompt = imagePrompts[i] + ' Vertical 9:16 portrait orientation, full-height dramatic composition, mobile phone screen.'
  const url = `${BASE}/models/${MODEL_IMG}:generateContent`
  let buf
  for (const modalities of [['IMAGE'], ['TEXT', 'IMAGE']]) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'x-goog-api-key': KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: modalities } }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 120)}`)
      const j = await res.json()
      const part = j.candidates?.[0]?.content?.parts?.find(p => p.inlineData)
      if (!part) throw new Error('no inlineData')
      buf = Buffer.from(part.inlineData.data, 'base64')
      break
    } catch (e) {
      if (modalities[0] === 'IMAGE') console.warn(`  [img ${i}] IMAGE-only: ${e.message} → retry TEXT,IMAGE`)
      else throw e
    }
  }
  const rawPath = `vz_portrait_${i}.raw`
  writeFileSync(rawPath, buf)
  execFileSync('ffmpeg', ['-y', '-i', rawPath, '-vf', 'scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280', '-q:v', '3', portraitPath], { stdio: 'ignore' })
  try { rmSync(rawPath) } catch {}
  return portraitPath
}

// ── Veo I2V submit (fast — returns opName immediately) ──────────────────────
async function submitI2V(imagePath, motion) {
  const imgBuf = readFileSync(imagePath)
  const b64 = imgBuf.toString('base64')
  const body = {
    instances: [{
      prompt: motion,
      image: { bytesBase64Encoded: b64, mimeType: 'image/jpeg' }
    }],
    parameters: {
      aspectRatio: '9:16',
      durationSeconds: 8
      // omit personGeneration (people-free scenes); omit numberOfVideos (unsupported on lite)
    }
  }
  const res = await fetch(`${BASE}/models/${MODEL_VEO}:predictLongRunning`, {
    method: 'POST',
    headers: { 'x-goog-api-key': KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const txt = await res.text()
  if (!res.ok) throw new Error(`submit HTTP ${res.status}: ${txt.slice(0, 200)}`)
  return JSON.parse(txt).name
}

// ── Poll op until done, return video URI ────────────────────────────────────
async function pollOp(opName, idx) {
  for (let poll = 0; poll < MAX_POLLS; poll++) {
    await sleep(POLL_MS)
    const res = await fetch(`${BASE}/${opName}`, { headers: { 'x-goog-api-key': KEY } })
    if (!res.ok) { process.stdout.write('?'); continue }
    const op = await res.json()

    if (TEST_ONLY && poll === 0) {
      console.log(`\n[i2v TEST] first poll response for clip ${idx}:`)
      console.log(JSON.stringify(op, null, 2).slice(0, 600))
    }

    if (op.done) {
      if (op.error) throw new Error(`op error: ${JSON.stringify(op.error).slice(0, 200)}`)
      const uri = op.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri
        || op.response?.generatedVideos?.[0]?.video?.uri
      if (!uri) {
        console.error(`\n[i2v] done but no URI — full response:\n${JSON.stringify(op.response).slice(0, 400)}`)
        throw new Error('no video URI in I2V response (check field names above)')
      }
      return uri
    }
    process.stdout.write(`[${idx}]`)
  }
  throw new Error(`clip ${idx}: poll timeout (8 min)`)
}

// ── Download video (URLs expire ~48h) ───────────────────────────────────────
async function downloadClip(uri, dest) {
  const res = await fetch(uri, { headers: { 'x-goog-api-key': KEY }, redirect: 'follow' })
  if (!res.ok) throw new Error(`download HTTP ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  writeFileSync(dest, buf)
  return buf.length
}

// ── Main: parallel submit → parallel poll ───────────────────────────────────
const allIndices = imagePrompts.map((_, i) => i)
const toProcess = TEST_ONLY
  ? [0]
  : allIndices.filter(i => {
    if (i < FROM_IDX) return false
    const dest = `${OUT}/i2v_${String(i).padStart(2, '0')}.mp4`
    if (existsSync(dest) && statSync(dest).size > 100_000) {
      console.log(`[i2v] = i2v_${String(i).padStart(2,'0')}.mp4 exists — skip`)
      return false
    }
    return true
  })

if (!toProcess.length) {
  console.log('[i2v] all clips already exist — nothing to do')
  console.log('[i2v] next: node render_assets.mjs && node assemble_reel.mjs')
  process.exit(0)
}

console.log(`[i2v] ${TEST_ONLY ? 'TEST — processing index 0 only' : `${toProcess.length} clips`} → ${OUT}/`)

// singleImage pre-pass: generate portrait 0 once, copy to all other indices
// This guarantees IDENTICAL face input for all clips — only motionPrompts differ.
if (SINGLE_IMAGE && !TEST_ONLY && toProcess.length > 0) {
  const baseIdx = toProcess[0]
  console.log(`[i2v] singleImage: generating base portrait (index ${baseIdx})...`)
  const basePath = await getPortraitImage(baseIdx)
  for (const i of toProcess.slice(1)) {
    const dst = `vz_portrait_${i}.jpg`
    if (FRESH_IMAGES || !existsSync(dst) || statSync(dst).size < 5_000) {
      writeFileSync(dst, readFileSync(basePath))
      console.log(`[i2v] singleImage: portrait ${i} ← portrait ${baseIdx}`)
    }
  }
}

// Phase 1: prep images + submit all ops (sequential, each submit is fast ~1s)
const ops = []
for (const i of toProcess) {
  try {
    // In singleImage mode: portrait already prepared in pre-pass; getPortraitImage will just read the file
    console.log(`[i2v] prepping image ${i}...`)
    const imgPath = await getPortraitImage(i)
    const motion = motionHints[i] || motionHints[i % motionHints.length]
    console.log(`[i2v] submit ${i}: ${motion.slice(0, 55)}...`)
    const opName = await submitI2V(imgPath, motion)
    console.log(`  op: ${opName.slice(-30)}`)
    ops.push({ i, opName })
    if (toProcess.indexOf(i) < toProcess.length - 1) await sleep(500) // brief pause between submits
  } catch (e) {
    console.error(`[i2v] submit ${i} failed: ${e.message}`)
    if (TEST_ONLY) process.exit(1)
  }
}

if (!ops.length) { console.error('[i2v] no ops submitted'); process.exit(1) }
console.log(`\n[i2v] ${ops.length} ops submitted — polling ALL in parallel (server renders simultaneously)`)
console.log('[i2v] progress: [N] = clip N still rendering')

// Phase 2: poll ALL ops simultaneously (each runs independently on Google's servers)
const results = await Promise.allSettled(ops.map(async ({ i, opName }) => {
  const dest = `${OUT}/i2v_${String(i).padStart(2, '0')}.mp4`
  const uri = await pollOp(opName, i)
  console.log(`\n[i2v] clip ${i} done — downloading...`)

  if (TEST_ONLY) {
    console.log(`[i2v TEST] video URI: ${uri.slice(0, 120)}`)
    console.log('[i2v TEST] ✓ I2V API accepted image field — run WITHOUT --test to generate all clips')
    return { i, test: true }
  }

  const bytes = await downloadClip(uri, dest)
  console.log(`[i2v] ✓ i2v_${String(i).padStart(2,'0')}.mp4 (${(bytes/1e6).toFixed(1)} MB)`)
  return { i, dest, bytes }
}))

const ok = results.filter(r => r.status === 'fulfilled' && !r.value?.test).length
const fail = results.filter(r => r.status === 'rejected').length
results.filter(r => r.status === 'rejected').forEach(r => console.error('[i2v]', r.reason?.message || r.reason))

if (!TEST_ONLY) {
  console.log(`\n[i2v] done: ${ok} clips ready, ${fail} failed`)
  const missingIdx = allIndices.find(i => !existsSync(`${OUT}/i2v_${String(i).padStart(2,'0')}.mp4`))
  if (fail > 0 && missingIdx !== undefined) {
    console.log(`[i2v] resume from failure: node gen_veo_i2v.mjs --from=${missingIdx}`)
  }
  if (ok + (allIndices.length - toProcess.length - allIndices.filter(i => i < FROM_IDX).length) >= imagePrompts.length) {
    console.log('[i2v] all clips ready — next: node render_assets.mjs && node assemble_reel.mjs')
    console.log('[i2v] or single command: node make-sport.mjs --skip-veo')
  }
}
