// line.mjs — the gated production line (n8n-style). Each stage runs, the next module CHECKS its output,
// and the line STOPS at the first REWORK instead of discovering the bug at the end.
// Stages (HTML daily path): [render] -> frame_check(stills) -> [assemble] -> content_critic(clip) -> publish.
// Here we run the two CHECK gates over an already-produced job dir to prove the line halts at the right stage.
// Usage: node line.mjs <jobDir>   (expects frame_*.png stills + a *.mp4 clip inside)
import { readdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const dir = process.argv[2] || 'ladder_runs/ep01'
const stills = readdirSync(dir).filter(f => /^frame_.*\.png$/.test(f)).map(f => `${dir}/${f}`).sort()
const clip = readdirSync(dir).filter(f => /\.mp4$/.test(f) && !/silent|seg_/.test(f)).map(f => `${dir}/${f}`)[0]

function gate(name, cmd, args) {
  process.stdout.write(`\n▶ GATE ${name} …\n`)
  try {
    execFileSync('node', [cmd, ...args], { stdio: 'inherit' })
    console.log(`✓ GATE ${name}: PASS → advance`)
    return true
  } catch {
    console.log(`✗ GATE ${name}: REWORK → line STOPS here. Fix this stage, do not proceed.`)
    return false
  }
}

console.log(`LINE start — job ${dir}: ${stills.length} stills, clip=${clip || 'none'}`)

// Gate 1 — per-frame visual QA (catches generation artifacts before assembly)
if (!gate('1/frame_check (stills)', 'frame_check.mjs', stills)) {
  console.log('\nLINE RESULT: STOPPED at stage 1 (stills). Regenerate the flagged frame(s), rerun.')
  process.exitCode = 1
} else if (clip && !gate('2/content_critic (assembled clip)', 'content_critic.mjs', [clip])) {
  // Gate 2 — whole-clip QA (voice/motion/mascot/readability) before publish
  console.log('\nLINE RESULT: STOPPED at stage 2 (assembly). Fix motion/voice/mascot per the verdict, do not publish.')
  process.exitCode = 1
} else {
  console.log('\nLINE RESULT: all gates PASS → clip is publish-ready.')
  process.exitCode = 0
}
