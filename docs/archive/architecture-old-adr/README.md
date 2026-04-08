# MindShift — Architecture Decision Records

This directory documents key architectural decisions made during MindShift's development.

## ADR Index

| # | Title | Status | Date |
|---|-------|--------|------|
| [ADR-001](./ADR-001-zustand-over-redux.md) | Zustand over Redux for State Management | ✅ Accepted | 2026-03-09 |
| [ADR-002](./ADR-002-audioworklet-brown-noise.md) | AudioWorklet for Brown Noise (vs. Pre-recorded Buffer) | ✅ Accepted | 2026-03-09 |
| [ADR-003](./ADR-003-variable-ratio-xp.md) | Variable Ratio XP Schedule for Gamification | ✅ Accepted | 2026-03-09 |
| [ADR-004](./ADR-004-offline-queue-localstorage.md) | Offline Queue via localStorage (vs. IndexedDB / Service Worker Sync) | ✅ Accepted | 2026-03-09 |
| [ADR-005](./ADR-005-supabase-rate-limiting.md) | DB-Backed Atomic Rate Limiting in Edge Functions | ✅ Accepted | 2026-03-09 |
| [ADR-006](./ADR-006-focus-session-state-machine.md) | 6-State Machine for Focus Session Screen | ✅ Accepted | 2026-03-09 |

## How to Use This Index

When making a decision that touches these areas, read the relevant ADR to understand why the current approach was chosen before proposing changes. ADR statuses should be updated when decisions are superseded.

**Status meanings:**
- **Proposed** — under discussion, not yet implemented
- **Accepted** — implemented and currently in effect
- **Deprecated** — still in code but should be migrated away from
- **Superseded** — replaced by a newer ADR (link to replacement)
