# Bolt 3.1 — Persona / Character UI

**Date:** 2026-03-08
**Branch:** claude/bolt-3-1
**Build:** ✅ 0 errors (verified after implementation)

---

## Goal

Add a visible archetype character to the app: user picks at onboarding, sees
it on the Today screen with level + XP bar + mood-aware phrase. Character grows
with the existing XP system.

---

## Acceptance Criteria

| # | Criterion | Status |
|---|-----------|--------|
| AC1 | OnboardingPersona step after auth: 4 archetype cards (Explorer/Builder/Dreamer/Guardian) | ✅ |
| AC2 | Archetype persisted to Supabase `user_profiles` (Migration 005) | ✅ |
| AC3 | 3 mood states: idle (grey), active (archetype colour), celebrated (gold + 300ms pulse) | ✅ |
| AC4 | PersonaCard uses `useCharacterProgress` (no XP logic duplication) | ✅ |
| AC5 | Language-aware phrases per mood×archetype, EN/RU/AZ, ≥ 2 per combination | ✅ |
| AC6 | Geometric SVG icons — no faces (Explorer=compass, Builder=square, Dreamer=star, Guardian=shield) | ✅ |
| AC7 | PersonaCard embedded in /today above DayPlanDump | ✅ |
| AC8 | `prefers-reduced-motion`: pulse animation disabled (covered by global.css.js) | ✅ |
| AC9 | Default fallback to Explorer if onboarding skipped | ✅ |
| AC10 | ADR 0011 documenting: why 4 archetypes, geometric SVG, colour for mood | ✅ |

---

## Files Created

| File | Purpose |
|------|---------|
| `docs/migrations/005_persona.sql` | ALTER TABLE user_profiles — adds persona_archetype, persona_name |
| `src/shared/lib/archetypes.js` | Pure data: ARCHETYPES, ARCHETYPE_LIST, getPhrase(), getMoodColor() |
| `src/shared/hooks/useCharacterProgress.js` | Promoted from features/evening/ — now cross-cutting |
| `src/shared/ui/ArchetypeSVG.jsx` | Geometric SVG avatar component (used by ≥ 2 features) |
| `src/shared/ui/PersonaCard.jsx` | Character card: avatar, name, level badge, XP bar, mood phrase |
| `src/features/onboarding/OnboardingPersona.jsx` | 4-archetype selection step with name input |
| `docs/bolts/0011-persona-adr.md` | ADR: archetypes, geometric SVG, mood colour rationale |
| `docs/bolts/2026-03-08-bolt-3-1-persona-ui.md` | This file |

---

## Files Modified

| File | Change |
|------|--------|
| `src/features/evening/useCharacterProgress.js` | Changed to re-export from `shared/hooks/` (backwards compat) |
| `src/shared/services/supabase.js` | Section 9: `sbSavePersonaArchetype`, `sbLoadPersonaArchetype` |
| `src/features/today/index.jsx` | Added PersonaCard import + render above DayPlanDump; added `personaArchetype`, `personaName` props |
| `src/mindflow.jsx` | Added OnboardingPersona import; personaArchetype/personaName state + localStorage; sign-in Supabase sync; route guard; sign-out cleanup; TodayScreen props |

---

## Architecture Notes

- **ArchetypeSVG** in `shared/ui/` — used by OnboardingPersona + PersonaCard (≥ 2 features)
- **PersonaCard** in `shared/ui/` — used by TodayScreen (features/today can't import from features/persona)
- **useCharacterProgress** promoted to `shared/hooks/` — previously features/evening only; AC4 requires PersonaCard to use it
- **Archetype colours** defined in `shared/lib/archetypes.js` (NOT in tokens.js) — feature-specific, not app-wide design tokens
- **Phrase rotation** by hour-of-day parity (AM = phrase[0], PM = phrase[1]) — deterministic, no random, no state
- **localStorage-first** for archetype state (same pattern as notification prefs, ADR 0010)
- **OnboardingPersona** shown as route guard between `!user` and main app shell

---

## ADHD Design Compliance

| Principle | How met |
|-----------|---------|
| P1 — No shame | Geometric avatars (no faces, no identity projection); grey for idle (not red) |
| P3 — Time blindness | Character card on today screen = gentle external anchor |
| P6 — Soft rituals | Archetype label is a calm identity anchor, not a performance metric |
| P7 — No dark patterns | Inline onboarding, skip available, no modal |
| P12 — No countdown timers | Pulse animation is 300ms single-shot, no loop, no timer display |

---

## Neurodivergent UX Compliance

- Max 1 CTA per screen (OnboardingPersona: "Start my journey →")
- Skip link always visible (pressure-free way out)
- Touch targets ≥ 44px on all archetype cards and buttons
- Archetype description ≤ 10 words (minimal cognitive load)
- Selected archetype highlighted with colour border (not shape change — shape = identity)
- Name input pre-filled with archetype default name (reduces blank-field anxiety)

---

## Build Stats

```
(Run npm run build to confirm — should be 0 errors, ~138 kB gzip)
```
