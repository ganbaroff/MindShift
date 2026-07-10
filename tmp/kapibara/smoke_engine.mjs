import './credit_gate_auto.mjs'
// smoke_engine.mjs — storyboard-engine smoke test (proof of architecture, 2026-07-04)
// Proves the research-backed pipeline on OUR key:
//   (1) Nano Banana Pro holds ONE character across scene stills via reference images
//   (2) Veo 3.1 Fast animates still A -> still B with first+last frame interpolation
// Cost: ~4 images (~$0.5) + one 8s Veo Fast 720p clip (~$0.80). Failed gens are NOT billed
// (official pricing page: "you will only be charged if your video is successfully generated").
// Run: node smoke_engine.mjs            (full)
//      node smoke_engine.mjs --images   (stills only, skip Veo)

import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { requireEnv } from './env.mjs'

const KEY = requireEnv('GEMINI_API_KEY')
const BASE = 'https://generativelanguage.googleapis.com/v1beta'
const IMG_MODEL = 'gemini-3-pro-image-preview'          // confirmed via models.list
const VEO_MODEL = 'veo-3.1-fast-generate-preview'       // confirmed via models.list; Fast has first+last per docs
const OUT = 'smoke_engine'
const IMAGES_ONLY = process.argv.includes('--images')
mkdirSync(OUT, { recursive: true })

// One character, described ONCE with distinctive anchors (per research: distinctive features
// + same wardrobe restated every prompt = the consistency levers)
const CHAR = 'Pixar-style animated boy, 8 years old, Portuguese, short curly dark-brown hair, big hazel eyes, round face with freckles on the nose, light-blue t-shirt with a single white star on the chest, beige shorts, barefoot'

const sleep = ms => new Promise(r => setTimeout(r, ms))
const refPart = f => ({ inlineData: { mimeType: 'image/png', data: readFileSync(f).toString('base64') } })

async function genImage(parts, dest) {
  if (existsSync(dest) && statSync(dest).size > 10_000) { console.log(`[img] = ${dest} exists — skip`); return dest }
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${BASE}/models/${IMG_MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'x-goog-api-key': KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseModalities: ['IMAGE'] } }),
    })
    if (res.ok) {
      const j = await res.json()
      const p = j.candidates?.[0]?.content?.parts?.find(p => p.inlineData)
      if (p) { writeFileSync(dest, Buffer.from(p.inlineData.data, 'base64')); console.log(`[img] ✓ ${dest}`); return dest }
      console.error(`[img] no inlineData (attempt ${attempt}): ${JSON.stringify(j).slice(0, 200)}`)
    } else {
      console.error(`[img] HTTP ${res.status} (attempt ${attempt}): ${(await res.text()).slice(0, 200)}`)
    }
    await sleep(1500)
  }
  throw new Error(`image failed: ${dest}`)
}

// ── 1) Character sheet: canonical portrait + 3/4 view (re-fed output = Google's own documented workflow)
console.log('[smoke] STEP 1 — character sheet')
await genImage(
  [{ text: `Character reference sheet: ${CHAR}. Standing in a relaxed neutral pose, front view, full body visible, plain warm beige studio background, soft even light. Pixar animated film style, high detail. Vertical 9:16 composition.` }],
  `${OUT}/char_front.png`)
await genImage(
  [refPart(`${OUT}/char_front.png`),
   { text: `Same exact character as the reference image — same face, same freckles, same light-blue t-shirt with white star, same beige shorts, barefoot. Three-quarter view, gentle smile, plain warm beige studio background. Pixar animated film style. Vertical 9:16 composition.` }],
  `${OUT}/char_34.png`)

// ── 2) Two consecutive scene stills, BOTH with the character sheet as reference
console.log('[smoke] STEP 2 — scene stills (A = shot start, B = shot end / next shot start)')
const SCENE_BASE = 'narrow cobblestone alley of a Portuguese island village at golden hour, whitewashed houses with terracotta roofs, flower pots on windowsills, a glimpse of the deep-blue Atlantic ocean at the far end of the alley, warm low sunlight casting long shadows'
await genImage(
  [refPart(`${OUT}/char_front.png`), refPart(`${OUT}/char_34.png`),
   { text: `Using the provided reference images of the boy (SAME face, SAME light-blue t-shirt with white star, SAME beige shorts, barefoot): the boy stands still in a ${SCENE_BASE}, holding a worn leather soccer ball under his right arm, looking down the alley toward the ocean. Pixar animated film style. Vertical 9:16 composition. No text, no logos, no red clothing anywhere.` }],
  `${OUT}/scene_A.png`)
await genImage(
  [refPart(`${OUT}/char_front.png`), refPart(`${OUT}/char_34.png`), refPart(`${OUT}/scene_A.png`),
   { text: `Continue from the provided scene image: the SAME boy (SAME face, SAME light-blue t-shirt with white star, SAME beige shorts, barefoot) in the SAME ${SCENE_BASE}, but now he is mid-run further down the alley toward the ocean, dribbling the worn leather soccer ball at his feet, joyful expression, same golden-hour light from the same direction. Pixar animated film style. Vertical 9:16 composition. No text, no logos, no red clothing anywhere.` }],
  `${OUT}/scene_B.png`)

