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
 *   Exports: parseDump, generateEveningReview, aiFocusSuggest, personaDialogue
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
// LAYER 1 — HTTP CLIENT (Bolt 4.3, ADR 0015 · Bolt 4.4, ADR 0016)
// Knows about: proxy URL, session token, timeout, HTTP error codes.
// The ANTHROPIC_API_KEY lives in Supabase Secrets (server-side only).
// It never appears in this file or any client bundle.
// =============================================================================

import { getSupabase } from "./supabase.js";

// All AI calls route through the Supabase Edge Function proxy.
// VITE_SUPABASE_URL is a public, non-secret value (safe in VITE_*).
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "";
const AI_PROXY     = `${SUPABASE_URL}/functions/v1/ai-proxy`;
const AI_MODEL     = "claude-sonnet-4-20250514";
const AI_TIMEOUT   = 10000; // 10s — INVARIANT 6 (UX: no infinite spinners)

/**
 * Low-level AI caller — routes through Edge Function proxy (Bolt 4.3, ADR 0015).
 * The ANTHROPIC_API_KEY is injected server-side; never reaches the browser.
 *
 * Bolt 4.4 (ADR 0016): `action` is forwarded to the Edge Function to enable
 * server-side per-user rate limiting. The proxy strips it before calling
 * Anthropic. Layer 2 functions that are rate-limited must pass their action name.
 *
 * @param {string} prompt                   — user message (used when opts.messages is omitted)
 * @param {{ system?: string, messages?: Array<{role:string,content:string}>, maxTokens?: number, action?: string }} [opts]
 * @returns {Promise<string>} raw text response
 */
