/**
 * shared/services/claude.js
 *
 * TWO-LAYER ARCHITECTURE (ADR 0003, ADR 0006):
 *
 * Layer 1 — HTTP Client
 *   Knows: API key, endpoint URL, timeout, error codes.
 *   Does NOT know: what a brain dump is, what a persona is.
 *   Only export: _callClaudeHTTP (internal) / callClaude (public alias)
 *
 * Layer 2 — Semantic AI Functions
 *   Knows: prompts, business concepts (parseDump, eveningReview, focusSuggest).
 *   Does NOT know: API keys, HTTP headers, retry logic.
 *   Exports: parseDump, generateEveningReview, aiFocusSuggest
 *
 * Prompt helpers (buildPersonaContext) live here because they are
 * prompt-construction utilities, not UI or data utilities.
 *
 * To swap AI provider (e.g. Gemini for parseDump — ADR 0008 plan):
 *   - Add a second HTTP client function in Layer 1
 *   - Update the relevant Layer 2 function to call it
 *   - Feature code (features/*) does not change
 */

// =============================================================================
// LAYER 1 — HTTP CLIENT
// Knows about: API key, endpoint, timeout, HTTP error codes
// =============================================================================

const AI_ENDPOINT = "https://api.anthropic.com/v1/messages";
const AI_MODEL    = "claude-sonnet-4-20250514";
const AI_TIMEOUT  = 10000; // 10s — matches INVARIANT 6 (UX: no infinite spinners)

/**
 * Low-level Claude API caller.
 * @param {string} prompt
 * @returns {Promise<string>} raw text response
 */
export async function callClaude(prompt) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT);
  try {
    const res = await fetch(AI_ENDPOINT, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) {
      throw new Error(
        `API ${res.status}` +
        (res.status === 429 ? ":rate_limit" : res.status === 401 ? ":auth" : "")
      );
    }
    const data = await res.json();
    return data.content?.[0]?.text || "";
  } catch (e) {
    if (e.name === "AbortError") throw new Error("timeout");
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

// =============================================================================
// LAYER 2 — PROMPT HELPERS
// Shared context builders used across semantic functions
// =============================================================================

/**
 * Builds a persona context string to inject into prompts.
 * Reads from persona.patterns (see ADR 0006 for full persona schema).
 *
 * TODO: Extend to include persona.memory summary and character.tone
 *       once evening-review memory writing is implemented (Sprint 3).
 *
 * @param {object|null} persona
 * @returns {string}
 */
export function buildPersonaContext(persona) {
  if (!persona?.patterns) return "";
  const p = persona.patterns;
  const parts = [];
  if (p.topTags?.length)              parts.push(`User often works on: ${p.topTags.join(", ")}`);
  // TODO: avgPriority is referenced here but never set by updatePersona() — potential bug.
  //       Tracked as tech debt. Do not fix in this bolt (scope: extraction only).
  if (p.avgPriority)                  parts.push(`Typical priority level: ${p.avgPriority}`);
  if (p.mostActiveHour !== undefined) parts.push(`Most active around hour ${p.mostActiveHour}:00`);
  if (p.completionRate !== undefined) parts.push(`Task completion rate: ${Math.round(p.completionRate * 100)}%`);
  return parts.length ? `\n\nUser context:\n${parts.join("\n")}` : "";
}

/** Converts lang code to full language name for prompts. */
function langName(lang) {
  return lang === "ru" ? "Russian" : lang === "az" ? "Azerbaijani" : "English";
}

// =============================================================================
// LAYER 2 — SEMANTIC AI FUNCTIONS
// Knows about: business concepts, prompts, response parsing
// Does NOT know: API keys, HTTP headers
// =============================================================================

/**
 * Parses a raw brain dump into structured thought items.
 *
 * @param {string} rawText
 * @param {"en"|"ru"|"az"} lang
 * @param {object|null} persona
 * @returns {Promise<{ items: object[], response: string }>}
 */
export async function parseDump(rawText, lang, persona = null) {
  const name = langName(lang);
  const personaCtx = buildPersonaContext(persona);

  const prompt = `You are a productivity assistant for people with ADHD.
All output text must be in ${name}.${personaCtx}

Return a JSON object with TWO keys — no markdown, no backticks:
{
  "items": [ array of thought objects ],
  "response": "1-2 warm sentences acknowledging what was captured. If something is ambiguous, ask ONE clarifying question here."
}

Each item in "items":
- "text": cleaned thought in ${name}
- "type": one of [task, note, idea, reminder, expense, memory]
- "priority": one of [none, low, medium, high, critical]
- "tags": array max 3, lowercase, no spaces
- "reminderAt": ISO8601 datetime or null
- "clarify": short question ONLY if that specific item is genuinely ambiguous, else omit

Rules: split compound thoughts, default → task, detect urgency words, detect dates/times.
Detect recurring patterns: "every day/каждый день", "every monday/каждый понедельник", "weekly/еженедельно" → set "recurrence" field.
- "recurrence": one of ["daily","weekly:MON","weekly:TUE","weekly:WED","weekly:THU","weekly:FRI","weekly:SAT","weekly:SUN","monthly"] or omit if not recurring
Today: ${new Date().toISOString()}

Brain dump:
${rawText}`;

  const raw = await callClaude(prompt);
  const clean = raw.replace(/```json|```/g, "").trim();

  const objMatch = clean.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      const parsed = JSON.parse(objMatch[0]);
      return {
        items: Array.isArray(parsed.items) ? parsed.items : [],
        response: parsed.response || "",
      };
    } catch {}
  }

  // Fallback: try bare array
  const arrMatch = clean.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    return { items: JSON.parse(arrMatch[0]) || [], response: "" };
  }

  throw new Error("Could not parse AI response");
}

