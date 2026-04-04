/**
 * capture-feature-graphic.ts — Play Store feature graphic 1024×500
 *
 * Usage: npx tsx scripts/capture-feature-graphic.ts
 * Output: public/feature-graphic.png
 */

import { chromium } from 'playwright'
import * as path from 'path'

async function main() {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({
    viewport: { width: 1024, height: 500 },
    deviceScaleFactor: 2,
  })
  const page = await ctx.newPage()

  const htmlPath = path.join(process.cwd(), 'public', 'feature-graphic.html')
  await page.goto(`file://${htmlPath.replace(/\\/g, '/')}`, { waitUntil: 'load' })
  await page.waitForTimeout(500)

  const outPath = path.join(process.cwd(), 'public', 'feature-graphic.png')
  await page.screenshot({ path: outPath, fullPage: false })
  console.log(`✓ feature-graphic.png → ${outPath}`)

  await browser.close()
}

main().catch(e => { console.error(e); process.exit(1) })
