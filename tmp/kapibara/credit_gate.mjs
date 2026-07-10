// credit_gate.mjs — the single METERED chokepoint every LLM call must route through (P0 of the
// Studio Conductor plan; see STUDIO-CONDUCTOR-SPEC.md). WHY: grep 2026-07-10 found 22 direct
// generativelanguage.googleapis.com calls across 20 files and ZERO through any gateway — credits-first
// (CLAUDE.md #4) is UNENFORCED and there is NO meter. This is the exact class VOLAURA already paid for
// (lessons Class 56: cerebras billed real money undetected → they added llm_spend + caps). This module
// is the seam; wiring the ~20 callers through it is the rest of P0. Ledger = studio_spend.jsonl (cwd).
import { appendFileSync, readFileSync, existsSync } from 'node:fs'

const LEDGER = 'studio_spend.jsonl'
const DAILY_TEXT_CAP = Number(process.env.STUDIO_TEXT_CAP || 90)   // free-tier ~100/day, headroom for 1 rework

// Credits-first tier order (CLAUDE.md #4): route TEXT through the first CONFIGURED tier. Multimodal
// (video/image understanding) is Gemini-only on the free tier, so it always resolves to gemini.
const TEXT_TIERS = [
  { name: 'nvidia', env: 'NVIDIA_API_KEY' },
  { name: 'vertex', env: 'VERTEX_API_KEY' },
  { name: 'azure',  env: 'AZURE_OPENAI_KEY' },
  { name: 'gemini', env: 'GEMINI_API_KEY' },   // free key = the credits-first free tier
]
export function pickTextTier() {
  for (const t of TEXT_TIERS) if (process.env[t.env]) return t.name
  return 'gemini'
}
function todayKey() { return new Date().toISOString().slice(0, 10) }
export function todayCount() {
  if (!existsSync(LEDGER)) return 0
  const day = todayKey()
  return readFileSync(LEDGER, 'utf8').split('\n').filter(l => l.includes(`"day":"${day}"`)).length
}
function meter(kind, model, tier) {
  appendFileSync(LEDGER, JSON.stringify({ day: todayKey(), ts: new Date().toISOString(), kind, model, tier }) + '\n')
  const n = todayCount()
  if (n > DAILY_TEXT_CAP) console.warn(`[credit_gate] WARN ${n}/${DAILY_TEXT_CAP} calls today — near free-tier ceiling (park policy is a P2 TODO)`)
  return n
}

// The ONE entrypoint for a Gemini generateContent call. Meters first, then calls. Video understanding
// (critic_agency / content_critic / frame_check) lands here; text callers get real tier selection.
export async function geminiGenerate({ model, apiKey, body, kind = 'text' }) {
  const tier = kind === 'text' ? pickTextTier() : 'gemini'
  const count = meter(kind, model, tier)
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return { res, tier, count }
}
