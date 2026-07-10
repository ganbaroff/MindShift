// critic_agency.mjs — the RIGHT gate for the B2B web-agency showreel (NOT the capybara-news rubric).
// A second model watches+hears the ad and scores it on what THIS format needs: is every shot ALIVE
// (the exact thing CEO rejected), are the examples genuinely varied, premium, readable, is the AZ
// voice natural. Same code-computed bar as Factory Law 10: no evidenced ≤2 AND mean ≥3.5 → exit 0.
// Usage: node critic_agency.mjs agency_v6.mp4
import { readFileSync, statSync, writeFileSync } from 'node:fs'
import { requireEnv } from './env.mjs'
import { geminiGenerate } from './credit_gate.mjs'
const key = requireEnv('GEMINI_API_KEY')
const MODEL = process.env.CRITIC_MODEL || 'gemini-3.5-flash'
const file = process.argv[2] || 'agency_v6.mp4'
const bytes = readFileSync(file)
const size = statSync(file).size
const base = 'https://generativelanguage.googleapis.com'

const startRes = await fetch(`${base}/upload/v1beta/files`, {
  method: 'POST',
  headers: {
    'x-goog-api-key': key,
    'X-Goog-Upload-Protocol': 'resumable', 'X-Goog-Upload-Command': 'start',
    'X-Goog-Upload-Header-Content-Length': String(size),
    'X-Goog-Upload-Header-Content-Type': 'video/mp4',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ file: { display_name: 'agency-critic' } }),
})
const uploadUrl = startRes.headers.get('x-goog-upload-url')
if (!uploadUrl) { console.error('no upload url', startRes.status, (await startRes.text()).slice(0, 200)); process.exit(1) }
const upRes = await fetch(uploadUrl, {
  method: 'POST',
  headers: { 'Content-Length': String(size), 'X-Goog-Upload-Offset': '0', 'X-Goog-Upload-Command': 'upload, finalize' },
  body: bytes,
})
let fileInfo = (await upRes.json()).file
console.log(`uploaded ${file} (${(size / 1024).toFixed(0)}KB) -> ${fileInfo.name} state=${fileInfo.state}`)
for (let i = 0; i < 20 && fileInfo.state !== 'ACTIVE'; i++) {
  await new Promise(r => setTimeout(r, 2000))
  const g = await fetch(`${base}/v1beta/files/${fileInfo.name.split('/').pop()}`, { headers: { 'x-goog-api-key': key } })
  fileInfo = await g.json()
}
if (fileInfo.state !== 'ACTIVE') { console.error('file not ACTIVE:', fileInfo.state); process.exit(1) }

const rubric = `You are a BRUTAL, specific short-form video QA critic reviewing a VERTICAL B2B PROMO AD for a web-development agency (it builds and updates websites; region Azerbaijan). The ad shows premium device mockups (laptops/phones) displaying different website designs, over an AZERBAIJANI voiceover with on-screen AZERBAIJANI subtitles. There is NO mascot and NO cartoon character in this format — do NOT expect or ask for one. The bilingual/mascot conventions of other channels DO NOT apply here.
WATCH the video AND LISTEN to the audio. Be harsh but EVIDENCE-BASED: judge only what is actually visible/audible.
EVIDENCE RULE (hard): for ANY score of 1 or 2 you MUST include "at":"mm:ss" — the exact timestamp of the defect. No timestamp = you may not score below 3.
Score each dimension 1-5 (1=broken, 5=ship-grade) with ONE concrete fix. BREVITY IS MANDATORY: "issue" and "fix" each ≤12 words (the response gets hard-truncated otherwise and the whole verdict is discarded):
- motion_aliveness: THE KEY TEST. Does EVERY shot genuinely move — device floating, camera pushing in, parallax, screen light shifting — so it reads as living video? If ANY shot is a static/frozen image or just a slow flat zoom on a still photo (Ken-Burns), that is a FAIL for that shot: score ≤2 and cite its timestamp. A slow zoom on a flat picture is NOT alive.
- example_variety: are there MANY genuinely DIFFERENT website designs shown (distinct layouts/industries/colors), or is it the same few frames repeated/re-zoomed? Fake variety (same asset shown again) = low score with timestamp.
- premium_feel: does it look like a high-end studio-grade agency reel (clean, cinematic, confident), or cheap/amateur?
- pacing_energy: is the cut rhythm dynamic and engaging for a fast ADHD-aware feed (no dead/held moments), well synced to the voice?
- readability: is all on-screen text legible, well-spaced, non-overlapping? (apply the evidence rule for overlap)
- palette_safety: any IRRITATING red (large/aggressive/alarm-like)? Tiny incidental red specks are fine.
- voice_naturalness: does the Azerbaijani voiceover sound natural and human (good rhythm, stress, warmth), or robotic/wooden/monotone/mispaced? Judge naturalness specifically.
Return ONLY JSON: {"dimensions":[{"name":"","score":0,"issue":"","fix":"","at":""}],"top_fix":"","one_line_verdict":""}`

const { res: genRes, tier, count } = await geminiGenerate({
  model: MODEL, apiKey: key, kind: 'video',
  body: {
    contents: [{ parts: [{ fileData: { mimeType: 'video/mp4', fileUri: fileInfo.uri } }, { text: rubric }] }],
    generationConfig: { responseMimeType: 'application/json', temperature: 0, maxOutputTokens: 8192 },
  },
})
console.log(`[credit_gate] routed via ${tier} · gemini call #${count} today (metered)`)
const gj = await genRes.json()
const txt = gj.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || ''
if (!txt) { console.error('no critique:', JSON.stringify(gj).slice(0, 400)); process.exit(1) }
console.log(`\n=== AGENCY CRITIC VERDICT (${MODEL}, independent) ===`)
let shipReady = false
try {
  const clean = txt.replace(/```json/gi, '').replace(/```/g, '').trim()
  const s = clean.indexOf('{'), e = clean.lastIndexOf('}')
  const c = JSON.parse(s >= 0 && e > s ? clean.slice(s, e + 1) : clean)
  const dims = c.dimensions || []
  for (const d of dims) console.log(`  [${d.score}/5] ${d.name}: ${d.issue}${d.at ? ` (at ${d.at})` : ''}\n         fix: ${d.fix}`)
  const low = dims.filter(d => d.score <= 2)
  const lowValid = low.filter(d => d.at && /\d/.test(d.at))
  const mean = dims.length ? dims.reduce((a, d) => a + d.score, 0) / dims.length : 0
  shipReady = lowValid.length === 0 && mean >= 3.5
  console.log(`\n  MEAN: ${mean.toFixed(2)}  LOW(≤2 w/evidence): ${lowValid.length}${low.length > lowValid.length ? ` (+${low.length - lowValid.length} unevidenced ≤2 ignored)` : ''}`)
  console.log(`  SHIP_READY: ${shipReady} (bar: no evidenced ≤2 AND mean ≥3.5)`)
  console.log(`  TOP FIX: ${c.top_fix}`)
  console.log(`  VERDICT: ${c.one_line_verdict}`)
  if (process.env.CRITIC_VERDICT_FILE) {
    try { writeFileSync(process.env.CRITIC_VERDICT_FILE, JSON.stringify(c)) } catch (err) { console.error('failed to write verdict file:', err.message) }
  }
} catch {
  console.log(txt.slice(0, 1500))
  console.error('  (could not parse critic JSON → fail-closed, exit 1)')
}
if (process.env.CRITIC_NONBLOCKING === '1') process.exit(0)
process.exit(shipReady ? 0 : 1)
