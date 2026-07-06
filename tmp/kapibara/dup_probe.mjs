// dup_probe.mjs — READ-ONLY. Inspect the two 2026-07-06 publish pairs before any delete.
// Primary (KEEP) = 08:19Z run; Dupe (DELETE candidate) = 08:43Z cron re-run. No mutations here.
import { readFileSync } from 'node:fs'
const env = readFileSync('C:/Users/user/Downloads/videos/.secrets.env', 'utf8')
const tok = (env.match(/^BUFFER_ACCESS_TOKEN=(.*)$/m) || [])[1]?.trim().replace(/^["']|["']$/g, '')
async function gql(query, variables) {
  const r = await fetch('https://api.buffer.com/', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` }, body: JSON.stringify({ query, variables }) })
  return r.json()
}
const q = `query($input:PostInput!){ post(input:$input){ id channelService status sentAt externalLink error { __typename } metrics { name value unit } } }`
const posts = [
  ['KEEP', 'IG', '6a4b660e7e52c06f81c2c61f'],
  ['KEEP', 'TikTok', '6a4b66197e52c06f81c2c664'],
  ['DUPE', 'IG', '6a4b6c467e52c06f81c2f732'],
  ['DUPE', 'TikTok', '6a4b6c51bb08ba69daadcdff'],
]
for (const [tag, svc, id] of posts) {
  const j = await gql(q, { input: { id } })
  const p = j.data?.post
  if (!p) { console.log(`\n${tag} ${svc}: NO DATA ${JSON.stringify(j.errors || j).slice(0, 140)}`); continue }
  const m = (p.metrics || []).map(x => `${x.name}=${x.value}${x.unit && x.unit !== 'NONE' ? x.unit : ''}`).join(', ') || '(no metrics)'
  console.log(`\n${tag} ${svc} [${p.status}]${p.error ? ' ERROR:' + p.error.__typename : ''}  sentAt=${p.sentAt || '—'}`)
  console.log(`  link   : ${p.externalLink || '—'}`)
  console.log(`  metrics: ${m}`)
}
