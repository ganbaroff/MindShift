# Ecosystem Contract — Source of Truth

**Version:** 1.0 | **Date:** 2026-04-05
**Canonical copy also at:** C:\Projects\VOLAURA\memory\context\ecosystem-contract.md

---

## This file exists in BOTH projects. When one changes, the other must sync.

## Shared Rules (both CTOs follow)

1. ONE user identity — auth.users in Supabase. Goal: login once, access all 5 products.
2. ONE event bus — character_events (append-only). Source of truth for cross-product state.
3. ONE crystal economy — earned through real effort, never purchased directly.
4. NO red anywhere — teal/indigo/gold only, in every product.
5. ADHD-first — every screen passes Behavioral Nudge Engine review.
6. Offline-first — every product works without network.
7. Mochi personality — warm companion, not coach, not therapist. Consistent across products.

## API Contract

| Endpoint | Owner | Consumer | Status |
|----------|-------|----------|--------|
| POST /api/character/events | VOLAURA | MindShift | NOT BUILT |
| GET /api/character/state | VOLAURA | MindShift | NOT BUILT |
| GET /api/character/crystals | VOLAURA | MindShift | NOT BUILT |
| volaura-bridge.ts | MindShift | VOLAURA | BUILT (client-side) |

## Event Types (character_events)

| event_type | source_product | payload |
|-----------|---------------|---------|
| xp_earned | mindshift | { xp, duration_min, phase } |
| buff_applied | mindshift | { buff: 'consistency', streak_days } |
| stat_changed | mindshift | { dimension: 'psychotype', value } |
| state_changed | mindshift | { field: 'burnout', score } |
| vital_logged | mindshift | { vital: 'energy', value: 1-5 } |
| skill_verified | volaura | { competency, score, badge_tier } |
| crystal_earned | volaura | { amount, source: 'assessment' } |
| crystal_earned | mindshift | { amount, source: 'focus_session' } |

## Content Strategy (shared)

LinkedIn content strategy file: `VOLAURA/memory/swarm/skills/linkedin-content-strategy-2026.md`
Content queue: `VOLAURA/memory/swarm/content-queue/`
Both products contribute content (MindShift tech stories + VOLAURA ecosystem stories).

## Sync Protocol

When MindShift CTO makes a change that affects the ecosystem:
→ Update `mindshift/memory/ecosystem-sync.md`
→ Update `VOLAURA/memory/context/mindshift-state.md`

When VOLAURA CTO makes a change that affects MindShift:
→ Update `VOLAURA/docs/MINDSHIFT-INTEGRATION-SPEC.md`
→ Notify via content in `memory/swarm/ceo-inbox.md`
