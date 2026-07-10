import './credit_gate_auto.mjs'
// One-off: list Veo models visible to our GEMINI_API_KEY + their supported methods.
// Grounds the exact model id before we spend (model knowledge can be stale).
// Never prints the key (env.mjs resolves it).
import { requireEnv } from './env.mjs'
const key = requireEnv('GEMINI_API_KEY')
const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000', {
  headers: { 'x-goog-api-key': key },
})
if (!res.ok) { console.error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`); process.exit(1) }
const j = await res.json()
const veo = (j.models || []).filter(m => /veo/i.test(m.name))
if (!veo.length) { console.log('NO veo models visible to this key'); }
for (const m of veo) {
  console.log(`${m.name}  | methods: ${(m.supportedGenerationMethods || []).join(',')}`)
}
