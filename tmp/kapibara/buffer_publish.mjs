import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { requireEnv } from './env.mjs'
import { isPublished, recordPublish, closeJournal } from './journal.mjs'
const ONLY = (process.argv.find(a => a.startsWith('--only=')) || '').split('=')[1] || null
const tok = requireEnv('BUFFER_ACCESS_TOKEN')

// Episode identity — computed once, shared by the journal guard + record + published.json write.
// Format follows the same football-vs-ai-news signal used everywhere else in this file.
const FB_KEYS = new Set(['trophy', 'ball', 'gloves', 'boot', 'whistle'])
const EP_TODAY = existsSync('today.json') ? JSON.parse(readFileSync('today.json', 'utf8')) : {}
const EP_FORMAT = (EP_TODAY.items || []).some(it => FB_KEYS.has(it.key)) ? 'football' : 'ai-news'
const EP_DATE = (existsSync('latest_output.json') ? JSON.parse(readFileSync('latest_output.json', 'utf8')).date : null) || new Date().toISOString().slice(0, 10)

// ── CROSS-RUNNER GUARD (Supabase publish_journal) — FIRST, before the Gemini QA gate ──
// state.json/published.json are runner-local; the journal is the cross-runner truth. This
// stops a backup cron slot on a FRESH runner from re-publishing (incident 2026-07-06).
// Skipped by --republish / --only=<svc> (deliberate re-push / per-channel retry).
// pub === null (journal unreachable) => fall through to the local published.json guard below.
if (!process.argv.includes('--republish') && !ONLY) {
  const pub = await isPublished(EP_DATE, EP_FORMAT)
  if (pub === true) {
    console.log('[buffer_publish] BLOCKED: already published today per journal (cross-runner guard)')
    await closeJournal() // drain undici before exit(0) so the skip stays exit 0 in CI
    process.exit(0) // a skip is SUCCESS — the pipeline must not go red
  }
}

// Resolve public video URL from latest_output.json (dated filename on the public bucket)
const BUCKET = 'https://storage.googleapis.com/kapibara-news-pub-0321449510'
let videoUrl = process.argv[2]
if (!videoUrl && existsSync('latest_output.json')) {
  const out = JSON.parse(readFileSync('latest_output.json', 'utf8'))
  videoUrl = out.gcsUrl || `${BUCKET}/${out.file}`
}
if (!videoUrl) { console.error('[buffer_publish] no video URL'); process.exit(1) }

// ── IDEMPOTENCY GUARD — never double-publish the same episode (auto-publish safety) ──
// Keyed on date+format in published.json. Override: --republish. --only=<svc> retries bypass (per-channel retry).
if (!process.argv.includes('--republish') && !ONLY && existsSync('published.json')) {
  try {
    const _log = JSON.parse(readFileSync('published.json', 'utf8'))
    if (_log.some(e => e.date === EP_DATE && e.format === EP_FORMAT)) {
      console.log(`[buffer_publish] already published ${EP_FORMAT} for ${EP_DATE} (published.json) — skipping. Override: --republish`)
      process.exit(0)
    }
  } catch { /* unreadable log — proceed, QA gate still guards */ }
}