/**
 * Generates a compassionate ADHD evening review.
 *
 * @param {object[]} doneItems
 * @param {object[]} missedItems
 * @param {"en"|"ru"|"az"} lang
 * @param {object|null} persona
 * @returns {Promise<string>} plain text review
 */
export async function generateEveningReview(doneItems, missedItems, lang, persona) {
  const name = langName(lang);
  const ctx  = buildPersonaContext(persona);

  const prompt = `You are a compassionate ADHD coach. Write a short evening review in ${name} (3-4 sentences MAX).${ctx}

Completed: ${JSON.stringify(doneItems.map(t => t.text))}
Not completed: ${JSON.stringify(missedItems.map(t => t.text))}

Rules: no guilt, no shame, acknowledge wins (even tiny ones), one gentle tomorrow suggestion, end with one open reflective question. Plain text only.`;

  return await callClaude(prompt);
}

/**
 * Suggests the top 3 tasks to focus on today.
 *
 * @param {object[]} tasks
 * @param {"en"|"ru"|"az"} lang
 * @param {object|null} persona
 * @returns {Promise<{ picks: string[], reason: string }>}
 */
export async function aiFocusSuggest(tasks, lang, persona) {
  if (!tasks.length) return { picks: [], reason: "" };
  const name = langName(lang);
  const ctx  = buildPersonaContext(persona);

  const prompt = `You are an ADHD productivity coach. Respond in ${name}.${ctx}

From the task list below, pick the TOP 3 to focus on today.
Return ONLY a JSON object: { "picks": [array of task texts, max 3], "reason": "1 sentence why these three" }
No markdown, no backticks.

Tasks:
${tasks.map((t, i) => `${i + 1}. [${t.priority}] ${t.text}`).join("\n")}`;

  const raw   = await callClaude(prompt);
  const clean = raw.replace(/```json|```/g, "").trim();
  const m     = clean.match(/\{[\s\S]*\}/);
  if (!m) return { picks: [], reason: "" };

  try {
    const parsed = JSON.parse(m[0]);
    return {
      picks: Array.isArray(parsed.picks) ? parsed.picks : [],
      reason: parsed.reason || "",
    };
  } catch {
    return { picks: [], reason: "" };
  }
}
