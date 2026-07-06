// Render the VOLAURA·Kapibara social brand kit to PNGs via Playwright.
// Run from a dir where @playwright/test resolves (tmp/kapibara). File URL passed absolute.
import { chromium } from '@playwright/test'
import { pathToFileURL } from 'node:url'

const KIT = 'C:/Projects/mindshift/tmp/brand/kit.html'
const OUT = 'C:/Projects/mindshift/tmp/brand'
const targets = [
  { t: 'avatar', w: 1080, h: 1080, sel: '.avatar', file: 'kapibara-avatar-1080.png' },
  { t: 'banner', w: 2560, h: 1440, sel: '.banner', file: 'kapibara-youtube-banner.png' },
  { t: 'board',  w: 1600, h: 1000, sel: '.board',  file: 'kapibara-brand-board.png' },
]
const b = await chromium.launch()
for (const g of targets) {
  const p = await b.newPage({ viewport: { width: g.w, height: g.h }, deviceScaleFactor: 1 })
  await p.goto(`${pathToFileURL(KIT).href}?t=${g.t}`)
  await p.waitForFunction(() => document.title.startsWith('ready-'))
  await p.waitForTimeout(500) // let webfonts settle
  const el = await p.$(g.sel)
  await el.screenshot({ path: `${OUT}/${g.file}` })
  console.log('rendered', g.file, `${g.w}x${g.h}`)
  await p.close()
}
await b.close()
console.log('DONE brand kit')
