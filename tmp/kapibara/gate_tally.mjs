// gate_tally.mjs — the three-layer voting gate of Studio Conductor (P2; STUDIO-CONDUCTOR-SPEC.md).
// Layer 1 DETERMINISTIC VETO (0 tokens, reproducible, cannot be outvoted — Foundation Laws):
//   (a) never-red: sample frames via ffmpeg → PPM → per-pixel HSV; irritating red (hue 0-15/345-360,
//       saturated+bright) above RED_MAX_FRAC of pixels on any frame = veto. Law: tiny incidental red ok.
//   (b) shame/urgency phrase grep over subtitle/script text (--subs / --text).
//   (c) duration inside the recipe's duration_band_sec.
// Layer 2 CRITIC BAR: run the recipe's critic once; parse its printed dims; PASS iff no evidenced ≤2
//   AND mean ≥ 3.5 (verbatim critic_agency.mjs:75-77 bar). Verdicts are NEVER cached (Factory Law 10).
// Layer 3 ESCALATION: only if mean lands in the borderline band [3.3, 3.7] → 2 more independent
//   samples (3 total); a dimension blocks only if ≥2/3 samples give it an evidenced ≤2 (quorum);
//   final mean = average. Every ballot lands in studio_votes.jsonl (prototype of the studio_votes table).
// Infra faults (upload/API failure) exit 3 = PARK, never masquerade as REWORK (spec: fail-open-to-human).
// Usage: node gate_tally.mjs <clip.mp4> --recipe=recipes/agency.recipe.json [--subs=reel7.ass] [--skip-critic]
import { readFileSync, appendFileSync, mkdtempSync, rmSync, readdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'

const DIR = dirname(fileURLToPath(import.meta.url))
let clip = process.argv[2]
// pointer-file support: a recipe can't know a DATED artifact name statically, so it may point at a
// JSON whose {file} names the real clip (news: latest_output.json written by assemble).
if (clip && clip.endsWith('.json')) {
  try { clip = JSON.parse(readFileSync(join(DIR, clip), 'utf8')).file } catch (e) { console.error(`[tally] PARK — cannot resolve pointer ${clip}: ${e.message}`); process.exit(3) }
  if (!clip) { console.error('[tally] PARK — pointer file has no .file field'); process.exit(3) }
}
const arg = k => (process.argv.find(a => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=')
const recipePath = arg('recipe') || 'recipes/agency.recipe.json'
const subsPath = arg('subs')
const SKIP_CRITIC = process.argv.includes('--skip-critic')
if (!clip) { console.error('usage: node gate_tally.mjs <clip.mp4> --recipe=<recipe.json> [--subs=<.ass>] [--skip-critic]'); process.exit(1) }
const recipe = JSON.parse(readFileSync(join(DIR, recipePath), 'utf8'))
const VOTES = join(DIR, 'studio_votes.jsonl')
const ballot = (layer, verdict, detail) => appendFileSync(VOTES, JSON.stringify({ ts: new Date().toISOString(), clip, recipe: recipe.name, layer, verdict, ...detail }) + '\n')

// ── Layer 1a: never-red HSV histogram over sampled frames ──────────────────
const RED_MAX_FRAC = 0.02            // >2% irritating-red pixels on a frame = dominant, veto
const rgb2redness = (r, g, b) => {   // irritating red = hue in 0-15/345-360, sat>0.55, val>0.35
  const mx = Math.max(r, g, b) / 255, mn = Math.min(r, g, b) / 255
  if (mx < 0.35) return false
  const d = mx - mn; if (mx === 0 || d / mx < 0.55) return false
  if (Math.max(r, g, b) !== r) return false
  let h = ((g - b) / 255 / d) % 6; h = h * 60; if (h < 0) h += 360
  return h <= 15 || h >= 345
}
const tmp = mkdtempSync(join(tmpdir(), 'tally-'))
try {
  execFileSync('ffmpeg', ['-y', '-i', clip, '-vf', 'fps=1,scale=90:160', '-f', 'image2', '-c:v', 'ppm', join(tmp, 'f_%03d.ppm')], { stdio: 'ignore', cwd: DIR })
} catch (e) { console.error('[tally] PARK — frame extraction failed (infra):', e.message.slice(0, 120)); ballot('veto-red', 'park', { error: 'ffmpeg' }); process.exit(3) }
let worst = { frac: 0, frame: '' }, parsedFrames = 0
for (const f of readdirSync(tmp)) {
  const buf = readFileSync(join(tmp, f))
  // PPM P6: "P6\n<w> <h>\n<maxval>\n" + raw RGB (ffmpeg emits maxval 255; anything else is skipped
  // and counted — a zero-parsed run must PARK, never fail-open past a Foundation-Law gate)
  const hdr = buf.subarray(0, 64).toString('latin1')
  const m = hdr.match(/^P6\s+(\d+)\s+(\d+)\s+255\s/)
  if (!m) continue
  parsedFrames++
  const off = m[0].length, w = +m[1], h = +m[2]
  let red = 0, total = w * h
  for (let i = 0; i < total; i++) {
    const p = off + i * 3
    if (rgb2redness(buf[p], buf[p + 1], buf[p + 2])) red++
  }
  const frac = red / total
  if (frac > worst.frac) worst = { frac, frame: f }
}
rmSync(tmp, { recursive: true, force: true })
if (parsedFrames === 0) { console.error('[tally] PARK — 0 frames parsed for the red scan (cannot verify Foundation Law 1 = cannot pass)'); ballot('veto-red', 'park', { parsedFrames: 0 }); process.exit(3) }
if (worst.frac > RED_MAX_FRAC) {
  console.error(`[tally] VETO never-red — ${(worst.frac * 100).toFixed(1)}% irritating-red pixels at ${worst.frame} (max ${(RED_MAX_FRAC * 100)}%)`)
  ballot('veto-red', 'block', { frac: +worst.frac.toFixed(4), frame: worst.frame }); process.exit(1)
}
console.log(`[tally] veto-red PASS — worst frame ${(worst.frac * 100).toFixed(2)}% red (${worst.frame || 'n/a'})`)
ballot('veto-red', 'pass', { frac: +worst.frac.toFixed(4) })

// ── Layer 1b: shame/urgency grep (Foundation Law 3 + guardrail "no urgency") ──
const SHAME = [/you (have )?failed/i, /you haven'?t\b/i, /последний шанс/i, /вы (не смогли|провалили)/i, /don'?t miss/i, /last chance/i, /hurry/i, /running out/i, /uğursuz oldunuz/i, /son şans/i, /tələsin/i]
if (subsPath) {
  let txt
  try { txt = readFileSync(join(DIR, subsPath), 'utf8') } catch (e) { console.error(`[tally] PARK — subs unreadable (infra): ${e.message}`); ballot('veto-shame', 'park', {}); process.exit(3) }
  const hit = SHAME.find(re => re.test(txt))
  if (hit) { console.error(`[tally] VETO shame/urgency — matched ${hit} in ${subsPath}`); ballot('veto-shame', 'block', { match: String(hit) }); process.exit(1) }
  console.log('[tally] veto-shame PASS'); ballot('veto-shame', 'pass', {})
}

// ── Layer 1c: duration band from recipe ─────────────────────────────────────
const band = recipe.constants?.duration_band_sec
if (band) {
  let dur
  try { dur = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', clip], { cwd: DIR }).toString()) } catch (e) { console.error(`[tally] PARK — ffprobe failed (infra): ${e.message.slice(0, 120)}`); ballot('veto-duration', 'park', {}); process.exit(3) }
  if (dur < band[0] || dur > band[1]) { console.error(`[tally] VETO duration — ${dur.toFixed(1)}s outside [${band}]`); ballot('veto-duration', 'block', { dur }); process.exit(1) }
  console.log(`[tally] veto-duration PASS — ${dur.toFixed(1)}s in [${band}]`); ballot('veto-duration', 'pass', { dur })
}
if (SKIP_CRITIC) { console.log('[tally] --skip-critic: deterministic layers only → PASS'); process.exit(0) }

// ── Layer 2/3: critic bar + borderline escalation ───────────────────────────
// The raw critic comes from recipe DATA (critic_bar.critic_script) — NEVER from the critic station's
// producer: that producer is gate_tally itself when the gate is wired in, and resolving it there
// self-recurses (live catch 2026-07-10: ~90 nested spawns before the fix; anti-recursion guard below).
let criticScript = recipe.critic_bar?.critic_script || 'critic_agency.mjs'
if (/gate_tally/i.test(criticScript)) { console.error('[tally] refusing self-recursion: critic_script resolves to gate_tally — falling back to critic_agency.mjs'); criticScript = 'critic_agency.mjs' }
const BAND = recipe.critic_bar?.escalate_band || [3.3, 3.7]
function criticSampleOnce(n) {
  let out
  try { out = execFileSync('node', [criticScript, clip], { cwd: DIR, env: { ...process.env, CRITIC_NONBLOCKING: '1' } }).toString() }
  catch (e) { return { park: true, error: (e.stdout || e.message || '').toString().slice(0, 200) } }
  // evidence extraction must be NO STRICTER than the critic's own rule (any digit in "at") —
  // a lazy-dot optional group missed "(at ...)" suffixes and range timestamps (panel finding #5).
  const dims = [...out.matchAll(/\[(\d)\/5\] (\w+):(.*)\n/g)].map(m => {
    const at = (m[3].match(/\(at ([^)]+)\)\s*$/) || [])[1] || ''
    return { score: +m[1], name: m[2], at }
  })
  const mean = +(out.match(/MEAN: ([\d.]+)/)?.[1] || 0)
  return { out, dims, mean }
}
function criticSample(n) {
  // The critic's response occasionally comes back unparseable (truncation/oscillation — Factory
  // Law 10 says the judge is flaky). No parseable dims = an INFRA/parse fault, never a quality
  // verdict: retry once, then PARK. A mean-0 "REWORK" here would misclassify flakiness as failure.
  for (let attempt = 1; attempt <= 2; attempt++) {
    const s = criticSampleOnce(n)
    if (s.park) return s
    if (s.dims.length > 0) {
      const lowValid = s.dims.filter(d => d.score <= 2 && /\d/.test(d.at)).map(d => d.name)
      console.log(`[tally] critic sample ${n}: mean ${s.mean}, evidenced-low: ${lowValid.join(',') || 'none'}`)
      return { mean: s.mean, lowValid, dims: s.dims }
    }
    appendFileSync(join(DIR, `_tally_sample_${n}_a${attempt}.log`), s.out || '')
    console.warn(`[tally] sample ${n} attempt ${attempt}: no parseable dims (raw saved) — ${attempt === 1 ? 'retrying once' : 'PARK'}`)
  }
  return { park: true, error: 'no parseable dims after retry (truncated/oscillating critic response)' }
}
const s1 = criticSample(1)
if (s1.park) { console.error('[tally] PARK — critic infra fault (never counts as rework):', s1.error); ballot('critic', 'park', { error: s1.error }); process.exit(3) }
let verdictMean = s1.mean, blocked = s1.lowValid
if (s1.mean >= BAND[0] && s1.mean <= BAND[1]) {
  console.log(`[tally] mean ${s1.mean} in borderline band [${BAND}] → escalating to 3 samples (quorum ≥2/3 per dimension)`)
  const s2 = criticSample(2), s3 = criticSample(3)
  if (s2.park || s3.park) { console.error('[tally] PARK — escalation infra fault'); ballot('critic', 'park', {}); process.exit(3) }
  const samples = [s1, s2, s3]
  verdictMean = +(samples.reduce((a, s) => a + s.mean, 0) / 3).toFixed(2)
  const counts = {}
  for (const s of samples) for (const d of new Set(s.lowValid)) counts[d] = (counts[d] || 0) + 1
  blocked = Object.entries(counts).filter(([, c]) => c >= 2).map(([d]) => d)
  ballot('critic-panel', blocked.length === 0 && verdictMean >= 3.5 ? 'pass' : 'block', { means: samples.map(s => s.mean), quorum_blocked: blocked })
} else {
  ballot('critic', blocked.length === 0 && verdictMean >= 3.5 ? 'pass' : 'block', { mean: verdictMean, evidenced_low: blocked })
}
const ship = blocked.length === 0 && verdictMean >= 3.5
console.log(`[tally] FINAL: mean=${verdictMean} blocked=[${blocked}] → ${ship ? 'SHIP (exit 0)' : 'REWORK (exit 1)'}`)
process.exit(ship ? 0 : 1)
