# ADR 0011 — Persona / Character UI: Archetypes, Geometric SVG, Mood Colours

**Date:** 2026-03-08
**Bolt:** 3.1 — Persona / Character UI
**Status:** Accepted

---

## Context

MindFocus has an XP / level system (ADR 0008) and an AI persona system (shared/lib/persona.js). For Bolt 3.1 we add a *visible character* to the experience: each user picks an archetype at onboarding and sees their character card on the Today screen. The character grows with the user's XP. Three design decisions needed:

1. How many archetypes, and which ones?
2. What visual form should the avatar take?
3. How do we communicate mood / state change visually?

---

## Decision 1: 4 archetypes (Explorer / Builder / Dreamer / Guardian)

### Why 4, not more

- **Cognitive load (ADHD P7):** Choosing from > 4 options without meaningful distinction triggers decision paralysis in ADHD users.
- **Coverage without overlap:** The quartet covers the four dominant cognitive-motivational styles observed in neurodivergent productivity research — novelty-seeking, task-structured, creative, and sustaining.
- **Pairing:** 4 fits a 2×2 grid (mobile-first) without needing scroll or pagination.

### Why these 4

| Archetype | Motivation style | ADHD trait served |
|-----------|-----------------|------------------|
| Explorer  | Curiosity-driven, lateral thinking | Hyperfocus on new ideas |
| Builder   | Goal-directed, methodical | Need for structure + visible progress |
| Dreamer   | Imagination-first, possibility space | Generative thinking, idea capture |
| Guardian  | Steadiness, protecting priorities | Task prioritisation, anti-overwhelm |

### Rejected: personality test / quiz approach

A quiz (e.g., "3 questions to find your archetype") adds friction and feels clinical.
Direct choice of 4 named archetypes is faster and gives the user full agency. Per
ADHD P7 (no dark patterns), friction must be minimal at onboarding.

---

## Decision 2: Geometric SVG avatars (no faces, no human forms)

### Why NOT human/animal avatars

- **Identity projection risk:** Human or animal faces invite comparison and can trigger shame in users who don't "identify" with the character. ADHD users are particularly susceptible to shame loops (P1 — no shame).
- **No facial representation = no exclusion:** Geometric shapes are culturally neutral and don't carry gender, ethnicity, or body-type associations.
- **Inline SVG = zero asset requests:** No image files, no CDN, no alt-text burden. SVG scales perfectly on all densities.

### SVG shape design rationale

| Archetype | Shape | Semantic meaning |
|-----------|-------|-----------------|
| Explorer  | Circle + compass cross + centre dot | Compass rose, navigation, open horizon |
| Builder   | Square + diagonal | Construction grid, precision, structure |
| Dreamer   | 4-pointed star | Light, imagination, possibility |
| Guardian  | Shield pentagon | Protection, steadiness, perimeter |

All shapes use `stroke` only (no fill except the compass dot). This ensures they
read as outlines — sketch-like, not "finished" — matching the app's minimal dark aesthetic.

### SVG component placement

`shared/ui/ArchetypeSVG.jsx` — used by ≥ 2 features (OnboardingPersona + PersonaCard).
Per architecture rule, shared UI in `shared/ui/`, not in `features/`.

---

## Decision 3: Colour for mood states (not shape changes)

### Three mood states

| Mood       | Ring colour       | Usage |
|------------|------------------|-------|
| `idle`     | #888888 (grey)    | Character is resting (app not in active use) |
| `active`   | Archetype colour  | User is actively using the app |
| `celebrated` | #FFD700 (gold)  | XP awarded / milestone reached |

### Why colour, not shape

- Shape is already used as the archetype's identity — changing it on mood change would destroy the avatar's recognisability.
- Colour is faster to read, lower cognitive effort.
- The ring (border on the avatar container) changes colour — subtle, not jarring. Avoids re-drawing the SVG.

### Why 300ms pulse for `celebrated`, not a long animation

- ADHD P12: no countdown timers. Avoid looping animations.
- ADHD P7: no jarring interruptions. The pulse is brief (300ms) and auto-clears.
- `prefers-reduced-motion`: global.css.js disables all keyframes; PersonaCard's scoped
  `personaPulse` keyframe is covered by the global `* { animation: none }` rule in the
  `@media (prefers-reduced-motion: reduce)` block.

---

## Decision 4: localStorage-first for archetype persistence

localStorage is the primary store; Supabase (`user_profiles.persona_archetype`) is
background sync. This is the same pattern as notification preferences (ADR 0010):

- Zero-latency on load (synchronous initialiser in useState)
- No auth dependency during initial render
- Cross-device sync happens in the sign-in effect (loads from Supabase if localStorage is empty)
- Trade-off: if user clears browser storage, they see OnboardingPersona again (acceptable — it's a 10-second flow)

---

## Decision 5: OnboardingPersona shown after auth (not before)

The archetype screen appears after `!user` auth check but before the main app shell.
This means:
- User is authenticated before choosing archetype (Supabase save is safe)
- Archetype is always associated with a real user_id
- Skip option defaults to Explorer (AC9) — lowest friction

---

## Decision 6: useCharacterProgress promoted to shared/hooks/

`features/evening/useCharacterProgress.js` was the canonical location in Bolt 2.4.
In Bolt 3.1, PersonaCard (in `shared/ui/`) also needs XP data.
Per architecture rule: features cannot cross-import, and shared/ui cannot import from features/.

Promotion to `shared/hooks/useCharacterProgress.js` is the correct resolution.
The old file becomes a single-line re-export for backwards compatibility.

---

## Implementation

- Archetypes data: `src/shared/lib/archetypes.js` (pure, no React)
- SVG component: `src/shared/ui/ArchetypeSVG.jsx`
- Hook: `src/shared/hooks/useCharacterProgress.js` (promoted)
- PersonaCard: `src/shared/ui/PersonaCard.jsx`
- Onboarding step: `src/features/onboarding/OnboardingPersona.jsx`
- DB migration: `docs/migrations/005_persona.sql`
- Supabase functions: Section 9 of `shared/services/supabase.js`
- App wiring: `src/mindflow.jsx` (state + route guard + TodayScreen props)

---

## Alternatives Considered

| Option | Rejected Reason |
|--------|----------------|
| 8 archetypes | Decision fatigue for ADHD users; 4 is the cognitive limit |
| Human/animal avatars | Identity projection risk; shame loops (P1) |
| Animated SVG for mood | Too distracting; shape = identity, should not change |
| Framer Motion for pulse | Not installed; CSS keyframe is sufficient and lighter |
| Supabase-first for archetype | Latency on first render; localStorage is synchronous |
| Modal for onboarding | ADHD P7 — inline single-screen is less disruptive |
| Long pulse animation (1s+) | ADHD P12 — no extended animations; 300ms is satisfying and fast |
