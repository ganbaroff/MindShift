import './credit_gate_auto.mjs'
// frame_check.mjs — PER-FRAME visual QA module (the "next module checks the previous, sends back for rework").
// A generation stage produces a still/shot-frame; THIS module inspects it for artifacts BEFORE it advances.
// Catches exactly the reputation bugs: stray smoke/objects from the body, extra limbs, wrong props,
// left/right orientation errors (door handle side), wrong character, RED. Exit 1 = REWORK (blocks the line).
// Usage: node frame_check.mjs <image.jpg> [more.jpg ...]
import { readFileSync } from 'node:fs'
import { requireEnv } from './env.mjs'
const key = requireEnv('GEMINI_API_KEY')
const MODEL = process.env.CHECK_MODEL || 'gemini-3.5-flash'
const files = process.argv.slice(2)
if (!files.length) { console.error('usage: node frame_check.mjs <image.jpg> [...]'); process.exit(2) }

// Gate ONLY on HIGH-severity, screenshot-worthy defects (reputation-killers). Cosmetic AI texture is
// advisory, not gating — this keeps the gate STABLE run-to-run (a flaky gate re-introduces the variance
// we exist to remove). temperature:0 + a computed threshold (we ignore the model's own verdict wobble).
const RUBRIC = `You are a per-frame QA inspector for a founder's video brand. Look at THIS single frame and list ONLY clear, obvious defects a casual viewer would instantly notice and screenshot to mock us.
Severity rules — be strict, do NOT inflate:
- HIGH (reputation-killer, blocks the frame): body-horror anatomy (extra/missing/fused limbs, 6+ fingers, two heads, melted face); smoke/steam/fluid/objects emanating from a person's BODY or rear; a blatantly wrong focal prop (e.g. an American-football in a soccer scene); clearly WRONG character identity or an unwanted second person; IRRITATING/ALARMING RED — a large aggressive red fill, red used as an error/alarm signal, or an all-red garment/object dominating the frame (RSD trigger); a fully garbled/nonsense HEADLINE text or logo.
- MED/LOW (advisory, does NOT block): subtle AI skin/texture noise, minor warping of background nets/crowd, faint lens flare, small background-text imperfections, minor spacing/overlap, and SMALL INCIDENTAL RED (a tiny logo speck, a distant background pixel, a small accent) — a little red is fine, only irritating red blocks. These are normal output — note them but they do NOT block.
Only call something HIGH if you are confident a normal viewer would call it broken. When unsure, it is MED, not HIGH.
Return ONLY JSON: {"defects":[{"type":"","what":"","severity":"low|med|high"}],"one_line":""}.`

async function checkOne(f) {
  const b64 = readFileSync(f).toString('base64')
  const mime = f.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST', headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ inlineData: { mimeType: mime, data: b64 } }, { text: RUBRIC }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0 },
    }),
  })
  const j = await res.json()
  const txt = j.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || ''
  if (!txt) { console.error(`  ${f}: no verdict — ${JSON.stringify(j).slice(0, 200)}`); return false }
  try {
    const c = JSON.parse(txt)
    const defects = c.defects || []
    const highs = defects.filter(d => d.severity === 'high')
    const pass = highs.length === 0 // WE apply the threshold, not the model's fuzzy verdict
    console.log(`[${pass ? 'PASS ' : 'REWORK'}] ${f} — ${c.one_line || ''}`)
    for (const d of defects) console.log(`         (${d.severity}) ${d.type}: ${d.what}`)
    return pass
  } catch { console.log(`  ${f}: parse fail → rework (fail-closed). raw: ${txt.slice(0, 160)}`); return false }
}

let allPass = true
for (const f of files) { const ok = await checkOne(f); if (!ok) allPass = false }
console.log(`\nLINE GATE: ${allPass ? 'all frames PASS → advance' : 'REWORK required → frame(s) sent back, line stops'}`)
// machine-parseable verdict — reliable even if the process exit path is flaky
console.log(`FRAMECHECK_VERDICT=${allPass ? 'pass' : 'rework'}`)
// Set exitCode and let the loop drain naturally. Calling process.exit() with lingering keep-alive
// fetch sockets triggers a win libuv UV_HANDLE_CLOSING assertion (exit 127) — draining avoids it.
process.exitCode = allPass ? 0 : 1
