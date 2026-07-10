import './credit_gate_auto.mjs'
// content_critic.mjs — automated multimodal QA: a SECOND model (Gemini 3 Pro) WATCHES the video
// and HEARS the audio, scores it against a strict rubric, and returns feedback BEFORE handoff to CEO.
// Usage: node content_critic.mjs <video.mp4>
import { readFileSync, statSync } from 'node:fs'
import { requireEnv } from './env.mjs'
const key = requireEnv('GEMINI_API_KEY')
const MODEL = process.env.CRITIC_MODEL || 'gemini-3.5-flash'
// No default clip: a wiring miss must fail LOUD, not silently judge (and pay Gemini quota for) a
// stale file — review panel wf_4f13ffa5 caught the old ep01 fallback doing exactly that.
const file = process.argv[2]
if (!file) { console.error('usage: node content_critic.mjs <video.mp4>'); process.exit(1) }
const bytes = readFileSync(file)
const size = statSync(file).size
const base = 'https://generativelanguage.googleapis.com'

// 1) resumable upload — start
const startRes = await fetch(`${base}/upload/v1beta/files`, {
  method: 'POST',
  headers: {
    'x-goog-api-key': key,
    'X-Goog-Upload-Protocol': 'resumable', 'X-Goog-Upload-Command': 'start',
    'X-Goog-Upload-Header-Content-Length': String(size),
    'X-Goog-Upload-Header-Content-Type': 'video/mp4',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ file: { display_name: 'ladder-critic' } }),
})
const uploadUrl = startRes.headers.get('x-goog-upload-url')
if (!uploadUrl) { console.error('no upload url', startRes.status, (await startRes.text()).slice(0, 200)); process.exit(1) }

// 2) upload bytes + finalize
const upRes = await fetch(uploadUrl, {
  method: 'POST',
  headers: { 'Content-Length': String(size), 'X-Goog-Upload-Offset': '0', 'X-Goog-Upload-Command': 'upload, finalize' },
  body: bytes,
})
let fileInfo = (await upRes.json()).file
console.log(`uploaded ${file} (${(size / 1024).toFixed(0)}KB) -> ${fileInfo.name} state=${fileInfo.state}`)

// 3) poll ACTIVE
for (let i = 0; i < 20 && fileInfo.state !== 'ACTIVE'; i++) {
  await new Promise(r => setTimeout(r, 2000))
  const g = await fetch(`${base}/v1beta/files/${fileInfo.name.split('/').pop()}`, { headers: { 'x-goog-api-key': key } })
  fileInfo = await g.json()
}
if (fileInfo.state !== 'ACTIVE') { console.error('file not ACTIVE:', fileInfo.state); process.exit(1) }

// 4) critique against rubric (structured JSON)
// Format-aware: quiz videos get the reveal dimension; news videos get transitions instead.
// (A quiz-biased rubric scored news 3/5 for "no answer reveal" — an inapplicable dimension.)
const FORMAT = process.env.CRITIC_FORMAT || (/ladder|quiz/i.test(file) ? 'quiz' : 'news')
const today = new Date().toISOString().slice(0, 10)
const revealDim = FORMAT === 'quiz'
  ? `- reveal_clarity: at the answer reveal, is the correct option unmistakable and are wrong options clearly de-emphasized? Any moment a WRONG option looks selected?`
  : `- transitions_clarity: are transitions between news items clear and visually distinct (card change, graphics)? Is the key fact of each item visually highlighted?`
