// lint_credit_gate.mjs — mechanical ADR-013(a) gate: NO direct Gemini calls outside the credit gate.
// Rule: any *.mjs here that mentions generativelanguage.googleapis.com MUST import credit_gate
// (credit_gate.mjs explicit wrapper or credit_gate_auto.mjs telemetry patch). Exit 1 + list otherwise.
// Run: node lint_credit_gate.mjs   (wire as a pre-run step / CI when kapibara files are tracked)
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const dir = dirname(fileURLToPath(import.meta.url))
const files = readdirSync(dir).filter(f => f.endsWith('.mjs') && !f.startsWith('credit_gate') && f !== 'lint_credit_gate.mjs')
const offenders = []
for (const f of files) {
  const src = readFileSync(join(dir, f), 'utf8')
  if (src.includes('generativelanguage.googleapis.com') && !src.includes('credit_gate')) offenders.push(f)
}
if (offenders.length) {
  console.error(`[lint_credit_gate] FAIL — ${offenders.length} file(s) call Gemini directly without the credit gate:`)
  for (const f of offenders) console.error('  - ' + f)
  process.exit(1)
}
console.log(`[lint_credit_gate] PASS — ${files.length} files scanned, 0 unmetered Gemini callers`)