// crop stills to exact 720x1280 for Veo input
for (const n of ['scene_A', 'scene_B']) {
  execFileSync('ffmpeg', ['-y', '-i', `${OUT}/${n}.png`, '-vf', 'scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280', '-q:v', '2', `${OUT}/${n}.jpg`], { stdio: 'ignore' })
}
console.log('[smoke] stills ready: char_front / char_34 / scene_A / scene_B — EYEBALL THEM before trusting')

if (IMAGES_ONLY) { console.log('[smoke] --images mode: stopping before Veo'); process.exit(0) }

// ── 3) Veo 3.1 Fast: first frame = scene_A, last frame = scene_B, prompt restates ALL anchors
// (research: Veo inherits only the visual seed, never the previous prompt — restate wardrobe/light/motion)
console.log('[smoke] STEP 3 — Veo first+last frame interpolation (veo-3.1-fast)')
const veoPrompt = `Pixar animated film style. The boy in the light-blue t-shirt with a white star (same character throughout, same face, same clothes) starts standing in the cobblestone alley holding the worn soccer ball under his arm, then drops it and breaks into a joyful run down the alley toward the distant ocean, dribbling the ball at his feet. Camera smoothly tracks him from behind at constant height. Golden hour warm light stays identical throughout the shot. No text, no logos. Negative: no face distortion, no morphing, no wardrobe change, no inconsistent lighting, no new characters.`

async function submitVeo(body) {
  const res = await fetch(`${BASE}/models/${VEO_MODEL}:predictLongRunning`, {
    method: 'POST',
    headers: { 'x-goog-api-key': KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const txt = await res.text()
  return { status: res.status, txt }
}

const first = { bytesBase64Encoded: readFileSync(`${OUT}/scene_A.jpg`).toString('base64'), mimeType: 'image/jpeg' }
const last = { bytesBase64Encoded: readFileSync(`${OUT}/scene_B.jpg`).toString('base64'), mimeType: 'image/jpeg' }

// REST field placement for lastFrame is the one unverified detail (SDK: config.last_frame).
// Try shapes in order; failed submits are not billed.
const shapes = [
  { label: 'instances[0].lastFrame', body: { instances: [{ prompt: veoPrompt, image: first, lastFrame: last }], parameters: { aspectRatio: '9:16', durationSeconds: 8, resolution: '720p' } } },
  { label: 'parameters.lastFrame', body: { instances: [{ prompt: veoPrompt, image: first }], parameters: { lastFrame: last, aspectRatio: '9:16', durationSeconds: 8, resolution: '720p' } } },
  { label: 'instances[0].lastFrame, no resolution param', body: { instances: [{ prompt: veoPrompt, image: first, lastFrame: last }], parameters: { aspectRatio: '9:16', durationSeconds: 8 } } },
]

let opName = null
for (const s of shapes) {
  console.log(`[veo] trying shape: ${s.label}`)
  const r = await submitVeo(s.body)
  if (r.status === 200) { opName = JSON.parse(r.txt).name; console.log(`[veo] ✓ accepted (${s.label}) op: ${opName.slice(-28)}`); break }
  console.error(`[veo] ✗ HTTP ${r.status}: ${r.txt.slice(0, 220)}`)
}
if (!opName) { console.error('[veo] all shapes rejected — record the errors above, this IS the test result'); process.exit(1) }

for (let p = 0; p < 90; p++) {
  await sleep(8000)
  const res = await fetch(`${BASE}/${opName}`, { headers: { 'x-goog-api-key': KEY } })
  if (!res.ok) { process.stdout.write('?'); continue }
  const op = await res.json()
  if (op.done) {
    if (op.error) { console.error(`\n[veo] op error: ${JSON.stringify(op.error).slice(0, 300)}`); process.exit(1) }
    const uri = op.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri
      || op.response?.generatedVideos?.[0]?.video?.uri
    if (!uri) { console.error(`\n[veo] no URI: ${JSON.stringify(op.response).slice(0, 300)}`); process.exit(1) }
    const dl = await fetch(uri, { headers: { 'x-goog-api-key': KEY }, redirect: 'follow' })
    writeFileSync(`${OUT}/chain_test.mp4`, Buffer.from(await dl.arrayBuffer()))
    console.log(`\n[veo] ✓ ${OUT}/chain_test.mp4 downloaded`)
    // verification frames: does the character stay the same across the clip?
    for (const t of [0.2, 2, 4, 6, 7.8]) {
      execFileSync('ffmpeg', ['-y', '-ss', String(t), '-i', `${OUT}/chain_test.mp4`, '-frames:v', '1', `${OUT}/v_${String(t).replace('.', '_')}.jpg`], { stdio: 'ignore' })
    }
    console.log('[veo] verification frames extracted: smoke_engine/v_*.jpg — EYEBALL for identity drift')
    process.exit(0)
  }
  process.stdout.write('.')
}
console.error('\n[veo] poll timeout')
process.exit(1)
