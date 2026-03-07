# Dump Feature — Spec

## Problem

People with ADHD have too many thoughts competing for attention. A "brain dump" externalises them all at once, reducing cognitive load. The AI structures the raw stream into actionable items so the user doesn't have to do it manually.

## Scope of Sprint 1 Bolt

Extract `DumpScreen` and all dump-specific logic from `src/mindflow.jsx` into this folder. No new features — pure structural migration.

## Functional Requirements

- User can type or paste any text (any language, any format) into a textarea
- User submits the dump (button or Cmd/Ctrl+Enter)
- AI parses the text into structured thought items (type, priority, tags, reminderAt, recurrence)
- AI returns a 1–2 sentence warm acknowledgement and optionally asks ONE clarifying question
- Parsed thoughts appear as cards, which the user can edit before saving
- User can re-process an edited dump
- Freemium gate: 30 AI dumps/month for free users; unlimited for Pro

## Acceptance Criteria

```gherkin
Scenario: User submits a brain dump
  Given an authenticated or unauthenticated user on the Dump screen
  When they type text and press the submit button
  Then a loading indicator appears
  And the AI returns structured thought cards within 10 seconds
  And a warm response message is shown below the input

Scenario: AI parse timeout
  Given the user submits a dump
  When the Anthropic API does not respond within 10 seconds
  Then the timeout error is shown clearly
  And the user's raw text is preserved in the textarea

Scenario: Free user hits monthly limit
  Given a free user who has used 30 AI dumps this month
  When they try to submit a dump
  Then the ProBanner is shown with reason="dumps"
  And the dump is NOT processed

Scenario: User edits a parsed thought
  Given thought cards are displayed
  When the user edits a card's text or type
  Then the change is reflected immediately in state
  And saved to Supabase if sync is enabled
```

## Non-Functional Requirements

- AI response time: ≤ 10s (enforced by AbortController timeout)
- Works offline: raw text preserved in localStorage if no connection
- Works without auth: thoughts stored in localStorage until user logs in
- Touch targets ≥ 44px
- Textarea input debounced at 300ms for autosave
- Error messages in current UI language (EN/RU/AZ)

## Files in This Slice

```
src/features/dump/
├── index.jsx          ← DumpScreen component (migrated from mindflow.jsx)
├── dump.api.js        ← parseDump(), thought CRUD wrappers
├── spec.md            ← this file
└── README.md          ← one-paragraph feature description
```

## Dependencies

- `src/shared/services/claude.ts` → `parseDump()`
- `src/shared/services/supabase.ts` → `sbPushThought()`, `sbPullThoughts()`
- `src/shared/lib/uid.ts` → `uid()`
- `src/skeleton/design-system/tokens.ts` → `C`
- `src/shared/ui/ThoughtCard` → card rendering (to be extracted)