export async function callClaude(prompt, opts = {}) {
  const { system, messages: customMessages, maxTokens = 1000, action } = opts;

  // Retrieve the current Supabase session JWT for Edge Function auth.
  // getSupabase() may return null before init; session stays null in that case
  // and the Edge Function rejects with 401 — correct: AI requires signed-in user.
  const sb = getSupabase();
  const { data: { session } } =
    (await sb?.auth.getSession()) ?? { data: { session: null } };
  const token = session?.access_token ?? "";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT);

  try {
    const body = {
      model:      AI_MODEL,
      max_tokens: maxTokens,
      messages:   customMessages || [{ role: "user", content: prompt }],
    };
    if (system) body.system = system;
    // Bolt 4.4: action tells Edge Function which usage_limits counter to check.
    // The proxy strips this field before forwarding to Anthropic.
    if (action) body.action = action;

    const res = await fetch(AI_PROXY, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${token}`,   // Supabase JWT — no API key in browser
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      // Bolt 4.4: on 429 read the response body to get the action that was
      // limited — gives callers and UI more context for the error message.
      if (res.status === 429) {
        let limitedAction = "";
        try {
          const errBody = await res.json();
          limitedAction = errBody?.action || "";
        } catch { /* ignore parse errors */ }
        throw new Error(`API 429:rate_limit${limitedAction ? ":" + limitedAction : ""}`);
      }
      throw new Error(
        `API ${res.status}` + (res.status === 401 ? ":auth" : "")
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

  const raw = await callClaude(prompt, { action: "parseDump" });
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
 * Generates a compassionate ADHD evening review with XP award.
 * Bolt 2.4: changed return type from string → { reflection, xpEarned }
 * ADR 0008: XP formula is activity-based, not completion-based.
 *
 * @param {object[]} doneItems   — completed tasks ({ title } or { text })
 * @param {object[]} missedItems — incomplete tasks
 * @param {"en"|"ru"|"az"} lang
 * @param {object|null} persona
 * @param {{ plannedCount?: number, noteWritten?: boolean }} activity
 * @returns {Promise<{ reflection: string, xpEarned: number }>}
 */
export async function generateEveningReview(doneItems, missedItems, lang, persona, activity = {}) {
  const name = langName(lang);
  const ctx  = buildPersonaContext(persona);

  // XP computed client-side — AI cannot override the formula (ADR 0008)
  const { plannedCount = 0, noteWritten = false } = activity;
  const xpCalc =
    10 +                                     // base: showed up for evening review
    (plannedCount > 0     ? 10 : 0) +        // created a day plan
    (doneItems.length > 0 ? 10 : 0) +        // completed at least one task
    (noteWritten          ? 10 : 0) +        // wrote a personal note
    10;                                      // +10 for requesting AI reflection

  const prompt = `You are a compassionate ADHD coach. Respond in ${name}.${ctx}

Today's tasks:
- Completed (${doneItems.length}): ${JSON.stringify(doneItems.map(t => t.title || t.text))}
- Incomplete (${missedItems.length}): ${JSON.stringify(missedItems.map(t => t.title || t.text))}

Return ONLY valid JSON — no markdown, no backticks:
{ "reflection": "2-3 sentences in ${name}", "xp_earned": ${xpCalc} }

Reflection rules:
- No 'good day / bad day' judgements
- Acknowledge effort (not just outcomes)
- Incomplete tasks mentioned neutrally if at all: 'some things wait for another time'
- Tone: warm, calm, matter-of-fact
- xp_earned must be exactly ${xpCalc}`;

  try {
    const raw   = await callClaude(prompt, { action: "generateEveningReview" });
    const clean = raw.replace(/```json\n?|```/g, "").trim();
    const m     = clean.match(/\{[\s\S]*\}/);
    if (m) {
      const parsed     = JSON.parse(m[0]);
      const reflection = typeof parsed.reflection === "string" && parsed.reflection.length > 10
        ? parsed.reflection
        : _fallbackReflection(lang, doneItems.length);
      // Clamp to [10, 50] — AI must not accidentally award negative or extreme XP
      const xpEarned = Math.min(50, Math.max(10, Number(parsed.xp_earned) || xpCalc));
      return { reflection, xpEarned };
    }
  } catch { /* fall through */ }

  return { reflection: _fallbackReflection(lang, doneItems.length), xpEarned: xpCalc };
}

/** Fallback reflection when AI parse fails */
function _fallbackReflection(lang, doneCount) {
  if (lang === "ru") return doneCount > 0
    ? "Ты сделал кое-что сегодня. Это всегда считается."
    : "Ты появился. Иногда это само по себе — работа.";
  if (lang === "az") return doneCount > 0
    ? "Bu gün bir şey etdin. Bu həmişə sayılır."
    : "Gəldin. Bəzən bu özü bir işdir.";
  return doneCount > 0
    ? "You got some things done today. That always counts."
    : "You showed up. Sometimes that's the work.";
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

  const raw   = await callClaude(prompt, { action: "aiFocusSuggest" });
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

// =============================================================================
// LAYER 2 — PERSONA DIALOGUE (Bolt 3.2, ADR 0012)
// RPG-style character conversation. System prompt is archetype-flavoured.
// Messages are passed as multi-turn history (last 6 from localStorage).
// max_tokens: 256 — responses must be 1–3 sentences per spec.
// =============================================================================

const ARCHETYPE_DESCRIPTIONS = {
  explorer: "a curious, adaptable explorer who embraces new ideas and directions",
  builder:  "a methodical, focused builder who finds meaning in steady progress",
  dreamer:  "an imaginative dreamer who sees possibility in everything",
  guardian: "a steady, reliable guardian who protects what matters most",
};

/**
 * Sends a multi-turn persona dialogue message to Claude.
 * The character responds in-persona based on archetype + user context.
 *
 * @param {Array<{role:"user"|"assistant", content:string}>} messages
 *   - Last N messages from localStorage (already trimmed to ≤6 by caller)
 * @param {{
 *   archetype:        string,
 *   archetypeName:    string,
 *   lang:             "en"|"ru"|"az",
 *   level:            number,
 *   completedTasks:   number,
 *   totalTasks:       number,
 * }} ctx
 * @returns {Promise<string>} — plain text reply (1–3 sentences)
 */
export async function personaDialogue(messages, ctx) {
  const {
    archetype     = "explorer",
    archetypeName = "Explorer",
    lang          = "en",
    level         = 1,
    completedTasks = 0,
    totalTasks    = 0,
  } = ctx;

  const description = ARCHETYPE_DESCRIPTIONS[archetype] || ARCHETYPE_DESCRIPTIONS.explorer;
  const langName_   = lang === "ru" ? "Russian" : lang === "az" ? "Azerbaijani" : "English";

  const system = `You are ${archetypeName} — ${description}.
Respond in ${langName_}.
Keep your response to 1–3 sentences. Be warm and neuroaffirmative.
Do not give unsolicited advice or evaluate the user's progress.
Do not mention productivity metrics unless the user asks.
You know about the user: Level ${level}, completed ${completedTasks} of ${totalTasks} tasks today.
Never break character. Never reveal that you are an AI.`;

  try {
    const text = await callClaude("", { system, messages, maxTokens: 256, action: "personaDialogue" });
    return text.trim() || _personaFallback(lang);
  } catch {
    return _personaFallback(lang);
  }
}

function _personaFallback(lang) {
  if (lang === "ru") return "Слышу тебя. Я здесь.";
  if (lang === "az") return "Eşidirəm. Buradadam.";
  return "I hear you. I'm here.";
}