// ── HARD QA GATE (Factory Law 10) — refuse to publish a clip that fails content-critic ──
// This is the real block: it guards the public IG/TikTok push, never the preview. Override: --force-publish.
if (!process.argv.includes('--force-publish') && process.env.PUBLISH_OVERRIDE !== '1') {
  let localClip = null
  if (existsSync('latest_output.json')) { try { localClip = JSON.parse(readFileSync('latest_output.json', 'utf8')).file } catch {} }
  if (localClip && existsSync(localClip)) {
    console.log(`[buffer_publish] QA gate → content_critic on ${localClip}`)
    try {
      execFileSync('node', ['content_critic.mjs', localClip], { stdio: 'inherit', cwd: new URL('.', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1') })
      console.log('[buffer_publish] ✓ QA gate passed (ship_ready) — publishing')
    } catch {
      console.error('[buffer_publish] ✗ BLOCKED: clip not ship_ready (content-critic). Fix + re-render, or override with --force-publish. NOT publishing.')
      process.exit(1)
    }
  } else {
    console.warn('[buffer_publish] ⚠ QA gate SKIPPED — local clip not found for critique; publishing URL unguarded. Run the critic before publish or pass the local mp4.')
  }
}

// Build an ENGAGING caption from today.json — TOPIC-AWARE (football vs AI)
const KEY_EMOJI = { news: '📰', rocket: '🚀', chip: '🧠', lock: '🔒', chart: '📈', robot: '🤖', trophy: '🏆', ball: '⚽', gloves: '🧤', boot: '👟', whistle: '📣' }
const FOOTBALL_KEYS = new Set(['trophy', 'ball', 'gloves', 'boot', 'whistle'])
let caption
if (existsSync('today.json')) {
  const tj = JSON.parse(readFileSync('today.json', 'utf8'))
  const isFootball = (tj.items || []).some(it => FOOTBALL_KEYS.has(it.key))
  const news = (tj.items || []).slice(1, 4)
  const bullets = news.map(it => `${KEY_EMOJI[it.key] || (isFootball ? '⚽' : '📰')} ${it.title} — ${it.sub}`).join('\n')
  // Subtitle A/B day-parity must MATCH make-clip.mjs stage 5-6: odd UTC day-of-month = Arabic subs.
  const arDay = new Date().getUTCDate() % 2 === 1
  if (isFootball) {
    // Football branch stays Russian (out of scope of the EN conveyor; never-delete rule keeps it).
    const tags = '#футбол #чемпионатмира #worldcup2026 #football #footballtok #капибара'
    caption = `Что вы пропустили на чемпионате мира 🦫⚽

За минуту — что случилось:
${bullets}

Капибара спокойна. Капибара в курсе 🐾

💬 Попробуй бесплатный AI-тест навыков → ссылка в био

А вас какая новость зацепила? Пишите 👇

сделано ИИ
${tags}`
  } else {
    // English AI-news conveyor. AR-subs days append Arabic hashtags for the Saudi A/B test.
    const tags = '#ai #ainews #capybara #tech #learnai' + (arDay ? ' #الذكاء_الاصطناعي #تقنية' : '')
    caption = `While you lived your life, AI didn't sit still 🦫📰

In one minute — what happened:
${bullets}

The capybara stays calm. The capybara stays in the know 🐾

💬 Try the free AI skills test → link in bio

Which story got you? Drop it below 👇

AI-made${arDay ? ' · 🇸🇦 Arabic subtitles' : ''}
${tags}`
  }
} else {
  console.error('[buffer_publish] today.json missing — refusing to publish with no caption'); process.exit(1)
}

console.log('[buffer_publish] URL :', videoUrl)
console.log('[buffer_publish] caption:\n' + caption + '\n')

async function gql(query, variables) {
  const r = await fetch('https://api.buffer.com/', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
    body: JSON.stringify({ query, variables }),
  })
  return r.json()
}

// LinkedIn intentionally excluded (CEO: never publish there).
let channels = [
  { svc: 'instagram', id: '6a2b0b6638b557934586480c', meta: { instagram: { type: 'reel', shouldShareToFeed: true } } },
  { svc: 'tiktok', id: '6a2b0bf638b5579345864ab1', meta: undefined },
]
if (ONLY) { channels = channels.filter(c => c.svc === ONLY); console.log(`[buffer_publish] --only=${ONLY} → publishing to ${channels.map(c => c.svc).join(',') || '(none!)'}`) }
const createMut = `mutation($input: CreatePostInput!){ createPost(input:$input){
  __typename
  ... on PostActionSuccess { post { id status } }
  ... on RestProxyError { message code }
  ... on InvalidInputError { message }
  ... on UnauthorizedError { message }
  ... on LimitReachedError { message }
  ... on NotFoundError { message }
  ... on UnexpectedError { message }
} }`

const posts = []
for (const ch of channels) {
  const input = { channelId: ch.id, text: caption, assets: [{ video: { url: videoUrl } }], metadata: ch.meta, schedulingType: 'automatic', mode: 'shareNow', aiAssisted: true, source: 'api' }
  const j = await gql(createMut, { input })
  const ok = !j.errors && j.data?.createPost?.__typename === 'PostActionSuccess'
  const id = j.data?.createPost?.post?.id
  const res = j.errors ? `ERROR ${JSON.stringify(j.errors).slice(0, 220)}` : JSON.stringify(j.data?.createPost)
  console.log(`${ch.svc} PUBLISH → ${ok ? '✓ ' + id : '✗ ' + res}`)
  if (ok && id) posts.push({ svc: ch.svc, id })
}

// ── CROSS-RUNNER RECORD (Supabase publish_journal) — so a backup slot on a fresh runner skips ──
// One row per published svc. Fires only for real posts; journal-unreachable returns null and we
// carry on (the local published.json write below is the fallback metrics.mjs reads).
if (posts.length) {
  const captionLang = (existsSync('latest_output.json') ? (new Date().getUTCDate() % 2 === 1 ? 'ar' : 'en') : 'en')
  try {
    const jr = await recordPublish({
      date: EP_DATE, format: EP_FORMAT, posts,
      gcsUrl: videoUrl, lang: captionLang,
      runId: process.env.GITHUB_RUN_ID || 'local',
    })
    console.log(`[buffer_publish] journal ${jr === null ? 'UNREACHABLE (local published.json is the fallback)' : 'recorded ' + posts.length + ' post(s)'}`)
  } catch (e) { console.warn('[buffer_publish] journal record skipped:', e.message) }
}

// record episode → published.json so metrics.mjs tracks it + failures get caught (no more blind "sent")
// Kept alongside the journal: metrics.mjs reads this file locally.
try {
  const log = existsSync('published.json') ? JSON.parse(readFileSync('published.json', 'utf8')) : []
  if (posts.length) {
    log.push({ episode: `${EP_FORMAT === 'football' ? 'Футбол / ЧМ' : 'AI-новости'} ${EP_DATE}${ONLY ? ' (' + ONLY + ' retry)' : ''}`, date: EP_DATE, format: EP_FORMAT, posts })
    writeFileSync('published.json', JSON.stringify(log, null, 2))
    console.log(`[buffer_publish] записано в published.json (${posts.length} пост(ов)) — metrics.mjs подхватит`)
  }
  if (posts.length < channels.length) console.warn(`[buffer_publish] ⚠ ${channels.length - posts.length} из ${channels.length} НЕ опубликовано — см. ошибки выше`)
} catch (e) { console.warn('[buffer_publish] published.json write skipped:', e.message) }
