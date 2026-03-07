# ADR 0012 — AI Persona Dialogue: localStorage history, hardcoded greetings, 5 msg/day

**Date:** 2026-03-08
**Bolt:** 3.2 — AI Persona Dialogue
**Status:** Accepted

---

## Context

Bolt 3.2 adds a conversational UI on TodayScreen: the archetype character speaks a
greeting on load (AC2) and the user can open a chat panel to talk to the character
in persona via Claude API (AC3–AC9). Three architectural decisions required:

1. Where to store chat history?
2. Why are auto-greetings hardcoded, not AI-generated?
3. What is the right daily message limit?
4. Where do ChatBubble and ChatPanel live in the feature tree?

---

## Decision 1: localStorage-only for chat history (AC5)

**Key:** `mf_persona_chat_{userId}` — stores last 30 messages max (client-side cap).
**Only last 6 messages** are sent to the Claude API per request.

### Why localStorage, not Supabase

| Concern | localStorage | Supabase |
|---------|-------------|---------|
| Privacy | Private to device — conversation not on server | Persisted to cloud, visible in DB |
| Latency | Synchronous, instant | Async round-trip on mount |
| Cost | Free | DB storage + bandwidth cost at scale |
| Cross-device | No sync | Full sync |
| Complexity | 5 lines | Requires table, RLS policy, migration |
| ADHD P1 (no shame) | User controls their own history | Admin or breach exposes personal therapy-like data |

**Decision:** localStorage is the correct tier for this data. The conversation is
ephemeral emotional support content — not operational data like thoughts or tasks.
Cross-device sync is a nice-to-have, not a requirement for MVP.

If cross-device sync is required in future: migrate to encrypted Supabase column
behind a "sync my conversations" toggle (user opt-in). The localStorage key
`mf_persona_chat_{userId}` is already scoped by user ID, so migration is
straightforward.

### Why 6 messages for API context

- Claude API context window is not the constraint (200k tokens).
- **Cost:** Each dialogue call should be cheap. 6 messages ≈ 500 tokens input.
- **ADHD P7:** Character should respond to the _current_ conversation, not an
  hour-old context. Short context keeps responses focused and relevant.
- **Privacy:** Minimise the personal content sent per API call.
- **Round number:** Easy to reason about ("last 3 exchanges").

### Why 30 messages stored client-side

- User can scroll back to see their recent conversation (UX value).
- 30 messages ≈ 4–5 KB JSON — negligible localStorage impact.
- The 30-message store vs 6-message API context is intentional: rich local history,
  focused API payload.

---

## Decision 2: Hardcoded auto-greetings (AC2)

`shared/lib/dialogues.js` contains 36 greeting variants:
3 time periods × 3 mood states × 4 archetypes. Each in EN/RU/AZ.

### Why NOT AI-generated greetings

| Concern | Hardcoded | AI-generated |
|---------|-----------|-------------|
| Latency | Instant (synchronous) | 1–3s API call on screen load |
| Cost | Free | 1 API call per TodayScreen load |
| ADHD P12 (no spinners) | No loading state needed | Screen load creates a spinner or delay |
| Reliability | Always available, even offline | Fails if API is down |
| Tone control | Exact phrases reviewed by team | Probabilistic, may drift in tone |
| Daily limit | Doesn't consume the 5/day quota | Would burn quota before user initiates |

**Decision:** Auto-greetings are hardcoded. The greeting is a screen anchor phrase,
not a dynamic AI response. Warmth and reliability matter more than variety here.

### Why 36 variants (not fewer)

- 3 time periods (morning / afternoon / evening): ensures contextually appropriate tone
  (e.g., no "good morning" at 9 PM).
- 3 moods: the greeting acknowledges the user's state without tracking or judging it.
  - `idle` — no tasks yet; `active` — tasks in progress; `celebrated` — all done
- 4 archetypes: each character has a distinct voice.

Result: 36 branches. Each phrase is ≤ 15 words (ADHD P6: short, low-cognitive-load).

---

## Decision 3: 5 AI messages per UTC day (AC6)

Free tier limit for `personaDialogue` calls.

