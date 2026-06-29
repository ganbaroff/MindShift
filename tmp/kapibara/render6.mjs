import { chromium } from '@playwright/test'
import { readFileSync, mkdirSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
const mode = process.argv[2] || 'preview'
const WORKERS = parseInt(process.argv[3] || '8', 10)
const data = JSON.parse(readFileSync(process.argv[4] || 'data.json', 'utf8'))
const N = data.frameCount
const url = (process.argv[5] ? pathToFileURL(process.argv[5]) : new URL('studio_v6.html', import.meta.url)).href
if (mode === 'preview') {
  mkdirSync('prev6', { recursive: true })
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 })
  await p.goto(url); await p.evaluate((d) => window.loadData(d), data); await p.waitForTimeout(300)
  for (const tt of [9, 22, 31]) { await p.evaluate((f) => window.setFrame(f), Math.round(tt * data.fps)); await p.waitForTimeout(40); await p.screenshot({ path: `prev6/t_${tt}.png` }) }
  await b.close(); console.log('v6 preview ok')
} else {
  mkdirSync('frames_fast', { recursive: true })
  async function w(wid) { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 }); await p.goto(url); await p.evaluate((d) => window.loadData(d), data); for (let i = wid; i < N; i += WORKERS) { await p.evaluate((f) => window.setFrame(f), i); await p.screenshot({ path: `frames_fast/f_${String(i).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 90, animations: 'disabled' }) } await b.close() }
  await Promise.all(Array.from({ length: WORKERS }, (_, i) => w(i))); console.log('v6 rendered', N)
}
