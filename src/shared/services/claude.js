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
  // Bolt 2.1: avgPriority now populated by updatePersona (was phantom field before)
  if (p.avgPriority && p.avgPriority !== "none") parts.push(`Typical task priority: ${p.avgPriority}`);
  if (p.mostActiveHour !== undefined) parts.push(`Most active around hour ${p.mostActiveHour}:00`);
  if (p.completionRate !== undefined) parts.push(`Task completion rate: ${Math.round(p.completionRate * 100)}%`);
  // Bolt 2.1: moodTrend — direction of user's recent momentum
  if (p.moodTrend && p.moodTrend !== "flat") {
    const trendLabel = p.moodTrend === "up" ? "improving" : "declining";
    parts.push(`Recent momentum: ${trendLabel}`);
  }
  // Bolt 2.1: lastActiveDate — helps AI understand gaps in engagement
  if (p.lastActiveDate) {
    const daysSince = Math.floor(
      (Date.now() - new Date(p.lastActiveDate).getTime()) / 86_400_000
    );
    if (daysSince > 1) parts.push(`Last session: ${daysSince} days ago`);
  }

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
 * Bolt 2.1: added step_one, steps[], energy_required for task-type items.
 *
 * @param {string} rawText
 * @param {"en"|"ru"|"az"} lang
 * @param {object|null} persona
 * @returns {Promise<{ items: object[], response: string }>}
 */
export async function parseDump(rawText, lang, persona = null) {
  const name = langName(lang);
  const personaCtx = buildPersonaContext(persona);

  // Defensive: very short / unreadable input → skip AI, return safe note
  if (!rawText || rawText.trim().length < 3) {
    return {
      items: [{ text: rawText?.trim() || "…", type: "note", priority: "none", tags: [] }],
      response: lang === "ru" ? "Сохранил как заметку."
               : lang === "az" ? "Qeyd kimi saxladım."
               : "Saved as a note.",
    };
  }

  const prompt = `You are a calm productivity assistant for people with ADHD.
All output text must be in ${name}.${personaCtx}

Return a JSON object with TWO keys — no markdown, no backticks:
{
  "items": [ array of thought objects ],
  "response": "1-2 warm, neutral sentences acknowledging what was captured. No judgement."
}

Each item in "items":
- "text": cleaned thought in ${name}
- "type": one of [task, note, idea, reminder, expense, memory]
- "priority": one of [none, low, medium, high, critical] — default to none unless urgency is explicit
- "tags": array max 3, lowercase, no spaces
- "reminderAt": ISO8601 datetime or null
- "clarify": short question ONLY if that specific item is genuinely ambiguous, else omit

For items where type === "task" ONLY, add these fields:
- "step_one": the single most concrete first action (max 10 words in ${name})
- "steps": array of 2-4 micro-steps in ${name}, each ≤ 10 words, starting with step_one
- "energy_required": one of ["low", "medium", "high"]

Rules:
- Split compound thoughts into separate items
- Do NOT invent tasks the user did not mention
- Detect dates/times for reminderAt
- Recurring patterns → "recurrence": one of ["daily","weekly:MON","weekly:TUE","weekly:WED","weekly:THU","weekly:FRI","weekly:SAT","weekly:SUN","monthly"]
Today: ${new Date().toISOString()}

Brain dump:
${rawText}`;

  const raw = await callClaude(prompt);
  const clean = raw.replace(/```json\n?|```/g, "").trim();

  // Primary: expect { items, response } object
  const objMatch = clean.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      const parsed = JSON.parse(objMatch[0]);
      return {
        items:    Array.isArray(parsed.items) ? parsed.items : [],
        response: typeof parsed.response === "string" ? parsed.response : "",
      };
    } catch { /* fall through */ }
  }

  // Fallback: bare array (legacy format)
  const arrMatch = clean.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    try { return { items: JSON.parse(arrMatch[0]) || [], response: "" }; }
    catch { /* fall through */ }
  }

  // Last resort: save raw text as note — never crash
  return {
    items: [{ text: rawText.trim(), type: "note", priority: "none", tags: [] }],
    response: lang === "ru" ? "Сохранил как заметку."
             : lang === "az" ? "Qeyd kimi saxladım."
             : "Saved as a note.",
  };
}

