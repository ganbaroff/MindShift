// Metrics loop: pull REAL per-post numbers from Buffer for every published episode → metrics.json.
// The dashboard reads metrics.json. Run standalone (node metrics.mjs) or as a make-clip stage.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { requireEnv } from './env.mjs'
const tok = requireEnv('BUFFER_ACCESS_TOKEN')

async function gql(query, variables) {
  const r = await fetch('https://api.buffer.com/', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` }, body: JSON.stringify({ query, variables }) })
  return r.json()
}
const Q = `query($input:PostInput!){ post(input:$input){ id channelService status externalLink error{__typename} metrics{name value unit} } }`
const pick = (m, n) => (m || []).find(x => x.name === n)?.value ?? null

const eps = existsSync('published.json') ? JSON.parse(readFileSync('published.json', 'utf8')) : []
const out = []
for (const ep of eps) {
  const platforms = []
  for (const p of ep.posts) {
    const post = (await gql(Q, { input: { id: p.id } })).data?.post
    platforms.push({
      svc: p.svc, status: post?.status ?? 'unknown', error: post?.error?.__typename || null, link: post?.externalLink || null,
      views: pick(post?.metrics, 'Views'), reach: pick(post?.metrics, 'Reach'), eng: pick(post?.metrics, 'Eng. Rate'),
      reactions: pick(post?.metrics, 'Reactions'), comments: pick(post?.metrics, 'Comments'), shares: pick(post?.metrics, 'Shares'),
    })
  }
  out.push({ episode: ep.episode, date: ep.date, format: ep.format, platforms })
}
writeFileSync('metrics.json', JSON.stringify({ updatedAt: new Date().toISOString(), episodes: out }, null, 2))
console.log('[metrics] metrics.json обновлён:')
for (const e of out) for (const p of e.platforms) {
  const line = p.status === 'error' ? '❌ ОШИБКА ПУБЛИКАЦИИ' : `${p.views ?? '—'} просмотров · reach ${p.reach ?? '—'} · eng ${p.eng != null ? p.eng.toFixed(1) + '%' : '—'}`
  console.log(`  ${e.episode} · ${p.svc}: ${line}`)
}
