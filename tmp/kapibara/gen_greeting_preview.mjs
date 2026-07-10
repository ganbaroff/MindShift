import './credit_gate_auto.mjs'
// gen_greeting_preview.mjs — Studio Conductor FORMAT: greeting (поздравление).
// The product's CONTROL POINT: from a subscriber brief → a PREVIEW IMAGE the user approves
// BEFORE the expensive i2v video. Themed AI scene (minecraft/lego/watercolor) + crisp overlaid
// greeting text in the target language (text is OVERLAID, never AI-generated — AI text garbles).
// Credit-gated (free Gemini image model). Usage: node gen_greeting_preview.mjs --brief=greeting_brief.json
import { chromium } from 'playwright'
import { pathToFileURL } from 'node:url'
import { readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { requireEnv } from './env.mjs'

const briefArg = (process.argv.find(a => a.startsWith('--brief=')) || '').split('=')[1] || 'greeting_brief.json'
const b = JSON.parse(readFileSync(briefArg, 'utf8'))
const job = b.job_id || 'g000'
const scene = `scene_${job}.jpg`, preview = `preview_${job}.png`
const key = requireEnv('GEMINI_API_KEY')
const MODEL = 'gemini-3-pro-image-preview'

// occasion → what the themed scene shows (Constitution: teal/indigo/gold, NEVER aggressive red)
const OCCASION = {
  birthday: 'a festive birthday celebration: a cake with glowing candles, confetti, balloons and banners',
  newyear: 'a New Year celebration: fireworks, a decorated tree, sparkling snow and lanterns',
  wedding: 'an elegant wedding celebration: flowers, rings, soft lights and drapery',
  anniversary: 'a warm anniversary celebration: candles, flowers and soft golden light',
}
const STYLE = {
  minecraft: 'Minecraft blocky voxel art style, cubic blocks, pixel textures, playful',
  lego: 'LEGO plastic brick style, glossy studs, toy-like, colorful',
  watercolor: 'soft hand-painted watercolor style, gentle gradients, dreamy',
  papercut: 'layered paper-cut craft style, soft shadows, tactile',
}
const occ = OCCASION[b.occasion] || OCCASION.birthday
const sty = STYLE[b.style] || STYLE.watercolor
const prompt = `${occ}, in ${sty}. Vertical 9:16 portrait composition, warm festive lighting, teal / indigo / gold color palette. NO real human faces, NO real-world brand logos, NO readable text or letters anywhere in the image. Cheerful and premium. Absolutely avoid large aggressive red.`

// ── 1) themed scene (credit-gated); fall back to a gradient so the preview always renders ──
let sceneOk = false
try {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST', headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: ['IMAGE'] } }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 160)}`)
  const j = await res.json()
  const part = j.candidates?.[0]?.content?.parts?.find(p => p.inlineData)
  if (!part) throw new Error('no inlineData')
  writeFileSync(`${scene}.raw`, Buffer.from(part.inlineData.data, 'base64'))
  execFileSync('ffmpeg', ['-y', '-i', `${scene}.raw`, '-vf', 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920', '-q:v', '3', scene], { stdio: 'ignore' })
  rmSync(`${scene}.raw`, { force: true })
  sceneOk = true
  console.log(`[greeting] scene → ${scene}`)
} catch (e) { console.warn(`[greeting] scene gen failed (${e.message}) → gradient fallback`) }

// ── 2) composite crisp greeting text over the scene (HTML → Playwright screenshot) ──
const esc = s => String(s || '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]))
const bg = sceneOk ? `url('${pathToFileURL(process.cwd() + '/' + scene).href}')` : 'radial-gradient(60% 45% at 50% 32%, #2a3566, #0E1626)'
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@500;700&display=swap');
html,body{margin:0;width:1080px;height:1920px}
.card{width:1080px;height:1920px;position:relative;background:${bg};background-size:cover;background-position:center;
  font-family:'IBM Plex Sans',sans-serif;color:#FFFFFF;display:flex;flex-direction:column;justify-content:flex-end;align-items:center}
.scrim{position:absolute;inset:0;background:linear-gradient(180deg,rgba(14,22,38,.10) 40%,rgba(14,22,38,.86) 100%)}
.txt{position:relative;text-align:center;padding:0 70px 190px}
.name{font-size:96px;font-weight:700;letter-spacing:.5px;text-shadow:0 4px 24px rgba(0,0,0,.55);line-height:1.05}
.msg{font-size:52px;font-weight:500;margin-top:26px;color:#EAF1F7;text-shadow:0 3px 18px rgba(0,0,0,.6);line-height:1.25}
.badge{position:absolute;top:44px;right:44px;font-size:24px;font-weight:500;color:#CBD7E6;background:rgba(14,22,38,.55);
  padding:10px 18px;border-radius:20px;backdrop-filter:blur(4px)}
.style{position:absolute;top:44px;left:44px;font-size:24px;font-weight:700;color:#63B4C7;background:rgba(14,22,38,.55);padding:10px 18px;border-radius:20px}
</style></head><body>
<div class="card"><div class="scrim"></div>
  <div class="style">${esc((b.style || 'watercolor').toUpperCase())}</div>
  <div class="badge">AI · preview</div>
  <div class="txt"><div class="name">${esc(b.name)}</div><div class="msg">${esc(b.message)}</div></div>
</div></body></html>`
writeFileSync(`_greeting_${job}.html`, html)
const browser = await chromium.launch()
const page = await (await browser.newContext({ viewport: { width: 1080, height: 1920 } })).newPage()
await page.goto(pathToFileURL(process.cwd() + `/_greeting_${job}.html`).href, { waitUntil: 'networkidle' }).catch(() => {})
await page.waitForTimeout(400)
await page.screenshot({ path: preview })
await browser.close()
rmSync(`_greeting_${job}.html`, { force: true })
console.log(`[greeting] ${preview} — ${b.occasion}/${b.style}/${b.language} for "${b.name}" (scene:${sceneOk ? 'AI' : 'gradient'})`)
