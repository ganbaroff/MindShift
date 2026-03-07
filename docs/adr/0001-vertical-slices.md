# [0001] Vertical Slice Architecture

- **Status:** Accepted
- **Date:** 2026-03-07
- **Owner:** Yusif Ganbarov
- **Related:** Sprint 1 planning, ARCHITECTURE.md

## Context and Problem Statement

MindFlow started as a single 3176-line monolith (`src/mindflow.jsx`). This blocks parallel AI-agent development, makes context windows expensive, and makes it impossible to test features in isolation. A structural decision is needed before Sprint 1 begins.

## Considered Options

- **Option A: Vertical Slices** — each feature is a self-contained folder with its own UI, logic, and data access. Shared utilities live in `src/shared/`, architectural boundaries in `src/skeleton/`.
- **Option B: Horizontal Layers** — classic `components/`, `services/`, `hooks/` split across the whole app.
- **Option C: Keep the monolith** — continue adding to `mindflow.jsx`.

## Decision Outcome

**Chosen option: Option A — Vertical Slices**

Vertical slices minimise the context an AI agent needs to load for any given feature. An agent working on `dump/` only needs to understand its own slice + `shared/services/` — not the entire app. This directly maps to the bolt lifecycle (one bolt = one slice).

### Positive Consequences

- AI agents work in isolation; no risk of breaking unrelated screens.
- Features can be tested independently.
- Easier onboarding: a new developer reads one `README.md` per feature.
- Natural boundary for feature flags (flag wraps the slice's entry point).

### Negative Consequences / Trade-offs

- Initial refactor cost: ~4–6 bolts to extract all four screens from the monolith.
- Some duplication until `shared/` is properly shaped (acceptable short-term tech debt).

### Risks / Open Questions

- How granular should slices be? (e.g. dump parsing vs dump UI as separate slices?) → Decision: keep them together for now, split only if a slice exceeds ~400 lines.
- Cross-slice communication → via `shared/hooks/` or Zustand store (decided in a future ADR when Zustand is introduced).