const rubric = `You are a BRUTAL, specific short-form video QA critic for a solo founder's AI-education channel (audience: curious teens/adults, ADHD-aware brand). This is a ${FORMAT === 'quiz' ? 'QUIZ' : 'NEWS-DIGEST'} format video. IMPORTANT CONTEXT: today's REAL date is ${today} — dates in/around this year in the video are CURRENT news, not fiction; do NOT flag them as misleading. PRODUCT DESIGN CONTEXT: a RUSSIAN voiceover with AZERBAIJANI subtitles is the INTENDED bilingual format for the Azerbaijani market (viewers hear RU, read AZ; the post caption advertises this) — the language PAIR is never a defect; judge only whether each layer is legible and correctly rendered. The OUTRO is an intentional two-character duet sign-off: the capybara hands off to the FOUNDER'S AVATAR (a visibly different on-screen character) who speaks in his own deeper voice — this character voice change is BY DESIGN, not a defect; judge only whether each voice is clear. WATCH this vertical video AND LISTEN to the audio. Do not be polite, but be EVIDENCE-BASED: judge only what is actually visible/audible.
EVIDENCE RULE (hard): for ANY score of 1 or 2 you MUST include "at":"mm:ss" — the timestamp where the defect is clearly visible. No timestamp = you may not score below 3. For overlap claims specifically: only report overlap if TEXT PIXELS actually intersect another element; a dark subtitle panel sitting ABOVE the ticker with a visible gap is NOT overlap.
Score each dimension 1-5 (1=broken, 5=ship-grade) with ONE concrete fix:
- voice_quality: tone, energy, pacing, naturalness. Judge against a DAILY AUTOMATED show bar (clear, lively, not grating), not a Hollywood VO bar.
- animation_motion: is there real motion (mascot breathing/nods, background life, card transitions), or static held frames? Rate visual life.
${revealDim}
- mascot_quality: does the capybara host look like a polished designed character (shading, details), or a crude placeholder?
- readability: is all text legible, well-spaced, non-overlapping (apply the evidence rule)?
- palette_safety: any IRRITATING red (large/aggressive/alarm-like)? Tiny incidental red specks are fine.
- misleading_content: anything factually wrong or confusing on screen?
Return ONLY JSON: {"dimensions":[{"name":"","score":0,"issue":"","fix":"","at":""}],"top_fix":"","one_line_verdict":""}`

const genRes = await fetch(`${base}/v1beta/models/${MODEL}:generateContent`, {
  method: 'POST',
  headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contents: [{ parts: [{ fileData: { mimeType: 'video/mp4', fileUri: fileInfo.uri } }, { text: rubric }] }],
    generationConfig: { responseMimeType: 'application/json', temperature: 0 },
  }),
})
const gj = await genRes.json()
const txt = gj.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || ''
if (!txt) { console.error('no critique:', JSON.stringify(gj).slice(0, 400)); process.exit(1) }
console.log(`\n=== CRITIC VERDICT (${MODEL}, independent, format=${FORMAT}) ===`)
let shipReady = false
try {
  const c = JSON.parse(txt)
  // Law 10 threshold is computed by CODE, not the model's mood (its own ship_ready oscillated
  // run-to-run on identical quality). Bar: no dimension ≤2 (evidence rule applies) AND mean ≥3.5.
  const dims = c.dimensions || []
  for (const d of dims) console.log(`  [${d.score}/5] ${d.name}: ${d.issue}${d.at ? ` (at ${d.at})` : ''}\n         fix: ${d.fix}`)
  const low = dims.filter(d => d.score <= 2)
  const lowValid = low.filter(d => d.at && /\d/.test(d.at)) // ≤2 without timestamp evidence doesn't block
  const mean = dims.length ? dims.reduce((a, d) => a + d.score, 0) / dims.length : 0
  shipReady = lowValid.length === 0 && mean >= 3.5
  console.log(`\n  MEAN: ${mean.toFixed(2)}  LOW(≤2 w/evidence): ${lowValid.length}${low.length > lowValid.length ? ` (+${low.length - lowValid.length} unevidenced ≤2 ignored)` : ''}`)
  console.log(`  SHIP_READY: ${shipReady} (bar: no evidenced ≤2 AND mean ≥3.5)`)
  console.log(`  TOP FIX: ${c.top_fix}`)
  console.log(`  VERDICT: ${c.one_line_verdict}`)
} catch {
  console.log(txt.slice(0, 1500))
  console.error('  (could not parse critic JSON → fail-closed, exit 1)')
}
// Law 10: this IS the gate. Non-zero exit blocks publish / handoff on ship_ready:false.
// Fail-closed: unparseable verdict also blocks. Bypass for review-only: CRITIC_NONBLOCKING=1.
if (process.env.CRITIC_NONBLOCKING === '1') process.exit(0)
process.exit(shipReady ? 0 : 1)
