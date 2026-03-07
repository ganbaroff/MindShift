# Skill: ai-client-and-prompts

> Read this file before writing any AI call, modifying prompts, adding a new Claude
> feature, or touching `src/shared/services/claude.js`. Prompt changes are ADR-gated.

---

## The Single Entry Point Rule

**All Claude API calls go through `src/shared/services/claude.js`.**

```js
// ✅ correct — use the service
import { callClaude, buildPersonaContext } from "../../shared/services/claude.js";

// ❌ never call the API directly from a feature
const res = await fetch("https://api.anthropic.com/v1/messages", { … });
```

This ensures:
- Freemium rate limiting is enforced in one place
- Retry logic lives in one place
- Prompt context injection (persona) is consistent
- API key is never scattered across feature files

---

## `callClaude(prompt, options?)` API

```js
const result = await callClaude(prompt, {
  systemPrompt,          // string — overrides the default system prompt
  personaContext,        // string — appended to system prompt (from buildPersonaContext)
  maxTokens,            // number — default 1024
  temperature,          // number — default 0.7
});

// result: { text: string } | { error: string }
if (result.error) {
  logError("DumpScreen.processThoughts", new Error(result.error));
  return;
}
const parsed = parseAIResponse(result.text);
```

Always check for `result.error` before using `result.text`.

---

## `buildPersonaContext(persona)` API

Converts the `persona` object (from Supabase) into a short natural-language string that
is appended to the system prompt:

```js
import { buildPersonaContext } from "../../shared/services/claude.js";

const personaCtx = buildPersonaContext(persona);
// Example output:
// "\n\nUser context:\nUser often works on: work, health, coding\nTask completion rate: 72%\nRecent momentum: improving"
```

Rules:
- `buildPersonaContext` must remain a **pure function** — no API calls, no async
- Flat `moodTrend` is suppressed (too noisy for the AI)
- `lastActiveDate` is only included when the user has been away > 1 day
- `avgPriority: "none"` is suppressed

---

## Prompt Architecture

Every AI call has two layers:

### Layer 1 — System Prompt (role + rules)

```
You are MindFocus, a calm, supportive AI assistant for neurodivergent users.
Your job is to parse a brain dump and return structured JSON.
Rules:
- Be concise and non-judgmental
- Never add tasks the user didn't mention
- Prioritise ruthlessly — most items should be low/none priority
- Return only valid JSON, no prose
```

The system prompt is **application code**. Changing it requires a dedicated ADR because
it affects every user's experience uniformly.

### Layer 2 — User Prompt (data)

```
Here is my brain dump:
<user text verbatim>

Return JSON array: [{type, text, priority, tags, dueDate?}]
```

**Never mix system rules into the user prompt.** The user prompt contains only the user's
content. This separation makes prompt injection attacks much harder.

---

## Response Parsing

AI responses are text. Always parse defensively:

```js
function parseThoughts(aiText) {
  try {
    // Strip markdown fences if present
    const json = aiText.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) throw new Error("Expected array");
    return parsed.filter(t => t.text && t.type);   // drop malformed items
  } catch (e) {
    logError("parseThoughts", e, { raw: aiText.slice(0, 200) });
    return [];
  }
}
```

Never `eval()` AI responses. Never `JSON.parse()` without a try/catch.

---

## Freemium Rate Limiting

The freemium gate is enforced **before** calling `callClaude`, not inside it:

```js
import { isProUser, getDumpCount, incrementDumpCount, FREE_LIMITS }
  from "../../shared/lib/freemium.js";

const count = getDumpCount();
if (!isProUser() && count >= FREE_LIMITS.dumpsPerMonth) {
  setShowProBanner(true);
  return;
}

const result = await callClaude(prompt, { personaContext });
if (!result.error) incrementDumpCount();
```

Never call `incrementDumpCount()` if the API call fails — only charge the user for
successful AI operations.

---

## Adding a New AI Feature (Checklist)

- [ ] Identify the feature's system prompt — write it as a constant in `claude.js` or
      export it from the feature directory as `PROMPT_<NAME>.js`
- [ ] Write an ADR documenting the prompt's purpose and expected output format
- [ ] Add a freemium gate if the feature consumes credits
- [ ] Handle `result.error` with a user-facing message + `logError`
- [ ] Parse the response defensively with a try/catch
- [ ] Test with adversarial inputs (empty string, emojis-only, very long text)

---

## Prompt Change Policy

> **Any change to a system prompt requires a dedicated ADR.**

Even small wording changes can shift the AI's categorisation behaviour for all users.
Document:
- Why the change was made
- What the old prompt was
- What the new prompt is
- How the change was tested (manual test cases)

---

## Environment Variable

| Variable | Description |
|----------|-------------|
| `VITE_GEMINI_API_KEY` | Gemini API key for AI features |

Note: The codebase currently uses Anthropic's Claude API but the env var is named
`VITE_GEMINI_API_KEY` for historical reasons. Clarify in a dedicated ADR if migrating.
Never hardcode API keys in source files.
