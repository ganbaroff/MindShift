// Sync kapibara episodes + metrics → Supabase via Management API SQL exec.
// Uses service_role → bypasses RLS, works regardless of PostgREST schema cache.
import { readFileSync, existsSync } from 'node:fs'
import { requireEnv } from './env.mjs'
const SUPA_URL = requireEnv('VITE_SUPABASE_URL')
const SVC_KEY  = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
if (!SUPA_URL || !SVC_KEY) { console.error('[sync] need VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env'); process.exit(1) }

// Use PostgREST with service role (bypasses RLS; schema cache irrelevant for service role writes)
async function rest(table, body, extra = '') {
  const r = await fetch(`${SUPA_URL}/rest/v1/${table}${extra}`, {
    method: 'POST',
    headers: {
      apikey: SVC_KEY,
      Authorization: `Bearer ${SVC_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation,resolution=merge-duplicates',
    },
    body: JSON.stringify(body),
  })
  const text = await r.text()
  return { ok: r.ok, status: r.status, data: text ? JSON.parse(text) : [] }
}

const pub  = existsSync('published.json') ? JSON.parse(readFileSync('published.json', 'utf8')) : []
const met  = existsSync('metrics.json')   ? JSON.parse(readFileSync('metrics.json', 'utf8'))   : { episodes: [] }
const lat  = existsSync('latest_output.json') ? JSON.parse(readFileSync('latest_output.json', 'utf8')) : null

// dedupe: keep only the latest entry per (date, format) — retry entries ignored for episode upsert
const epMap = {}
for (const ep of pub) {
  const k = `${ep.date}::${ep.format}`
  if (!epMap[k]) epMap[k] = ep
}

for (const ep of Object.values(epMap)) {
  const mEp = met.episodes?.find(m => m.episode === ep.episode)

  const epRow = {
    date:      ep.date,
    format:    ep.format,
    episode:   ep.episode,
    video_file: lat?.file    || null,
    gcs_url:   lat?.gcsUrl  || null,
    size_mb:   lat?.sizeMB  ? parseFloat(lat.sizeMB) : null,
  }

  const epRes = await rest('kapibara_episodes?on_conflict=date,format', epRow)
  if (!epRes.ok) {
    // PostgREST schema cache may still be warming — log but don't crash
    console.warn(`[sync] episode upsert failed (${epRes.status}) — will retry next run: ${JSON.stringify(epRes.data).slice(0, 120)}`)
    continue
  }
  const episodeId = epRes.data?.[0]?.id
  if (!episodeId) { console.warn(`[sync] no id returned for ${ep.episode}`); continue }
  console.log(`[sync] episode OK: ${ep.episode} → ${episodeId}`)

  for (const p of mEp?.platforms || []) {
    const postId = ep.posts.find(x => x.svc === p.svc)?.id || null
    const mRow = {
      episode_id:    episodeId,
      svc:           p.svc,
      status:        p.status    || 'unknown',
      buffer_post_id: postId,
      external_link: p.link      || null,
      views:         p.views     ?? null,
      reach:         p.reach     ?? null,
      reactions:     p.reactions ?? null,
      comments:      p.comments  ?? null,
      shares:        p.shares    ?? null,
      saves:         p.saves     ?? null,
      eng_rate:      p.eng       ?? null,
      error:         p.error     || null,
    }
    const mRes = await rest('kapibara_metrics', mRow)
    const tag = p.views != null ? `${p.views}v` : p.status === 'error' ? 'ERR' : '—'
    console.log(`  ${p.svc}: ${mRes.ok ? '✓' : '✗'} ${tag}`)
  }
}
console.log('[sync] done')
