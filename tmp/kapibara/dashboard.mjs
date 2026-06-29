// КАПИБАРА — живой пульт. Читает реальные файлы состояния и перерисовывает dashboard.html.
// Запускается последней стадией make-clip → обновляется САМ каждый день (не рот, как старые дашборды).
// Ручной запуск: node dashboard.mjs [data-dir]
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'

const GCS = 'gs://kapibara-news-pub-0321449510/dashboard.html'
const PUBLIC_URL = 'https://storage.googleapis.com/kapibara-news-pub-0321449510/dashboard.html'

const DIR = process.argv[2] || process.env.KAPIBARA_DATA || '.'
const now = new Date()
const todayStr = now.toISOString().slice(0, 10)
const stamp = now.toISOString().slice(0, 16).replace('T', ' ') + ' UTC'

const readJson = (f) => { try { return JSON.parse(readFileSync(join(DIR, f), 'utf8')) } catch { return null } }
const today = readJson('today.json')
const latest = readJson('latest_output.json')
const state = readJson('state.json')
const metrics = readJson('metrics.json')

const SVC = { instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube' }
const metricsCard = (() => {
  const eps = (metrics?.episodes || []).slice(-3).reverse()
  if (!eps.length) return ''
  const rows = eps.map(e => {
    const plats = (e.platforms || []).map(p => {
      if (p.status === 'error') return `<div class="row"><span class="mut">${SVC[p.svc] || p.svc}</span> <b style="color:var(--gold)">⚠ не опубликовано</b></div>`
      const v = p.views == null ? '—' : p.views
      const extra = p.views == null ? 'метрики ещё собираются' : `reach ${p.reach ?? '—'} · eng ${p.eng != null ? p.eng.toFixed(1) + '%' : '—'}`
      return `<div class="row"><span class="mut">${SVC[p.svc] || p.svc}</span> <b>${v} просмотров <span class="mut" style="font-weight:400;font-size:13px">· ${extra}</span></b></div>`
    }).join('')
    return `<div class="hl" style="font-weight:700;margin-top:6px">${e.episode}</div>${plats}`
  }).join('')
  return `<div class="card"><h2>Охват · реальные цифры</h2>${rows}<div class="hl mut" style="font-size:12px;margin-top:8px">данные из Buffer · обновляются вместе с пультом</div></div>`
})()

const FOOTBALL = new Set(['trophy', 'ball', 'gloves', 'boot', 'whistle'])
const isFootball = today?.items?.some(it => FOOTBALL.has(it.key))
const format = isFootball ? 'Футбол / ЧМ' : 'ИИ-новости'
const KEY_EMOJI = { news: '📰', rocket: '🚀', chip: '🧠', lock: '🔒', chart: '📈', robot: '🤖', trophy: '🏆', ball: '⚽', gloves: '🧤', boot: '👟' }
const headlines = (today?.items || []).slice(1, 4).map(it => `${KEY_EMOJI[it.key] || '•'} ${it.title} — ${it.sub}`)
const ranToday = state?.lastRan === todayStr
const published = !!latest?.gcsUrl
const outputs = (() => { try { return readdirSync(DIR).filter(f => /^kapibara.*\.mp4$/.test(f)).sort().reverse().slice(0, 6) } catch { return [] } })()

// recurring per-episode cost (honest): Gemini free + Pexels/Coverr free; Veo only when used
const costLine = 'Gemini (голос/новости/перевод) — бесплатно · Pexels/Coverr (видео) — бесплатно · Veo (если включим) — ~$0.15–0.25/клип'

const esc = (s) => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
const dot = (ok) => ok ? '<span class="d ok"></span>' : '<span class="d wait"></span>'

const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="refresh" content="300">
<script src="https://telegram.org/js/telegram-web-app.js"></script>
<title>Капибара · Пульт</title>
<style>
:root{--bg:#0F1117;--surf:#1E2136;--surf2:#252840;--tx:#E8E8F0;--mut:#8B8BA7;--teal:#4ECDC4;--indigo:#7B72FF;--gold:#F2C94C}
*{box-sizing:border-box;margin:0} body{background:var(--bg);color:var(--tx);font-family:'Inter',system-ui,sans-serif;padding:20px;max-width:760px;margin:0 auto}
h1{font-size:26px;font-weight:900;letter-spacing:.5px}h1 span{color:var(--teal)} .stamp{color:var(--mut);font-size:13px;margin:6px 0 18px}
.card{background:var(--surf);border:1px solid #2c2f4d;border-radius:18px;padding:18px 20px;margin-bottom:14px}
.card h2{font-size:13px;letter-spacing:2px;color:var(--mut);font-weight:800;text-transform:uppercase;margin-bottom:12px}
.row{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:7px 0;border-bottom:1px solid #23263f;font-size:15px}.row:last-child{border:0}
.row b{color:var(--tx);font-weight:700}.mut{color:var(--mut)}
.d{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:7px;vertical-align:middle}.ok{background:var(--teal);box-shadow:0 0 8px var(--teal)}.wait{background:var(--gold);box-shadow:0 0 8px var(--gold)}
.pill{display:inline-block;background:var(--surf2);border:1px solid #34375a;border-radius:999px;padding:4px 12px;font-size:13px;color:var(--indigo);font-weight:700}
.hl{font-size:15px;padding:6px 0;color:var(--tx)} a{color:var(--teal);text-decoration:none} a:hover{text-decoration:underline}
.foot{color:var(--mut);font-size:12px;text-align:center;margin-top:8px;line-height:1.5}
.big{font-size:20px;font-weight:800}
</style></head><body>
<h1>🦫 Капибара <span>Пульт</span></h1>
<div class="stamp">обновлено ${stamp} · сам перерисовывается на каждом выпуске · автообновление страницы каждые 5 мин</div>

<div class="card">
  <h2>Сегодня</h2>
  <div class="row"><span class="mut">Формат</span> <span class="pill">${esc(format)}</span></div>
  <div class="row"><span class="mut">Конвеер сегодня</span> <b>${dot(ranToday)}${ranToday ? 'прогнан' : 'ещё не запускался'}</b></div>
  <div class="row"><span class="mut">Готовый файл</span> <b>${latest ? esc(latest.file) + ' · ' + esc(latest.sizeMB) + ' MB' : '—'}</b></div>
  <div class="row"><span class="mut">Залит на GCS</span> <b>${dot(published)}${published ? 'да' : 'нет (локально)'}</b></div>
  <div class="row"><span class="mut">Охват</span> <b class="mut">см. карточку «Охват» ниже</b></div>
</div>

<div class="card">
  <h2>Сюжеты выпуска</h2>
  ${headlines.length ? headlines.map(h => `<div class="hl">${esc(h)}</div>`).join('') : '<div class="mut">today.json пуст — конвеер ещё не собирал выпуск</div>'}
</div>

${metricsCard}

<div class="card">
  <h2>Кредиты и расход</h2>
  <div class="row"><span class="mut">Стоимость выпуска</span> <b>≈ $0</b></div>
  <div class="hl mut" style="font-size:13px">${esc(costLine)}</div>
  <div class="row"><span class="mut">GCP кредиты (баланс — только в консоли)</span> <a href="https://console.cloud.google.com/billing">открыть →</a></div>
  <div class="row"><span class="mut">Azure кредиты</span> <a href="https://portal.azure.com/#view/Microsoft_Azure_GTM/ModernBillingMenuBlade">открыть →</a></div>
</div>

<div class="card">
  <h2>Запуск</h2>
  <div class="row"><span class="mut">Следующий авто-выпуск</span> <b class="big">08:25</b></div>
  <div class="row"><span class="mut">Задача</span> <b>kapibara-daily (ежедневно)</b></div>
</div>

<div class="card">
  <h2>Последние выпуски</h2>
  ${outputs.length ? outputs.map(f => `<div class="row"><span>🎬 ${esc(f)}</span></div>`).join('') : '<div class="mut">пока нет mp4</div>'}
</div>

<div class="foot">ADHD-safe: teal / indigo / gold, без красного.<br>Баланс кредитов Google/Azure доступен только в их консолях — кнопки выше. Всё остальное здесь живое.</div>
<script>try{var t=window.Telegram&&window.Telegram.WebApp;if(t){t.ready();t.expand();t.setHeaderColor&&t.setHeaderColor('#0F1117');}}catch(e){}</script>
</body></html>`

writeFileSync(join(DIR, 'dashboard.html'), html)
console.log(`[dashboard] dashboard.html обновлён (${stamp}) — формат=${format}, прогон-сегодня=${ranToday}, GCS=${published}`)

// auto-publish to GCS so the Telegram Mini App URL always shows fresh data (graceful if gcloud absent)
try {
  execFileSync('gcloud', ['storage', 'cp', join(DIR, 'dashboard.html'), GCS, '--content-type=text/html', '--cache-control=no-cache,max-age=60'], { stdio: 'ignore', shell: true })
  console.log(`[dashboard] залит в Telegram Mini App: ${PUBLIC_URL}`)
} catch { console.warn('[dashboard] GCS upload skipped (gcloud недоступен) — локальный dashboard.html обновлён') }
