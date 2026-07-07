import { chromium } from '@playwright/test'
import { readFileSync, mkdirSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
const mode = process.argv[2] || 'full'
const WORKERS = parseInt(process.argv[3] || '8', 10)
const data = JSON.parse(readFileSync(process.argv[4] || 'outro.json', 'utf8'))
const N = data.frameCount
const url = new URL('yusif_outro.html', import.meta.url).href
if (mode === 'preview') {
  mkdirSync('prev_outro', { recursive: true })
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 })
  await p.goto(url); await p.evaluate((d) => window.loadData(d), data); await p.waitForTimeout(300)
  for (const fr of [Math.round(N * 0.15), Math.round(N * 0.5), Math.round(N * 0.85)]) { await p.evaluate((f) => window.setFrame(f), fr); await p.waitForTimeout(40); await p.screenshot({ path: `prev_outro/f_${fr}.png` }) }
  await b.close(); console.log('outro preview ok', N)
} else {
  mkdirSync('frames_outro', { recursive: true })
  async function w(wid) { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 }); await p.goto(url); await p.evaluate((d) => window.loadData(d), data); for (let i = wid; i < N; i += WORKERS) { await p.evaluate((f) => window.setFrame(f), i); await p.screenshot({ path: `frames_outro/f_${String(i).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 90, animations: 'disabled' }) } await b.close() }
  await Promise.all(Array.from({ length: WORKERS }, (_, i) => w(i))); console.log('outro rendered', N)
}
