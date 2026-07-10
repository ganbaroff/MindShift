import './credit_gate_auto.mjs'
// gen_vzimg.mjs — generic football imagery for the нарезка top zone.
// Gemini image gen (gemini-3-pro-image-preview) on the existing GEMINI_API_KEY.
// SAFE BY DESIGN: prompts forbid real faces / logos / numbers / text → no broadcast
// footage, no likeness, the un-bannable moat. Best-effort: any failure logs + continues,
// the scene falls back to its CSS gradient (clip still renders).
// Output: vz_0.jpg … vz_N.jpg, pre-cropped to 1080x880 (the #vzone box) via ffmpeg.
import { readFileSync, writeFileSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { requireEnv } from './env.mjs'
const key = requireEnv('GEMINI_API_KEY')
const MODEL = 'gemini-3-pro-image-preview'

const cfg = JSON.parse(readFileSync('football_today.json', 'utf8'))
const prompts = Array.isArray(cfg.imagePrompts) ? cfg.imagePrompts : []
if (!prompts.length) { console.warn('[gen_vzimg] no imagePrompts — scene will use gradient fallback'); process.exit(0) }

// Optional: regenerate only specific indices, e.g. `node gen_vzimg.mjs 3` or `node gen_vzimg.mjs 1,3`.
// No arg = regenerate all. Lets you re-roll one weak image without re-rolling the good ones.
const onlyArg = process.argv[2]
const onlyIdx = (onlyArg && /^\d+(,\d+)*$/.test(onlyArg)) ? new Set(onlyArg.split(',').map(Number)) : null
if (onlyIdx) console.log(`[gen_vzimg] regenerating only index(es): ${[...onlyIdx].join(',')}`)

async function genOne(prompt, modalities) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: modalities } }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 180)}`)
  const j = await res.json()
  const part = j.candidates?.[0]?.content?.parts?.find(p => p.inlineData)
  if (!part) throw new Error('no inlineData in response')
  return Buffer.from(part.inlineData.data, 'base64')
}

let ok = 0
for (let i = 0; i < prompts.length; i++) {
  if (onlyIdx && !onlyIdx.has(i)) continue
  try {
    let buf
    try { buf = await genOne(prompts[i], ['IMAGE']) }
    catch (e) { console.warn(`  vz_${i}: IMAGE-only failed (${e.message}) → retry TEXT,IMAGE`); buf = await genOne(prompts[i], ['TEXT', 'IMAGE']) }
    const raw = `vz_${i}.raw`
    writeFileSync(raw, buf)
    // normalize + cover-crop to the zone box (1080x880) → consistent vz_i.jpg the HTML references
    execFileSync('ffmpeg', ['-y', '-i', raw, '-vf', 'scale=1080:880:force_original_aspect_ratio=increase,crop=1080:880', '-q:v', '3', `vz_${i}.jpg`], { stdio: 'ignore' })
    try { rmSync(raw) } catch {}
    console.log(`  ✓ vz_${i}.jpg`)
    ok++
  } catch (e) {
    console.warn(`  ✗ vz_${i} failed: ${e.message} — gradient fallback for this segment`)
  }
}
console.log(`[gen_vzimg] ${ok}/${prompts.length} images generated`)
