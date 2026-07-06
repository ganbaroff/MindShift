import { readFileSync, existsSync } from 'node:fs'

const env = readFileSync('C:/Users/user/Downloads/videos/.secrets.env', 'utf8')
const tok = (env.match(/^BUFFER_ACCESS_TOKEN=(.*)$/m) || [])[1]?.trim().replace(/^["']|["']$/g, '')
if (!tok) { console.error('[buffer_create] no BUFFER_ACCESS_TOKEN'); process.exit(1) }

// Resolve GCS URL from latest_output.json (written by assemble.mjs --upload)
let videoUrl = process.argv[2]
if (!videoUrl && existsSync('latest_output.json')) {
  const out = JSON.parse(readFileSync('latest_output.json', 'utf8'))
  videoUrl = out.gcsUrl
}
if (!videoUrl) {
  console.error('[buffer_create] no GCS URL. Run: node assemble.mjs --upload (or pass URL as arg)')
  process.exit(1)
}
console.log('[buffer_create] video URL:', videoUrl)

// Build caption from today.json (Disconnect #8 fix)
const KEY_EMOJI = { news: '📰', rocket: '🚀', chip: '🧠', lock: '🔒', chart: '📈', robot: '🤖' }
// Subtitle A/B day-parity must MATCH make-clip.mjs stage 5-6: odd UTC day-of-month = Arabic subs.
const arDay = new Date().getUTCDate() % 2 === 1
let caption
if (existsSync('today.json')) {
  const tj = JSON.parse(readFileSync('today.json', 'utf8'))
  const hook = tj.lines?.[1] || "Three stories from the world of AI"
  const news = (tj.items || []).slice(1, 4)
  const bullets = news.map(it => `${KEY_EMOJI[it.key] || '📰'} ${it.title} — ${it.sub}`).join('\n')
  const tags = '#ai #ainews #capybara #tech #learnai' + (arDay ? ' #الذكاء_الاصطناعي #تقنية' : '')
  caption = `${hook}

In one minute:
${bullets}

The capybara keeps a paw on the pulse 🐾
💬 Try the free AI skills test → link in bio
AI-made${arDay ? ' · 🇸🇦 Arabic subtitles' : ''}

${tags}`
} else {
  console.warn('[buffer_create] today.json missing — using static fallback caption')
  caption = `Three AI stories — while the world was asleep 🦫📰

The capybara keeps a paw on the pulse 🐾
💬 Try the free AI skills test → link in bio
AI-made${arDay ? ' · 🇸🇦 Arabic subtitles' : ''}

#ai #ainews #capybara #tech #learnai${arDay ? ' #الذكاء_الاصطناعي #تقنية' : ''}`
}

console.log('[buffer_create] caption preview:', caption.slice(0, 100).replace(/\n/g, ' ↵ ') + '…')

async function gql(query, variables) {
  const r = await fetch('https://api.buffer.com/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
    body: JSON.stringify({ query, variables }),
  })
  return r.json()
}

const channels = [
  { svc: 'instagram', id: '6a2b0b6638b557934586480c', meta: { instagram: { type: 'reel', shouldShareToFeed: true } } },
]
const mutation = `mutation($input: CreatePostInput!){ createPost(input:$input){
  __typename
  ... on PostActionSuccess { post { id status } }
  ... on RestProxyError { message code }
  ... on InvalidInputError { message }
  ... on UnauthorizedError { message }
  ... on LimitReachedError { message }
  ... on NotFoundError { message }
  ... on UnexpectedError { message }
} }`

for (const ch of channels) {
  const input = {
    channelId: ch.id, text: caption,
    assets: [{ video: { url: videoUrl } }],
    metadata: ch.meta,
    schedulingType: 'notification', mode: 'addToQueue', saveToDraft: true, aiAssisted: true, source: 'api',
  }
  const j = await gql(mutation, { input })
  if (j.errors) console.log(`${ch.svc}: ERROR ${JSON.stringify(j.errors).slice(0, 240)}`)
  else console.log(`${ch.svc}: ok →`, JSON.stringify(j.data?.createPost))
}
