// credit_gate_auto.mjs — zero-diff telemetry chokepoint (ADR-013(c) pattern: visibility first).
// Import this ONCE at the top of any script that talks to Gemini; every fetch that hits
// generativelanguage.googleapis.com is metered into studio_spend.jsonl (next to this module) with
// kind/model/day. Idempotent (safe on double import via shared libs). Enforced by lint_credit_gate.mjs:
// a *.mjs file may reference generativelanguage ONLY if it imports credit_gate. WHY: 2026-07-10 grep
// found 22 direct calls / 0 metered — the exact shape of VOLAURA ADR-013 (Cerebras $7.25 burned with
// zero telemetry; CEO found it on the provider dashboard, not from us).
import { appendFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const LEDGER = join(dirname(fileURLToPath(import.meta.url)), 'studio_spend.jsonl')

if (!globalThis.__CREDIT_GATE_PATCHED) {
  globalThis.__CREDIT_GATE_PATCHED = true
  const orig = globalThis.fetch
  globalThis.fetch = async (url, opts) => {
    const u = String(url)
    if (u.includes('generativelanguage.googleapis.com')) {
      const kind = u.includes(':generateContent') ? 'gen'
        : u.includes(':predict') ? 'veo'
        : u.includes('/upload/') ? 'upload' : 'other'
      const model = (u.match(/models\/([^:/?]+)/) || [])[1] || '?'
      const ts = new Date().toISOString()
      const day = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Los_Angeles' }).format(new Date())
      try { appendFileSync(LEDGER, JSON.stringify({ day, ts, kind, model, tier: 'gemini', via: 'auto' }) + '\n') } catch {}
    }
    return orig(url, opts)
  }
}
