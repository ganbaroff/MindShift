// json_repair.mjs — tolerant JSON extraction + stack-aware truncation repair (FIX 1, 2026-07-20).
// Ported from the proven block in frame_check.mjs (live catch 2026-07-17): the Gemini judge often
// truncates its JSON tail (drops closing braces — the "thinking" budget starves the answer) or wraps
// it in ```json fences. Naive JSON.parse then throws and content_critic fail-closes, silently killing
// the day's IG/TikTok publish (incident 2026-07-13, again 2026-07-20 before a backup slot rescued it).
// This recovers the RECOVERABLE ones so a complete-but-untidy verdict parses instead of fail-closing.
// It throws ONLY when the text is genuinely unrecoverable — the gate then still fails closed (correct
// for a publish gate: never ship on an unreadable verdict). Pure + dependency-free → unit-testable.
export function repairJsonObject(txt) {
  const clean = String(txt).replace(/```json/gi, '').replace(/```/g, '').trim()
  const s = clean.indexOf('{')
  let body = s >= 0 ? clean.slice(s) : clean
  try { return JSON.parse(body) } catch { /* fall through to repair */ }
  // Stack-aware repair: walk chars string/escape-aware; cut at the char that closes the outermost
  // object (drops trailing garbage) or at an unmatched closer; then append whatever is still open.
  let inStr = false, esc = false; const stack = []; let end = body.length
  for (let i = 0; i < body.length; i++) {
    const ch = body[i]
    if (esc) { esc = false; continue }
    if (inStr) { if (ch === '\\') esc = true; else if (ch === '"') inStr = false; continue }
    if (ch === '"') inStr = true
    else if (ch === '{') stack.push('}')
    else if (ch === '[') stack.push(']')
    else if (ch === '}' || ch === ']') {
      if (!stack.length) { end = i; break }        // unmatched closer → drop it and the rest
      stack.pop()
      if (!stack.length) { end = i + 1; break }     // outermost object closed → drop the rest
    }
  }
  body = body.slice(0, end).replace(/,\s*$/, '') + (inStr ? '"' : '') + stack.reverse().join('')
  return JSON.parse(body)
}
