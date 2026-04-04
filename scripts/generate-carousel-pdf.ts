/**
 * generate-carousel-pdf.ts — LinkedIn carousel (PDF with 1080x1350 slides)
 *
 * Usage: npx tsx scripts/generate-carousel-pdf.ts
 * Output: public/linkedin-carousel.pdf
 *
 * LinkedIn treats uploaded PDFs as swipeable carousels (left→right).
 */

import { chromium } from 'playwright'
import * as path from 'path'
import * as fs from 'fs'

async function main() {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 1350 } })
  const page = await ctx.newPage()

  const htmlPath = path.join(process.cwd(), 'scripts', 'linkedin-carousel.html')
  await page.goto(`file://${htmlPath.replace(/\\/g, '/')}`, { waitUntil: 'load' })
  await page.waitForTimeout(500)

  // Generate PDF — each .slide is a page (page-break-after: always)
  const pdfPath = path.join(process.cwd(), 'public', 'linkedin-carousel.pdf')
  await page.pdf({
    path: pdfPath,
    width: '1080px',
    height: '1350px',
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  })

  // Also generate individual PNGs for preview
  const slides = await page.$$('.slide')
  for (let i = 0; i < slides.length; i++) {
    const pngPath = path.join(process.cwd(), 'public', `carousel-slide-${i + 1}.png`)
    await slides[i].screenshot({ path: pngPath })
  }

  console.log(`✓ PDF → ${pdfPath} (${slides.length} slides)`)
  console.log(`✓ PNGs → public/carousel-slide-*.png`)

  const stats = fs.statSync(pdfPath)
  console.log(`✓ Size: ${(stats.size / 1024).toFixed(0)} KB`)

  await browser.close()
}

main().catch(e => { console.error(e); process.exit(1) })
