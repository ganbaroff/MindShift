# ADR 0013 — XP Award System Architecture

**Date:** 2026-03-08
**Bolt:** 4.1 — XP & Level Up System
**Status:** Accepted

---

## Context

Bolt 4.1 required connecting the existing `PersonaCard` XP UI to real data by awarding XP for
four user activities. The spec (AC2) initially referenced `usage_limits` as the storage table.

The existing codebase (Bolt 3.1) already uses the `character_progress` table for XP storage
with working functions `sbGetCharacterProgress` and `sbUpsertCharacterProgress`.

The spec also required no new Supabase migrations (AC7).

---

## Decision

### 1. Storage: `character_progress`, not `usage_limits`

**Decision:** `sbAddXp` reads and writes to the `character_progress` table (columns: `total_xp`,
`level`, `last_review_date`), not `usage_limits`.

**Rationale:**
- `character_progress` already has the correct schema (`total_xp`, `level`) per ADR 0008
- Using `usage_limits` would require adding `persona_xp` / `persona_level` columns (migration)
- AC7 prohibits new migrations
- Consistency with existing `sbGetCharacterProgress` / `sbUpsertCharacterProgress` pattern
- Resolves AC2 vs AC7 conflict: AC2 table reference (`usage_limits`) was a spec discrepancy

### 2. XP values are fixed, activity-based (ADR 0008 compliance)

| Action | XP |
|--------|-----|
| `brain_dump_submitted` | 20 |
| `day_plan_accepted` | 15 |
| `evening_review_completed` | 25 |
| `persona_chat_message` | 5 |

XP is awarded for **doing**, not for completing tasks. This is ADHD-friendly (P2: no shame loops,
P7: no pressure). A user who reviews but deselects all brain dump items still did the activity.

### 3. Two-layer XP architecture: `sbAddXp` + `addXp` in hook

`sbAddXp(userId, xpGain)` — pure Supabase operation (read-modify-write on `character_progress`).

`addXp(xpGain)` in `useCharacterProgress` hook — optimistic update + async sbAddXp + DB reconcile.

This separation allows:
- Instant UI feedback (optimistic local state)
- Level Up toast triggers immediately (no DB round-trip latency)
- DB reconciles asynchronously (handles multi-device scenarios)

### 4. Level Up toast: `shared/ui/LevelUpToast.jsx`

Placed in `shared/ui/` because it's used by ≥ 2 features (dump, today, evening).
Uses `toastIn` keyframe from `global.css.js` — no inline `@keyframes` in component files.
Auto-dismissed via `setTimeout` in `useCharacterProgress.addXp` (2.5s).
ADHD-compliant: positive, brief, non-modal, non-pressuring.

### 5. `levelUpPayload` state in hook

`levelUpPayload: { newLevel } | null` exposed from `useCharacterProgress`.
Each feature screen renders `<LevelUpToast>` conditionally based on `levelUpPayload`.
Multiple hook instances (PersonaCard, TodayScreen, EveningScreen) are independent;
each has its own `levelUpPayload` — only the screen that awarded XP shows the toast.

### 6. Evening review: fixed 25 XP replaces variable AI `xpEarned`

The previous `awardXp(xpEarned)` used a variable value from the AI response.
Bolt 4.1 replaces this with `addXp(calcXpGain("evening_review_completed"))` = 25 XP fixed.
The AI `xpEarned` value is still displayed in the UI for flavor/personality — it's cosmetic only.

---

## Consequences

**Positive:**
- No new migrations required (AC7 satisfied)
- Consistent with ADR 0008 (activity-based XP)
- Optimistic UX: Level Up toast appears instantly, no loading state

**Negative / Known limitations:**
- `sbAddXp` does a DB read before write (two round-trips). Acceptable for MVP.
- Multiple `useCharacterProgress` instances don't share state — `PersonaCard` XP bar
  updates after remount, not immediately when XP is awarded from TodayScreen.
  (Tracked: MEMORY.md "Known tech debt — separate bolt")
- Evening AI `xpEarned` display is cosmetic and may differ from actual 25 XP awarded.