/**
 * Decomposes a single task into concrete micro-steps.
 * Used by the "I don't know where to start" button in TodayList.
 * Bolt 2.1.
 *
 * @param {object} task   — thought/task object with at least { text }
 * @param {"en"|"ru"|"az"} lang
 * @param {object|null} persona
 * @returns {Promise<{ steps: string[], step_one: string }>}
 */
export async function aiDecomposeTask(task, lang, persona = null) {
  const name = langName(lang);
  const ctx  = buildPersonaContext(persona);

  const prompt = `You are a calm ADHD coach. Respond in ${name}.${ctx}

Break this task into 3-4 concrete micro-steps. Each step must be ≤ 10 words, start with an action verb, and be something actionable right now.

Return ONLY a JSON object — no markdown, no prose:
{ "steps": ["step 1", "step 2", "step 3"], "step_one": "step 1" }

Task: ${task.text}`;

  try {
    const raw   = await callClaude(prompt);
    const clean = raw.replace(/```json\n?|```/g, "").trim();
    const m     = clean.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("No JSON in decompose response");
    const parsed = JSON.parse(m[0]);
    const steps  = Array.isArray(parsed.steps) ? parsed.steps.filter(Boolean) : [];
    return {
      steps,
      step_one: parsed.step_one || steps[0] || "",
    };
  } catch {
    // Graceful fallback — always return something actionable
    const fallback =
      lang === "ru" ? "Открой нужный файл или приложение"
      : lang === "az" ? "Lazımlı faylı açın"
      : "Open the relevant file or app";
    return { steps: [fallback], step_one: fallback };
  }
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
 * Parses a free-form day brain dump into a focused daily plan (max 7 tasks).
 * Bolt 2.2 — ADR 0007.
 *
 * @param {string}        rawText
 * @param {"en"|"ru"|"az"} lang
 * @param {object|null}   persona
 * @returns {Promise<Array<{title:string, priority:string, estimated_minutes:number, microsteps:string[]}>>}
 */
export async function parseDayPlan(rawText, lang, persona = null) {
  const name = langName(lang);
  const ctx  = buildPersonaContext(persona);

  const prompt = `You are a calm ADHD productivity coach. Respond in ${name}.${ctx}

A user has written their thoughts about what they want to do today. Create a focused daily plan.

Return ONLY a JSON array (no markdown, no backticks, no prose) — max 7 task objects:
[
  {
    "title": "Short task name in ${name} (≤ 8 words)",
    "priority": "high" | "medium" | "low",
    "estimated_minutes": integer (min 5, max 120),
    "microsteps": ["action verb + object ≤ 10 words", "..."] (2-3 items)
  }
]

Rules:
- Only extract tasks the user explicitly mentioned. Never invent tasks.
- Max 7 tasks. If the user wrote more, pick the most important.
- Rank by urgency and user-stated importance.
- microsteps[0] = the single most concrete first action (immediately doable).
- estimated_minutes must be realistic — account for context-switching and ADHD tax.
- Never use shame, guilt, or "you should" language in any field.
- If input is unclear or has no tasks, return an empty array [].

Today: ${new Date().toISOString()}

User input:
${rawText}`;

  const raw   = await callClaude(prompt);
  const clean = raw.replace(/```json\n?|```/g, "").trim();

  // Try array parse
  const arrMatch = clean.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    try {
      const parsed = JSON.parse(arrMatch[0]);
      if (Array.isArray(parsed)) {
        return parsed
          .filter(t => t?.title?.trim())
          .slice(0, 7)
          .map(t => ({
            title:             String(t.title).trim(),
            priority:          ["high", "medium", "low"].includes(t.priority) ? t.priority : "medium",
            estimated_minutes: Number.isFinite(t.estimated_minutes) ? Math.min(120, Math.max(5, t.estimated_minutes)) : 25,
            microsteps:        Array.isArray(t.microsteps) ? t.microsteps.filter(Boolean).slice(0, 3) : [],
          }));
      }
    } catch { /* fall through */ }
  }

  return []; // graceful empty — caller handles
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
