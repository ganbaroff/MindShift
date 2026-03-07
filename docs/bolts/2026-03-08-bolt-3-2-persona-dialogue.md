# Bolt 3.2 — AI Persona Dialogue

**Date:** 2026-03-08
**Branch:** claude/bolt-3-2
**Preceding bolt:** 3.1 — Persona / Character UI (merged PR #3, SHA f11cc2d)
**ADR:** 0012 — localStorage history, hardcoded greetings, 5 msg/day

---

## Goal

Add a conversational AI layer to the persona character introduced in Bolt 3.1.
The character:
1. Greets the user on TodayScreen load with a contextual, hardcoded phrase (AC2).
2. Opens an inline chat panel when the user taps "Поговорить" / "Talk" (AC3).
3. Responds via Claude API in character, aware of archetype + level + task state (AC4).
4. Stores the last 30 messages in localStorage per user (AC5).
5. Is rate-limited to 5 AI messages/day for free-tier users (AC6).
6. Falls back to an in-character phrase when the limit is reached — silently (AC7).
7. Shows an animated typing indicator while Claude is responding (AC8).
8. Closes on Escape key and × button (AC9).

---

## Acceptance Criteria — Status

| AC | Description | Status |
|----|-------------|--------|
| AC1 | `ChatBubble.jsx` — single message bubble component | ✅ Done |
| AC2 | Auto-greeting on TodayScreen load (hardcoded, not AI) | ✅ Done |
| AC3 | "Поговорить" button → opens `ChatPanel.jsx` inline | ✅ Done |
| AC4 | Claude API system prompt with archetype + level + task context | ✅ Done |
| AC5 | Last 6 messages sent to API; 30 stored in localStorage | ✅ Done |
| AC6 | 5 AI messages/day via `persona_calls` in `usage_limits` | ✅ Done |
| AC7 | Silent in-character fallback when limit reached | ✅ Done |
| AC8 | Typing indicator (3-dot bounce; static `…` with reduced-motion) | ✅ Done |
| AC9 | ChatPanel closes on Escape + × button | ✅ Done |
| AC10 | ADR 0012 written | ✅ Done |

---

## Files Changed

### New files

| File | Lines | Purpose |
|------|-------|---------|
| `docs/migrations/006_persona_calls.sql` | 15 | Adds `persona_calls` column to `usage_limits` |
| `src/shared/lib/dialogues.js` | 259 | 36 hardcoded greeting variants + limit fallbacks |
| `src/features/today/ChatBubble.jsx` | 79 | Single message bubble (user + character) |
| `src/features/today/ChatPanel.jsx` | 270 | Full chat panel: history, typing indicator, input |
| `docs/bolts/0012-persona-dialogue-adr.md` | — | Architecture decisions for Bolt 3.2 |

### Modified files

| File | Change |
|------|--------|
| `src/shared/services/claude.js` | `callClaude` extended with `opts` param; `personaDialogue()` added (Layer 2) |
| `src/shared/services/supabase.js` | `sbGetUsage` select extended to include `persona_calls` |
| `src/shared/hooks/useUsageLimits.js` | `LIMITS.persona = 5`; `canUsePersona`, `personaLeft` added; `checkAndIncrement` handles "persona" feature |
| `src/features/today/index.jsx` | Imports + wiring: `showChat` state, `level` from `useCharacterProgress`, `chatMood`, `greeting`, greeting bubble, talk button, ChatPanel |

---

## Key Architecture Decisions

1. **ChatBubble + ChatPanel in `features/today/`** — not `features/persona/`. Vertical
   slice rule: features never import from each other. Both components are only used
   by TodayScreen. See ADR 0012 §Decision 4.

2. **localStorage-only for chat history** — not Supabase. Privacy + latency + cost.
   Key: `mf_persona_chat_{userId}`. Max 30 stored, max 6 sent to API. See ADR 0012 §Decision 1.

3. **Hardcoded auto-greetings** — not AI. Screen load must be instant, offline-safe,
   and must not burn the daily AI quota. 36 variants (3 time × 3 mood × 4 archetype)
   in EN/RU/AZ. See ADR 0012 §Decision 2.

4. **Backwards-compatible `callClaude` extension** — `opts = {}` parameter added.
   All existing callers (parseDump, generateEveningReview, aiFocusSuggest) are unaffected.
   `personaDialogue` uses `opts.system` + `opts.messages` for multi-turn conversation.

5. **Silent limit fallback** (P1 — no shame) — when 5/day limit is reached,
   `getLimitFallback(archetype, lang)` returns an in-character "going quiet" phrase.
   No "You've reached your limit" text is ever shown.

---

## ADHD Principles Compliance

| Principle | Implementation |
|-----------|---------------|
| P1 — No shame | Limit fallback is in-character, never accusatory. No "limit reached" text. |
| P6 — Warm anchor | 36 greetings are ≤ 15 words, warm, presence-affirming. |
| P7 — No pressure | No "X messages left" counter. Talk button is optional, never intrusive. |
| P12 — No countdowns | Typing indicator is transient state (not a loop the user stares at). |

---

## Database Migration Required

Run in Supabase SQL editor **after** this bolt ships:

```sql
-- docs/migrations/006_persona_calls.sql
ALTER TABLE public.usage_limits
  ADD COLUMN IF NOT EXISTS persona_calls integer DEFAULT 0;
```

No RLS changes needed — existing user_id scoping policies cover the new column.

---

## Bolt Self-Assessment

| Dimension | Score | Notes |
|-----------|-------|-------|
| AC coverage | 10/10 | All 10 ACs completed |
| ADHD principles | 10/10 | P1, P6, P7, P12 explicitly enforced |
| Architecture compliance | 10/10 | Vertical slice, no cross-feature imports, shared rule respected |
| i18n | 10/10 | All new user-visible strings in EN/RU/AZ |
| Code quality | 9/10 | ChatPanel is self-contained; minor: `useCharacterProgress` called twice (PersonaCard + TodayScreen) |
| ADR completeness | 10/10 | All 4 decisions documented with alternatives |
| **Total** | **59/60** | |

**One minor note:** `useCharacterProgress(user)` is now called both inside `PersonaCard`
and in `TodayScreen` (to get `level` for ChatPanel). This results in 2 identical
Supabase reads on mount. The correct future resolution is to hoist `useCharacterProgress`
to TodayScreen and pass `level` + `totalXp` as props to PersonaCard — but that requires
a PersonaCard prop interface change, which is a `shared/ui/` modification requiring its
own bolt. Acceptable technical debt for Bolt 3.2.
