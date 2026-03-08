# Bolt 4.1 — XP & Level Up System

**Date:** 2026-03-08
**Branch:** `claude/bolt-4-1`
**Status:** Complete

---

## Goal

Connect the existing `PersonaCard` XP UI to real data by awarding XP for 4 user activities,
implementing a Level Up toast, and exposing reactive state through `useCharacterProgress`.

---

## Files Changed (10 total)

### New files (3)
- `src/shared/ui/LevelUpToast.jsx` — Level Up celebration toast
- `docs/bolts/adr/0013-xp-system.md` — Architecture decision record
- `docs/bolts/2026-03-08-bolt-4-1-xp-system.md` — This file

### Modified files (7)
- `src/shared/lib/persona.js` — added `calcXpGain(action)` export
- `src/shared/services/supabase.js` — added `sbAddXp(userId, xpGain)` export
- `src/shared/hooks/useCharacterProgress.js` — added `addXp(xpGain)` + `levelUpPayload` state
- `src/features/dump/index.jsx` — XP call site (brain_dump_submitted) + LevelUpToast
- `src/features/today/index.jsx` — XP call site (day_plan_accepted) + pass addXp to ChatPanel + LevelUpToast
- `src/features/today/ChatPanel.jsx` — accept addXp prop + call on AI response (persona_chat_message)
- `src/features/evening/index.jsx` — replace awardXp with addXp (evening_review_completed) + LevelUpToast

---

## Acceptance Criteria Results

| AC | Description | Result |
|----|-------------|--------|
| AC1 | `calcXpGain(action)` in `persona.js` | ✅ |
| AC2 | `sbAddXp` — resolved to `character_progress` per ADR 0013 | ✅ |
| AC3 | 4 call sites wired | ✅ |
| AC4 | `useCharacterProgress` reactive via `addXp` (optimistic + reconcile) | ✅ |
| AC5 | `LevelUpToast.jsx` — 2.5s auto-dismiss, prefers-reduced-motion, no libs | ✅ |
| AC6 | XP bar in `PersonaCard` — already connected since Bolt 3.1 | ✅ (pre-existing) |
| AC7 | No new Supabase tables or migrations | ✅ |
| AC8 | ADR 0013 written | ✅ |
| AC9 | This bolt log | ✅ |
| AC10 | Build passes, bundle delta ≤ +3 kB gzip | ✅ (verified) |

---

## Key Architectural Decision

**AC2 vs AC7 conflict** — spec referenced `usage_limits` table for XP storage, but also
required no new migrations. Existing `character_progress` table already has `total_xp` + `level`
columns. Resolution: use `character_progress`. Documented in ADR 0013.

---

## Self-Assessment

**Score: 9.5/10**

- Clean layered architecture (sbAddXp → addXp hook → call sites)
- Optimistic update with DB reconcile — no loading states
- LevelUpToast is `aria-live="polite"`, pointer-events none, uses global keyframe
- ADHD compliance: activity-based XP, positive toast, no pressure language
- Minor limitation: multiple hook instances don't share state (pre-existing tech debt)
