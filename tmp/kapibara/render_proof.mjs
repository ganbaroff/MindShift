// render_proof.mjs — visual-acceptance proof for studio_v6.html (iteration 2).
// Renders the 3 diagnostic frames the critic asked for and MEASURES the sub/ticker gap:
//   (1) mid of the LONGEST AZ subtitle line — verify sub does NOT collide with the ticker
//       (numeric assert: gap between #sub bottom and #ticker top >= 40px)
//   (2) an item-change +0.3s — eye glance toward the monitor should be visible
//   (3) t≈12s — monitor sheen mid-sweep + particles clearly visible
// Captures page/console errors and prints them. No red anywhere.
import { chromium } from '@playwright/test'
import { readFileSync, existsSync } from 'node:fs'

// Data file: explicit arg wins (e.g. data_subs_ar.json for the Arabic A/B proof), else auto-pick.
const DATA_FILE = process.argv[2]
  || (existsSync('data_subs_ar.json') ? 'data_subs_ar.json'
    : existsSync('data_subs_az.json') ? 'data_subs_az.json'
    : 'data.json')
// Suffix for output filenames so AR/AZ/EN proofs don't clobber each other.
const TAG = process.argv[3] || DATA_FILE.replace(/^data(_subs_)?/, '').replace(/\.json$/, '') || 'base'
const data = JSON.parse(readFileSync(DATA_FILE, 'utf8'))
const fps = data.fps
const pageUrl = new URL('studio_v6.html', import.meta.url).href

// ── find the LONGEST AZ subtitle line (by rendered char count) ──
let longest = 0
for (let n = 0; n < data.lines.length; n++) {
  if (data.lines[n].text.length > data.lines[longest].text.length) longest = n
}
const longestLine = data.lines[longest]
const longMid = (longestLine.s + longestLine.e) / 2

// ── first mid-video item change (glance target) — item changes at itemStart boundaries ──
const changes = [...new Set(data.lines.map((l) => l.itemStart ?? l.s))].sort((a, b) => a - b)
const midChange = changes.find((c) => c > 1) ?? changes[1] // skip the t=0 opener
const glanceT = midChange + 0.3

// frame plan: [label, timeInSeconds]
const plan = [
  ['longsub', longMid],   // longest AZ line — sub vs ticker clearance
  ['glance', glanceT],    // item change +0.3s — eye glance
  ['sheen', 12.0],        // t≈12s — sheen mid-sweep + particles
]
const frames = plan.map(([label, tt]) => [label, Math.round(tt * fps)])

console.log('DATA:', DATA_FILE, '| fps', fps, '| lines', data.lines.length, '| frameCount', data.frameCount)
console.log(`LONGEST line = index ${longest} (${longestLine.text.length} chars): "${longestLine.text}"`)
console.log(`item-change boundaries: [${changes.join(', ')}]  → glance frame at t=${glanceT.toFixed(2)}s`)
for (const [label, f] of frames) console.log(`  frame ${label}: i=${f}  t=${(f / fps).toFixed(2)}s`)

const pageErrors = []
const consoleErrors = []

const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 })
p.on('pageerror', (e) => pageErrors.push(String(e)))
p.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()) })

await p.goto(pageUrl)
await p.evaluate((d) => window.loadData(d), data)
await p.waitForTimeout(200)

let gap = null
for (const [label, f] of frames) {
  await p.evaluate((fr) => window.setFrame(fr), f)
  await p.waitForTimeout(30)
  const out = `proof_studio_${TAG}_${label}.png`
  await p.screenshot({ path: out })
  console.log('wrote', out)

  if (label === 'longsub') {
    // measure the real rendered boxes and assert clearance
    const boxes = await p.evaluate(() => {
      const sr = document.getElementById('sub').getBoundingClientRect()
      const tr = document.getElementById('ticker').getBoundingClientRect()
      return {
        sub: { top: sr.top, bottom: sr.bottom, height: sr.height, width: sr.width, text: document.getElementById('sub').textContent },
        ticker: { top: tr.top, bottom: tr.bottom, height: tr.height },
      }
    })
    gap = boxes.ticker.top - boxes.sub.bottom
    console.log('\n--- SUB vs TICKER MEASUREMENT (longest AZ line) ---')
    console.log('sub    box: top=%s bottom=%s height=%s width=%s', boxes.sub.top.toFixed(1), boxes.sub.bottom.toFixed(1), boxes.sub.height.toFixed(1), boxes.sub.width.toFixed(1))
    console.log('ticker box: top=%s bottom=%s height=%s', boxes.ticker.top.toFixed(1), boxes.ticker.bottom.toFixed(1), boxes.ticker.height.toFixed(1))
    console.log('GAP (ticker.top - sub.bottom) = %s px', gap.toFixed(1))
    console.log('sub text:', JSON.stringify(boxes.sub.text))
  }
}

await b.close()

console.log('\n--- CLEARANCE ASSERT ---')
if (gap === null) {
  console.log('SUB_TICKER_GAP=unknown (measurement failed)')
  process.exitCode = 1
} else if (gap >= 40) {
  console.log(`SUB_TICKER_GAP=pass (${gap.toFixed(1)}px >= 40px)`)
} else {
  console.log(`SUB_TICKER_GAP=fail (${gap.toFixed(1)}px < 40px)`)
  process.exitCode = 1
}

console.log('\n--- JS ERROR REPORT ---')
console.log('pageErrors:', pageErrors.length ? JSON.stringify(pageErrors) : 'none')
console.log('consoleErrors:', consoleErrors.length ? JSON.stringify(consoleErrors) : 'none')
if (pageErrors.length || consoleErrors.length) {
  console.log('PROOF_JS=fail')
  process.exitCode = 1
} else {
  console.log('PROOF_JS=clean')
}