### Why 5 (not 3, not 10)

| Limit | Reasoning |
|-------|-----------|
| 3 | Too restrictive for a meaningful conversation (3 exchanges = 1.5 turns) |
| **5** | Enough for one meaningful conversation (~2–3 exchanges); aligns with "enough to feel supported" |
| 10 | Too generous for free tier; Claude API cost per user becomes significant |
| Unlimited | No free-tier gate; unacceptable at scale |

**5 messages = approximately one support exchange per day.** This is the ADHD sweet
spot: low pressure (not "only 1!"), enough to feel real (not too brief), still
monetisable (Pro removes the limit).

### How the limit works

- Tracked via `usage_limits.persona_calls` column (migration 006).
- `sbCheckAndIncrementUsage(userId, date, "persona_calls", 5)` — atomic increment.
- Reset daily at UTC midnight (same as other limits, ADR 0009).
- Limit reached → `getLimitFallback(archetype, lang)` — in-character fallback phrase.
- **No "limit reached" message is ever shown** (ADHD P1: no shame, no gatekeeping
  feeling). The character just "goes quiet" gracefully.

### Why the limit fallback is in-character

Showing "You've reached your daily limit" is:
1. **Shame-inducing** (P1): implies the user consumed too much.
2. **Anxiety-triggering** (P7): framing of scarcity creates urgency.
3. **Trust-breaking** (P6): the character suddenly becomes a paywall, not a friend.

The in-character fallback (`"Still here. Taking a quiet moment."`) maintains the
illusion and the emotional safety of the interaction. The Pro upsell, if any, happens
separately in Settings — never inside the character dialogue.

---

## Decision 4: ChatBubble and ChatPanel in `features/today/` (not `features/persona/`)

### The conflict

AC1 in the Bolt 3.2 spec mentioned `features/persona/` as the target directory.
However, the architecture rule is:

> **Features never import from each other.**

ChatBubble and ChatPanel are consumed exclusively by TodayScreen
(`features/today/index.jsx`). If they were placed in `features/persona/`, TodayScreen
would import from a sibling feature — a direct violation of the vertical slice rule.

### Resolution

ChatBubble and ChatPanel belong in `features/today/` because:
1. They are only used by TodayScreen.
2. They are not shared with any other feature.
3. Moving them to `shared/ui/` would be wrong — `shared/ui/` is for components used
   by ≥ 2 features.
4. A hypothetical future `features/persona/` screen (e.g., persona management) would
   get its own chat UI if needed, or import from `shared/ui/` at that point.

**Vertical slice rule prevails over spec wording.**

---

## Implementation Summary

| File | Role |
|------|------|
| `src/shared/lib/dialogues.js` | 36 greetings + limit fallbacks (pure data) |
| `src/shared/services/claude.js` | `personaDialogue()` + `callClaude` opts extension |
| `src/shared/services/supabase.js` | `sbGetUsage` extended for `persona_calls` |
| `src/shared/hooks/useUsageLimits.js` | `canUsePersona`, `personaLeft`, `checkAndIncrement("persona")` |
| `src/features/today/ChatBubble.jsx` | Single message bubble (user + character) |
| `src/features/today/ChatPanel.jsx` | Full chat panel (history, input, typing indicator) |
| `src/features/today/index.jsx` | Wired: greeting bubble, talk button, ChatPanel |
| `docs/migrations/006_persona_calls.sql` | `persona_calls` column on `usage_limits` |

---

## Alternatives Considered

| Option | Rejected Reason |
|--------|----------------|
| Supabase for chat history | Privacy; latency; complexity; cost |
| AI-generated greetings | Latency on screen load; burns daily quota; offline-unsafe |
| Limit of 3/day | Too few for a meaningful conversation |
| Limit of 10/day | API cost too high for free tier |
| Show "limit reached" banner | Shame-inducing (P1); breaks character immersion |
| ChatBubble in `features/persona/` | Violates feature isolation rule |
| Framer Motion for typing indicator | Not installed; CSS keyframe is sufficient |
| Modal for ChatPanel | ADHD P7 — inline is less disruptive; no focus trap needed |
