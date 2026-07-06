// dup_delete.mjs — delete ONLY the 2026-07-06 DUPE pair via Buffer. KEEP pair is never touched.
// CEO-authorized 2026-07-06 ("удаляй"). Targets are hardcoded so no arg can widen the blast radius.
import { readFileSync } from 'node:fs'
const env = readFileSync('C:/Users/user/Downloads/videos/.secrets.env', 'utf8')
const tok = (env.match(/^BUFFER_ACCESS_TOKEN=(.*)$/m) || [])[1]?.trim().replace(/^["']|["']$/g, '')
async function gql(query, variables) {
  const r = await fetch('https://api.buffer.com/', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` }, body: JSON.stringify({ query, variables }) })
  return r.json()
}
const DUPES = [
  ['IG',     '6a4b6c467e52c06f81c2f732'],  // instagram.com/reel/DacgHfBiMgc/
  ['TikTok', '6a4b6c51bb08ba69daadcdff'],  // tiktok.com/@yusifganbarov/video/7659334686941990164
]
// Minimal shape (same as the proven del_drafts.mjs) — DeletePostPayload, just read __typename.
const delMut = `mutation($input: DeletePostInput!){ deletePost(input:$input){ __typename } }`
for (const [svc, id] of DUPES) {
  const j = await gql(delMut, { input: { id } })
  const t = j.data?.deletePost?.__typename
  const msg = j.errors ? 'GQL_ERR ' + JSON.stringify(j.errors).slice(0, 220) : (t || JSON.stringify(j.data).slice(0, 160))
  console.log(`delete ${svc} ${id} -> ${msg}`)
}
