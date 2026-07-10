import './credit_gate_auto.mjs'
// film_lib.mjs — shared primitives for the storyboard engine (make-film.mjs)
// Proven request shapes (smoke_engine.mjs, 2026-07-04):
//   gemini-3-pro-image-preview generateContent + inlineData refs → consistent character stills
//   veo-3.1-fast-generate-preview predictLongRunning + instances[0].{image,lastFrame} → interpolated shot
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { requireEnv } from './env.mjs'

const KEY = requireEnv('GEMINI_API_KEY')
const BASE = 'https://generativelanguage.googleapis.com/v1beta'
export const IMG_MODEL = process.env.FILM_IMG_MODEL || 'gemini-3-pro-image-preview'
export const VEO_MODEL = process.env.FILM_VEO_MODEL || 'veo-3.1-fast-generate-preview'
export const TTS_MODEL = 'gemini-2.5-flash-preview-tts'

export const sleep = ms => new Promise(r => setTimeout(r, ms))
export const exists = f => existsSync(f) && statSync(f).size > 10_000
export const refPart = f => ({ inlineData: { mimeType: f.endsWith('.jpg') ? 'image/jpeg' : 'image/png', data: readFileSync(f).toString('base64') } })
export const ffprobeDur = f => parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim())

// ── image generation (retries cover transient PROHIBITED_CONTENT flukes seen in smoke test)
export async function genImage(parts, dest, label = '') {
  if (exists(dest)) { console.log(`[img] = ${dest} exists — skip`); return dest }
  for (let a = 0; a < 4; a++) {
    const res = await fetch(`${BASE}/models/${IMG_MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'x-goog-api-key': KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseModalities: ['IMAGE'] } }),
    })
    if (res.ok) {
      const j = await res.json()
      const p = j.candidates?.[0]?.content?.parts?.find(p => p.inlineData)
      if (p) { writeFileSync(dest, Buffer.from(p.inlineData.data, 'base64')); console.log(`[img] ✓ ${dest} ${label}`); return dest }
      console.error(`[img] no image (try ${a}) ${label}: ${JSON.stringify(j).slice(0, 160)}`)
    } else {
      console.error(`[img] HTTP ${res.status} (try ${a}) ${label}: ${(await res.text()).slice(0, 160)}`)
    }
    await sleep(2000 + a * 2000)
  }
  throw new Error(`image failed: ${dest}`)
}

export function cropPortrait(src, dest) {
  execFileSync('ffmpeg', ['-y', '-i', src, '-vf', 'scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280', '-q:v', '2', dest], { stdio: 'ignore' })
  return dest
}

// ── Veo submit with real quota backoff (audit lesson: 800ms retries are useless against 429)
export async function submitVeo({ prompt, firstJpg, lastJpg = null }, label = '') {
  const inst = { prompt, image: { bytesBase64Encoded: readFileSync(firstJpg).toString('base64'), mimeType: 'image/jpeg' } }
  if (lastJpg) inst.lastFrame = { bytesBase64Encoded: readFileSync(lastJpg).toString('base64'), mimeType: 'image/jpeg' }
  const body = { instances: [inst], parameters: { aspectRatio: '9:16', durationSeconds: 8, resolution: '720p' } }
  for (let a = 0; a < 6; a++) {
    const res = await fetch(`${BASE}/models/${VEO_MODEL}:predictLongRunning`, {
      method: 'POST',
      headers: { 'x-goog-api-key': KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const txt = await res.text()
    if (res.ok) return JSON.parse(txt).name
    if (res.status === 429) { console.log(`[veo] 429 ${label} — backoff ${20 * (a + 1)}s`); await sleep(20_000 * (a + 1)); continue }
    throw new Error(`veo submit ${label} HTTP ${res.status}: ${txt.slice(0, 200)}`)
  }
  throw new Error(`veo submit ${label}: quota backoff exhausted`)
}

export async function pollVeo(opName, label = '', maxMin = 12) {
  for (let p = 0; p < (maxMin * 60) / 8; p++) {
    await sleep(8000)
    const res = await fetch(`${BASE}/${opName}`, { headers: { 'x-goog-api-key': KEY } })
    if (!res.ok) { process.stdout.write('?'); continue }
    const op = await res.json()
    if (op.done) {
      if (op.error) throw new Error(`veo op ${label}: ${JSON.stringify(op.error).slice(0, 200)}`)
      const uri = op.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri
        || op.response?.generatedVideos?.[0]?.video?.uri
      if (!uri) throw new Error(`veo op ${label}: no URI ${JSON.stringify(op.response).slice(0, 200)}`)
      return uri
    }
    process.stdout.write(`[${label}]`)
  }
  throw new Error(`veo op ${label}: poll timeout`)
}

export async function downloadVeo(uri, dest) {
  const res = await fetch(uri, { headers: { 'x-goog-api-key': KEY }, redirect: 'follow' })
  if (!res.ok) throw new Error(`veo download HTTP ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  writeFileSync(dest, buf)
  return buf.length
}

// ── TTS (proven pattern from gen_voice_football.mjs, PCM→WAV)
export async function ttsLine(text, directive, voice, outWav) {
  if (exists(outWav)) { console.log(`[tts] = ${outWav} exists — skip`); return outWav }
  for (let a = 0; a < 3; a++) {
    const res = await fetch(`${BASE}/models/${TTS_MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'x-goog-api-key': KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${directive} "${text}"` }] }],
        generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } },
      }),
    })
    if (res.ok) {
      const j = await res.json()
      const b64 = j.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data
      if (b64) {
        const pcm = Buffer.from(b64, 'base64')
        const sr = 24000, ch = 1, bps = 16, ba = ch * bps / 8, br = sr * ba
        const h = Buffer.alloc(44)
        h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8)
        h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(ch, 22)
        h.writeUInt32LE(sr, 24); h.writeUInt32LE(br, 28); h.writeUInt16LE(ba, 32); h.writeUInt16LE(bps, 34)
        h.write('data', 36); h.writeUInt32LE(pcm.length, 40)
        writeFileSync(outWav, Buffer.concat([h, pcm]))
        console.log(`[tts] ✓ ${outWav} (${(pcm.length / br).toFixed(2)}s)`)
        return outWav
      }
    } else {
      console.error(`[tts] HTTP ${res.status} (try ${a}): ${(await res.text()).slice(0, 160)}`)
    }
    await sleep(1500)
  }
  throw new Error(`tts failed: ${outWav}`)
}
