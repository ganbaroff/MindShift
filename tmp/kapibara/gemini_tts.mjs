import './credit_gate_auto.mjs'
// gemini_tts.mjs — Gemini TTS with CREDITS-FIRST fallback (Constitution Art.4 / Factory Law: credits before cash).
//
// Why this exists: a past instance wired all TTS straight to the FREE AI Studio key
// (generativelanguage.googleapis.com + GEMINI_API_KEY), which has a hard Tier-1 cap of
// 100 requests/day on gemini-2.5-flash-preview-tts. When that cap hits, the whole line stalls.
// Proven 2026-07-07: the SAME model + SAME LOCKED_VOICE (Algieba) is served by Vertex AI
// (us-central1), which bills the GCP billing account — i.e. draws the project's CREDITS, not the
// card — and has far higher quota. So: free first, on 429/quota → Vertex on credits, real money never.
//
// Both paths return identical 24kHz signed-16-bit PCM, so the voice never changes (Factory Law 6).
//
// Usage:
//   import { synthPcm } from './gemini_tts.mjs'
//   const { pcm, via } = await synthPcm(text, VOICE, STYLE)   // pcm = raw 24kHz s16le Buffer
//
// Self-test (real Vertex call, proves the credit path from Node):
//   node gemini_tts.mjs --selftest          # forces the Vertex/credits path
//   node gemini_tts.mjs --selftest --free   # tries free first (falls to Vertex on 429)

import { execFileSync } from 'node:child_process'
import { getEnv, LOCKED_VOICE } from './env.mjs'

const MODEL = 'gemini-2.5-flash-preview-tts'
const AISTUDIO_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`
const VERTEX_PROJECT = getEnv('GCP_PROJECT') || getEnv('VERTEX_PROJECT') || 'gen-lang-client-0321449510'
const VERTEX_LOC = getEnv('VERTEX_LOCATION') || 'us-central1'
const VERTEX_URL = `https://${VERTEX_LOC}-aiplatform.googleapis.com/v1/projects/${VERTEX_PROJECT}/locations/${VERTEX_LOC}/publishers/google/models/${MODEL}:generateContent`

// Vertex REQUIRES an explicit role on each content (AI Studio does not). Body is otherwise identical.
function reqBody(text, voice, style) {
  return {
    contents: [{ role: 'user', parts: [{ text: style ? `${style} "${text}"` : text }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
    },
  }
}

function extractPcm(json) {
  const b64 = json?.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data
  return b64 ? Buffer.from(b64, 'base64') : null
}

// Vertex auth = a short-lived gcloud access token (never a static secret on disk). Fetched once per run.
let _vertexToken = null
function vertexToken() {
  if (_vertexToken) return _vertexToken
  const win = process.platform === 'win32'
  const bin = win ? 'gcloud.cmd' : 'gcloud'
  // Node 20+ refuses to spawn .cmd without shell:true (CVE-2024-27980). Args are static — no injection.
  _vertexToken = execFileSync(bin, ['auth', 'print-access-token'], { encoding: 'utf8', shell: win }).trim()
  if (!_vertexToken) throw new Error('gcloud returned no access token — run `gcloud auth login`')
  return _vertexToken
}

async function callVertex(text, voice, style) {
  const r = await fetch(VERTEX_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${vertexToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(reqBody(text, voice, style)),
  })
  if (!r.ok) throw new Error(`vertex TTS HTTP ${r.status}: ${(await r.text()).slice(0, 180)}`)
  const pcm = extractPcm(await r.json())
  if (!pcm) throw new Error('vertex TTS returned 200 but no audio payload')
  return pcm
}

/**
 * Synthesize ONE line to raw 24kHz s16le PCM. Free AI Studio first; on 429/quota (or empty), Vertex on credits.
 * @returns {Promise<{pcm: Buffer, via: 'aistudio-free'|'vertex-credits'}>}
 */
export async function synthPcm(text, voice = LOCKED_VOICE, style = '', { forceVertex = false } = {}) {
  if (!forceVertex) {
    const key = getEnv('GEMINI_API_KEY')
    if (key) {
      try {
        const r = await fetch(AISTUDIO_URL, {
          method: 'POST',
          headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
          body: JSON.stringify(reqBody(text, voice, style)),
        })
        if (r.ok) {
          const pcm = extractPcm(await r.json())
          if (pcm) return { pcm, via: 'aistudio-free' }
          // 200 but empty → fall through to Vertex
        } else if (r.status === 429) {
          console.error('[tts] AI Studio 429 (daily quota) → falling back to Vertex on credits')
        } else {
          console.error(`[tts] AI Studio HTTP ${r.status} → trying Vertex`)
        }
      } catch (e) {
        console.error(`[tts] AI Studio call threw (${e.message.slice(0, 80)}) → trying Vertex`)
      }
    }
  }
  const pcm = await callVertex(text, voice, style)
  return { pcm, via: 'vertex-credits' }
}

// Write a minimal 24kHz mono s16le WAV from a PCM buffer (helper for callers that want a .wav file).
export function pcmToWav(pcm) {
  const sr = 24000, ch = 1, bps = 16, ba = ch * bps / 8, br = sr * ba
  const h = Buffer.alloc(44)
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8)
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(ch, 22)
  h.writeUInt32LE(sr, 24); h.writeUInt32LE(br, 28); h.writeUInt16LE(ba, 32); h.writeUInt16LE(bps, 34)
  h.write('data', 36); h.writeUInt32LE(pcm.length, 40)
  return Buffer.concat([h, pcm])
}

// ── self-test ──
if (process.argv.includes('--selftest')) {
  const forceVertex = !process.argv.includes('--free')
  const { pcm, via } = await synthPcm(
    'This is a Vertex credits fallback self test, spoken in the locked voice.',
    LOCKED_VOICE,
    'Read cheerfully:',
    { forceVertex },
  )
  console.log(`[selftest] voice=${LOCKED_VOICE} via=${via} pcm=${pcm.length} bytes (${(pcm.length / (24000 * 2)).toFixed(2)}s)`)
  if (pcm.length < 10000) { console.error('[selftest] FAIL: audio suspiciously small'); process.exit(1) }
  console.log('[selftest] PASS — credit-fallback TTS returns real audio')
}
