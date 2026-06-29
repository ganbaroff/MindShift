import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { requireEnv } from './env.mjs'
const ONLY = (process.argv.find(a => a.startsWith('--only=')) || '').split('=')[1] || null
const tok = requireEnv('BUFFER_ACCESS_TOKEN')

// Resolve public video URL from latest_output.json (dated filename on the public bucket)
const BUCKET = 'https://storage.googleapis.com/kapibara-news-pub-0321449510'
let videoUrl = process.argv[2]
if (!videoUrl && existsSync('latest_output.json')) {
  const out = JSON.parse(readFileSync('latest_output.json', 'utf8'))
  videoUrl = out.gcsUrl || `${BUCKET}/${out.file}`
}
if (!videoUrl) { console.error('[buffer_publish] no video URL'); process.exit(1) }

// Build an ENGAGING caption from today.json — TOPIC-AWARE (football vs AI)
const KEY_EMOJI = { news: '📰', rocket: '🚀', chip: '🧠', lock: '🔒', chart: '📈', robot: '🤖', trophy: '🏆', ball: '⚽', gloves: '🧤', boot: '👟', whistle: '📣' }
const FOOTBALL_KEYS = new Set(['trophy', 'ball', 'gloves', 'boot', 'whistle'])
let caption
if (existsSync('today.json')) {
  const tj = JSON.parse(readFileSync('today.json', 'utf8'))
  const isFootball = (tj.items || []).some(it => FOOTBALL_KEYS.has(it.key))
  const news = (tj.items || []).slice(1, 4)
  const bullets = news.map(it => `${KEY_EMOJI[it.key] || (isFootball ? '⚽' : '📰')} ${it.title} — ${it.sub}`).join('\n')
  const opener = isFootball ? 'Что вы пропустили на чемпионате мира 🦫⚽' : 'Пока вы жили свою жизнь, ИИ не сидел без дела 🦫📰'
  const tags = isFootball
    ? '#футбол #чемпионатмира #worldcup2026 #football #footballtok #капибара'
    : '#ии #ai #новости #технологии #капибара #нейросети'
  caption = `${opener}

За минуту — что случилось:
${bullets}

Капибара спокойна. Капибара в курсе 🐾

А вас какая новость зацепила? Пишите 👇

сделано ИИ · 🇦🇿 субтитры на азербайджанском
${tags}`
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

// record episode → published.json so metrics.mjs tracks it + failures get caught (no more blind "sent")
try {
  const tj = existsSync('today.json') ? JSON.parse(readFileSync('today.json', 'utf8')) : {}
  const fmt = (tj.items || []).some(it => FOOTBALL_KEYS.has(it.key)) ? 'football' : 'ai-news'
  const date = (latestFile => latestFile?.date)(existsSync('latest_output.json') ? JSON.parse(readFileSync('latest_output.json', 'utf8')) : null) || new Date().toISOString().slice(0, 10)
  const log = existsSync('published.json') ? JSON.parse(readFileSync('published.json', 'utf8')) : []
  if (posts.length) {
    log.push({ episode: `${fmt === 'football' ? 'Футбол / ЧМ' : 'AI-новости'} ${date}${ONLY ? ' (' + ONLY + ' retry)' : ''}`, date, format: fmt, posts })
    writeFileSync('published.json', JSON.stringify(log, null, 2))
    console.log(`[buffer_publish] записано в published.json (${posts.length} пост(ов)) — metrics.mjs подхватит`)
  }
  if (posts.length < channels.length) console.warn(`[buffer_publish] ⚠ ${channels.length - posts.length} из ${channels.length} НЕ опубликовано — см. ошибки выше`)
} catch (e) { console.warn('[buffer_publish] published.json write skipped:', e.message) }
