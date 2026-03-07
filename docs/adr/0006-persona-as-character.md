# [0006] Persona as AI Character (not Analytics)

- **Status:** Accepted
- **Date:** 2026-03-07
- **Owner:** Yusif Ganbarov
- **Related:** Bolt 1.1, ADR 0003 (AI provider), `src/features/persona/`

## Context and Problem Statement

The `personas` table and the `buildPersonaContext()` function currently track behavioural statistics (top tags, completion rate, active hours). This is useful but insufficient for the product's core differentiator: a **personal AI character** that the user builds a relationship with over time. A decision is needed on what "persona" means architecturally — analytics object or character with memory.

## Considered Options

- **Option A: Persona as analytics only** — store derived metrics, feed them to AI prompts as context. Simple, stateless from user's perspective.
- **Option B: Persona as character** — persona has identity (name, tone, level), a memory layer (diary-style summaries), AND derived metrics. The character evolves and the user perceives continuity.
- **Option C: Separate tables** — `user_stats` for metrics, `ai_character` for identity and memory.

## Decision Outcome

**Chosen option: Option B — Persona as character, stored in `personas.data JSONB`**

JSONB is flexible enough to evolve the schema without migrations. The single `personas` table avoids joins and keeps the data model simple for a solo-founder project. The character layer is the product differentiator and must be first-class, not an afterthought.

### Data Schema (personas.data JSONB)

```json
{
  "patterns": {
    "tagFreq": {},
    "topTags": [],
    "totalTasks": 0,
    "doneTasks": 0,
    "completionRate": 0,
    "hourCounts": {},
    "mostActiveHour": 9
  },
  "character": {
    "name": null,
    "tone": "warm",
    "level": 1,
    "xp": 0,
    "createdAt": null
  },
  "memory": [
    {
      "date": "YYYY-MM-DD",
      "summary": "One sentence about the day's focus and mood",
      "mood": "focused | scattered | tired | energised"
    }
  ],
  "updatedAt": "ISO8601"
}
```

### Who Writes What

| Field group | Written by | When |
|---|---|---|
| `patterns` | `updatePersona()` in App | After each dump processing or archive |
| `character.xp/level` | RPG service (Sprint 5, feature-flagged) | After task completion events |
| `character.name/tone` | User via Settings (Sprint 2) | Explicitly by user |
| `memory[]` | `generateEveningReview()` side-effect | During evening review (opt-in) |

### Sensitivity Classification

| Field | Sensitivity | Notes |
|---|---|---|
| `patterns.*` | Low — derived metrics | Not directly sensitive |
| `character.*` | Low — user-chosen | Name chosen by user |
| `memory[].summary` | **High** — diary-like | AI summary of personal thoughts; treat as personal data under GDPR |

### Positive Consequences

- AI prompts become richer and more personalised over time.
- Memory layer enables "what happened last week?" type continuity.
- JSONB evolution — adding fields is non-breaking.
- RPG layer can read `character.xp/level` without coupling to thoughts table.

### Negative Consequences / Trade-offs

- `memory[]` array will grow unboundedly — needs pruning strategy (keep last 90 days, or last 30 entries). Add to Sprint 3 backlog.
- JSONB is less queryable than normalised tables — acceptable at current scale.
- Two writes per evening review (thoughts archive + persona memory) — must be treated as eventual consistency, not atomic transaction.

### Risks / Open Questions

- **RPG derived metrics:** RPG stats (XP, level, quests) should be computed FROM `thoughts` + `personas`, not stored as a separate critical table. If RPG data is lost, it can be recomputed. This is the invariant for RPG: **RPG layer stores only derived/decorative data, never source-of-truth data.** (Requested by Perplexity review.)
- Memory opt-in: decide in Sprint 2 whether `memory[]` is opt-in or opt-out. Default: opt-in with clear disclosure.
