// prep_assets.mjs — (A) render a premium bokeh background, (B) record ONE continuous top→bottom scroll of
// the flagship site (hero → live dashboard graphs → contact form) so the SITE itself is always moving
// (CEO fix: the site must move, not a floating device). Logs marks.json (end mark) for record_3d.
import { chromium } from 'playwright'
import { pathToFileURL } from 'node:url'
import { rmSync, mkdirSync, writeFileSync } from 'node:fs'
rmSync('recm', { recursive: true, force: true }); mkdirSync('recm', { recursive: true })
const b = await chromium.launch()

// (A) premium background — dark with soft indigo/teal glow + faint bokeh (the earlier premium aesthetic)
let ctx = await b.newContext({ viewport: { width: 1080, height: 1920 } })
let p = await ctx.newPage()
await p.setContent(`<div style="width:1080px;height:1920px;background:#070A11;position:relative;overflow:hidden">
  <div style="position:absolute;left:50%;top:30%;width:1000px;height:1000px;transform:translate(-50%,-50%);background:radial-gradient(circle,rgba(124,131,255,.28),transparent 60%)"></div>
  <div style="position:absolute;left:12%;top:74%;width:620px;height:620px;background:radial-gradient(circle,rgba(63,209,199,.16),transparent 60%)"></div>
  <div style="position:absolute;left:82%;top:20%;width:340px;height:340px;background:radial-gradient(circle,rgba(245,184,74,.10),transparent 60%)"></div>
  <div style="position:absolute;left:70%;top:82%;width:120px;height:120px;border-radius:50%;background:rgba(124,131,255,.10);filter:blur(6px)"></div>
  <div style="position:absolute;left:16%;top:22%;width:80px;height:80px;border-radius:50%;background:rgba(63,209,199,.10);filter:blur(5px)"></div>
</div>`)
await p.waitForTimeout(200)
await p.screenshot({ path: 'bg.png' })
await ctx.close()

// (B) clean-beat recording
const url = pathToFileURL(process.cwd() + '/webdemo/flagship/index.html').href
ctx = await b.newContext({ viewport: { width: 608, height: 1080 }, recordVideo: { dir: 'recm', size: { width: 608, height: 1080 } } })
p = await ctx.newPage()
await p.addInitScript(() => { window.__cur = () => { if (document.getElementById('vc')) return; const c = document.createElement('div'); c.id = 'vc'; c.style.cssText = 'position:fixed;left:0;top:0;width:26px;height:26px;z-index:9999;pointer-events:none;filter:drop-shadow(0 2px 4px rgba(0,0,0,.6));transform:translate(300px,500px)'; c.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24" fill="white" stroke="#0A0D14" stroke-width="1.5"><path d="M4 2l6 16 2.5-6.5L19 9z"/></svg>'; document.body.appendChild(c) } })
await p.goto(url, { waitUntil: 'networkidle' }).catch(() => {})
await p.evaluate(() => window.__cur())
const move = async (x, y, ms = 500) => { await p.evaluate(([x, y, ms]) => { const c = document.getElementById('vc'); c.style.transition = `transform ${ms}ms cubic-bezier(.4,0,.2,1)`; c.style.transform = `translate(${x}px,${y}px)` }, [x, y, ms]); await p.waitForTimeout(ms) }
const toEl = async (sel, ms = 500) => { const bx = await p.locator(sel).boundingBox(); if (bx) await move(bx.x + bx.width / 2, bx.y + Math.min(bx.height / 2, 26), ms); return bx }
const scroll = async (toY, ms = 1100) => { await p.evaluate(([toY, ms]) => new Promise(r => { const s0 = window.scrollY, d = toY - s0, t0 = performance.now(); (function st(t) { const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3); window.scrollTo(0, s0 + d * e); k < 1 ? requestAnimationFrame(st) : r() })(t0) }), [toY, ms]); await p.waitForTimeout(80) }

const t0 = Date.now()
const now = () => Date.now() - t0
const marks = {}
// one continuous eased scroll (easeInOutSine) — the site never fully stops moving
const cscroll = async (toY, ms) => { await p.evaluate(([toY, ms]) => new Promise(r => {
  const s0 = window.scrollY, d = toY - s0, tt = performance.now()
  ;(function st(t){ const k = Math.min(1,(t-tt)/ms), e = 0.5-0.5*Math.cos(Math.PI*k); window.scrollTo(0, s0+d*e); k<1?requestAnimationFrame(st):r() })(tt)
}), [toY, ms]) }
await p.waitForTimeout(500)                                    // hero readable on frame 1 (brief, not a dead hold)
const dashTop = await p.evaluate(() => document.getElementById('dashboard').offsetTop - 40)
const formTop = await p.evaluate(() => document.getElementById('contact').offsetTop - 24)
const mid = Math.min(dashTop + 460, formTop - 160)
// continuous downward journey: hero → into dashboard → slow crawl over the LIVE graphs → form
await cscroll(dashTop, 3400)
await cscroll(mid, 3600)
await cscroll(formTop, 2200)
// form fill = live typing motion, then submit → toast
await toEl('#f-name'); await p.click('#f-name'); await p.type('#f-name', 'Aygün Məmmədova', { delay: 34 })
await toEl('#f-mail'); await p.click('#f-mail'); await p.type('#f-mail', 'aygun@klinika.az', { delay: 30 })
await toEl('#f-msg'); await p.click('#f-msg'); await p.type('#f-msg', 'Klinikam üçün yeni sayt.', { delay: 28 })
await toEl('button[type=submit]', 480); await p.click('button[type=submit]')
await p.waitForTimeout(1300); marks.end = now()               // short toast hold
await ctx.close(); await b.close()
writeFileSync('recm/marks.json', JSON.stringify({ marks }, null, 2))
console.log('prep done. continuous scroll. marks(ms):', JSON.stringify(marks))
