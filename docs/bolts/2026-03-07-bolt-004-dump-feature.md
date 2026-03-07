# Bolt 2026-03-07-004 — DumpScreen extraction (Bolt 1.3)

- **Date:** 2026-03-07
- **Owner:** Claude Code (claude/romantic-archimedes)
- **Feature:** dump
- **Sprint:** 2026-Q1-Sprint-1
- **Goal:** Extract `DumpScreen` and all dump-specific logic from `src/mindflow.jsx` into `src/features/dump/` and `src/shared/ui/` — first vertical slice, pure structural migration, zero logic changes.

---

## Plan

1. Create `src/shared/ui/ThoughtCard.jsx` — `ClarifyInline` + `ThoughtCard` (used by DumpScreen & TodayScreen)
2. Create `src/features/dump/dump.api.js` — validated `parseDump()` wrapper (separates AI-call logic from UI)
3. Create `src/features/dump/index.jsx` — `VoiceBtn` (dump-only) + `DumpScreen`
4. Update `mindflow.jsx` — remove extracted blocks, update imports, tombstone comments
5. `npm run build` — verify zero errors

---

## Changes

**Files created:**

- `src/shared/ui/ThoughtCard.jsx`
  - `ClarifyInline` (internal, not exported) — inline answer widget for AI clarification questions
  - `ThoughtCard` (named export, memo) — full thought card with swipe-to-done, priority bar, tags, recurrence badge, reminder time
  - Imports: `C`, `P_COLOR` (tokens), `T` (i18n), `Icon`, `TYPE_CFG`

- `src/features/dump/dump.api.js`
  - `parseDump(text, lang, persona)` — wraps `_parseDump` from `services/claude.js` with type/priority/tags validation, empty-result fallback to single note
  - Moved from: inline logic in `DumpScreen.process()` (mindflow.jsx lines 993–1009)

- `src/features/dump/index.jsx`
  - `VoiceBtn` — internal component (Web Speech API, not exported, dump-only)
  - `Spinner` — local mini copy for the submit button (identical to the one in mindflow.jsx)
  - `DumpScreen` (named export) — full dump screen: textarea input, process button, filters, tag chips, thought list
  - Imports: `dump.api.js`, `ThoughtCard`, all shared modules + `logError`

**Files modified:**

- `src/mindflow.jsx` — 1865 lines (was 2384 before Bolt 1.3, was 2382 after Bolt 1.4)
  - Removed `ClarifyInline` (lines 674–719)
  - Removed `ThoughtCard` memo (lines 721–901)
  - Removed `VoiceBtn` (lines 906–948)
  - Removed `DumpScreen` (lines 950–1193)
  - Total removed: ~520 lines
  - Added imports: `DumpScreen` from `./features/dump/index.jsx`, `ThoughtCard` from `./shared/ui/ThoughtCard.jsx`
  - Removed `parseDump` from `./shared/services/claude.js` import (now internal to dump.api.js)
  - Updated tombstone comment for AI section

---

## Decisions

- **`ThoughtCard` → `shared/ui/`** not `features/dump/` — used by both DumpScreen and TodayScreen (line 791). Moving to shared avoids circular deps.
- **`ClarifyInline` co-located inside `ThoughtCard.jsx`** — only ever rendered inside a ThoughtCard, no value in a separate file.
- **`VoiceBtn` stays inside `features/dump/index.jsx`** — only used in DumpScreen, not shared. No need for a separate file.
- **`Spinner` duplicated locally** in `features/dump/index.jsx` — the shared one in mindflow.jsx isn't exported. Acceptable duplication until shared/ui gets a proper Spinner.
- **`parseDump` removed from mindflow.jsx imports** — it's now fully encapsulated inside dump.api.js. mindflow.jsx no longer needs direct AI client access for dumping.
- **`useRef` for `recRef`** in VoiceBtn — original used `useRef`; initial draft accidentally used `{ current: null }`, fixed before build.

---

## Testing

- [x] Build: `npm run build` — ✅ 87 modules, 0 errors
- [x] `grep -n "function DumpScreen\|const ThoughtCard\|function VoiceBtn\|function ClarifyInline" src/mindflow.jsx` → 0 results
- [x] `grep -n "DumpScreen\|ThoughtCard" src/mindflow.jsx` → imports at lines 18-19, usage at lines 791 and 1778
- [x] Line count: mindflow.jsx 2384 → 1864 (−520 lines from this bolt)

**Status:** ✅ Passed

---

## Risks / Tech Debt

- `Spinner` duplicated in `features/dump/index.jsx` and `mindflow.jsx` — extract to `shared/ui/Spinner.jsx` in a future bolt
- `ThoughtCard` still receives `onUpdate` but doesn't call it in all cases (pre-existing) — not introduced here
- TodayScreen (still in mindflow.jsx) also uses `ThoughtCard` — will be resolved in Bolt 1.5 (TodayScreen extraction)

---

## Summary for Next Agent

`src/features/dump/` is the first complete vertical slice:
- `dump.api.js` — domain-level parseDump with validation
- `index.jsx` — full DumpScreen + VoiceBtn

`src/shared/ui/ThoughtCard.jsx` is live and used by both DumpScreen and TodayScreen.

`mindflow.jsx` is now 1864 lines (from 2914 at sprint start, −1050 total across Bolts 1.2, 1.3, 1.4).

**Continue with:** Bolt 1.5 — extract `TodayScreen` to `src/features/today/`, or Bolt 1.6 — extract `EveningScreen`.
