# Bolt 2.4 — Evening Review + Character Progress

**Date:** 2026-03-07
**Branch:** claude/romantic-archimedes
**Status:** ✅ Complete

---

## Goal

Replace the old EveningScreen (mood picker + basic AI text) with a full evening ritual:
daily task list review, optional note, AI reflection, XP award, character progress card.
Time-gated to 16:00 local time. No streaks, no shame, no completion-based scoring.

---

## Acceptance Criteria — All Passed ✅

| # | Criterion | Status |
|---|-----------|--------|
| AC1 | `/review` tab available from 16:00 local time | ✅ `handleNavChange` in `mindflow.jsx` — toast if before 16:00 |
| AC2 | Task list: completed ✓ green, incomplete neutral grey — no red | ✅ `TaskRow`: `C.done` / `C.textSub` 35% opacity |
| AC3 | "Как прошёл день?" → Claude API | ✅ `handleGenerate` → `generateEveningReview` |
| AC4 | AI gets: tasks, optional note, activity signals | ✅ Prompt includes doneTasks, pendingTasks, plannedCount, noteWritten |
| AC5 | AI returns: reflection (2-3 sentences) + xpEarned (10–50) | ✅ JSON `{ reflection, xp_earned }`, clamped [10, 50] on client |
| AC6 | XP saved to Supabase `character_progress` table | ✅ `sbUpsertCharacterProgress` called on "Save the day" |
| AC7 | Level = floor(total_xp / 100) + 1, shown as "Уровень N" | ✅ `CharacterCard` + `sbUpsertCharacterProgress` recomputes level |
| AC8 | +XP animation on award | ✅ CSS `@keyframes xpFloat` in `CharacterCard` — inline `<style>` |
| AC9 | No streaks anywhere | ✅ Zero streak references; old `reviews` table still used for history but not shown |
| AC10 | ADR: XP formula documented | ✅ `docs/bolts/0008-evening-xp-formula.md` |

---

## Files Created

| File | Lines | Purpose |
|------|-------|---------|
| `docs/migrations/003_character_progress.sql` | 52 | Table + RLS + updated_at trigger |
| `src/features/evening/useCharacterProgress.js` | 72 | Hook: load/update XP, level computation |
| `src/features/evening/CharacterCard.jsx` | 115 | Level badge, XP bar, +xp float animation |
| `docs/bolts/0008-evening-xp-formula.md` | ADR | XP formula: activity-based, not completion-based |

## Files Modified

| File | Change |
|------|--------|
| `src/features/evening/index.jsx` | Full rewrite: daily task list, note, AI flow, CharacterCard integration |
| `src/shared/services/claude.js` | `generateEveningReview` → `{ reflection, xpEarned }` (was `string`) |
| `src/shared/services/supabase.js` | + `sbGetCharacterProgress`, `sbUpsertCharacterProgress` |
| `src/mindflow.jsx` | `handleNavChange` time-gate; `onChange={handleNavChange}`; `EveningScreen` drops `thoughts` prop |

---

## Architecture

### Time-gate without skeleton modification
`handleNavChange` in `mindflow.jsx` intercepts clicks on "evening" before 16:00.
Shows informational toast. `BottomNav` (skeleton) is untouched — no ADR required.
The tab is always visible (ADHD-friendly: user knows the feature exists all day).

### XP formula (ADR 0008)
Activity-based, not completion-based:
- +10 base (showed up for evening review)
- +10 if day plan existed (plannedCount > 0)
- +10 if any task completed
- +10 if note written
- +10 for requesting AI reflection (always, since button was pressed)

Computed client-side before AI call. AI receives the calculated value in the prompt and is
asked to "confirm" it. Client clamps to [10, 50] regardless. If AI parse fails, client value used.

### generateEveningReview breaking change
Old signature: `(doneItems, missedItems, lang, persona) → Promise<string>`
New signature: `(doneItems, missedItems, lang, persona, activity) → Promise<{ reflection, xpEarned }>`

EveningScreen was fully rewritten in the same bolt — no other callers.

### CharacterCard animation
Inline `<style>` tag with `@keyframes xpFloat` — scoped to the component.
Not added to `skeleton/design-system/global.css.js` (that's a skeleton file requiring ADR).
`xpEarned` prop drives a `useEffect` → 2.2s animation → auto-hide.

---

## ADHD/Neurodivergent UX Compliance

| Principle | Applied |
|-----------|---------|
| P1: No shame / no diagnoses | ✅ Incomplete tasks: neutral grey, no red, no "failed" language |
| P2: No shame-loops, no streaks | ✅ Zero streak references; XP is permanent, no decay |
| P7: No addiction mechanics | ✅ XP formula is deterministic, no variable rewards |
| P9: Ethical gamification | ✅ XP rewards showing up, not completing X% of tasks |
| P10: Touch targets ≥44px | ✅ All buttons `minHeight: 48` |
| P12: Data transparency | ✅ XP amount shown explicitly in UI before saving |

---

## Build Stats

```
dist/assets/index-DeSouVFU.js  467.64 kB │ gzip: 136.23 kB
✓ built in 899ms
```

Previous (Bolt 2.3): 134.33 kB gzipped.
Delta: +1.90 kB — 2 new components + hook + supabase/claude additions.

---

## Sprint Report

### Completed this bolt
- `003_character_progress.sql` — table, RLS, trigger (idempotent `CREATE OR REPLACE`)
- `useCharacterProgress` — load on mount, optimistic `awardXp`, INVARIANT 7 compliant
- `CharacterCard` — level badge, XP bar with CSS transition, `xpFloat` animation
- `generateEveningReview` rewritten — JSON output `{ reflection, xp_earned }`, defensive parsing, fallback
- `EveningScreen` rewritten — loads `daily_tasks` self-contained, no `thoughts` prop dependency
- `handleNavChange` — time-gate for evening tab without modifying skeleton
- ADR 0008 — XP formula rationale documented
- Build passes: 136.23 kB gzip, 0 errors

### Known limitations
- Old `reviews` table (from Bolt 1.5) is no longer written to — character_progress replaces it for XP tracking. History of old reviews is not shown in the new UI (clean break).
- Evening review can only be saved once per session (state-based); refreshing allows a second save (acceptable for MVP).
- Time-gate is client-side only — user can access via direct URL; that's acceptable (no data integrity risk).
- `VITE_ANTHROPIC_API_KEY` still client-exposed — tracked in `.env.example`.

### Migration to run in Supabase
```sql
-- docs/migrations/003_character_progress.sql
```

### Next recommended bolt
**Bolt 2.5 — Freemium gate for AI features** (parseDayPlan + generateEveningReview) or
**Bolt 2.6 — Push notifications (morning + evening reminders)**
