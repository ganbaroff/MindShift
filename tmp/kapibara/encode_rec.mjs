// encode_rec.mjs — newest .webm in <dir> → <out.mp4> (H.264, faststart). The Playwright recorders
// (prep_assets → recm/, record_3d → rec3/) leave webm; every consumer needs mp4. Was ad-hoc bash —
// a recipe station must be executable, so it lives as a script (Studio Conductor P2).
// Usage: node encode_rec.mjs <recordings-dir> <out.mp4>
import { readdirSync, statSync, renameSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

const [dir, out] = process.argv.slice(2)
if (!dir || !out) { console.error('usage: node encode_rec.mjs <dir> <out.mp4>'); process.exit(1) }
const webm = readdirSync(dir).filter(f => f.endsWith('.webm'))
  .map(f => ({ f, t: statSync(join(dir, f)).mtimeMs })).sort((a, b) => b.t - a.t)[0]
if (!webm) { console.error(`[encode] no .webm in ${dir}`); process.exit(1) }
try {
  execFileSync('ffmpeg', ['-y', '-i', join(dir, webm.f), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-an', '-movflags', '+faststart', out], { stdio: 'ignore' })
} catch (e) {
  // missing ffmpeg binary = infra (exit 3 → conductor parks); a real encode failure = rework (exit 1)
  if (e.code === 'ENOENT') { console.error('[encode] ffmpeg not found (infra) → PARK'); process.exit(3) }
  const badFile = join(dir, webm.f)
  const corruptFile = badFile + '.corrupt'
  try {
    renameSync(badFile, corruptFile)
    console.error(`[encode] ffmpeg failed on ${webm.f} (renamed to ${webm.f}.corrupt to avoid loops)`)
  } catch (err) {
    console.error(`[encode] ffmpeg failed on ${webm.f} (failed to rename: ${err.message})`)
  }
  process.exit(1)
}
console.log(`[encode] ${dir}/${webm.f} → ${out}`)
