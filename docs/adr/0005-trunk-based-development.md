# [0005] Trunk-Based Development

- **Status:** Accepted
- **Date:** 2026-03-07
- **Owner:** Yusif Ganbarov

## Context and Problem Statement

With multiple AI agents potentially generating code, a branching strategy needs to be defined to avoid merge hell and long-lived feature branches.

## Considered Options

- **Option A: Trunk-based development (TBD)** — small, frequent commits directly to `main`. Incomplete features hidden behind feature flags.
- **Option B: GitFlow** — `develop`, `feature/*`, `release/*` branches. Structured but heavy overhead for a solo founder.
- **Option C: Feature branches (short-lived)** — branches per bolt, merged within 1–2 days. Compromise option.

## Decision Outcome

**Chosen option: Option A — Trunk-based development**

A solo founder + AI agents benefits most from TBD: no merge conflicts between agent sessions, Vercel auto-deploys previews, and feature flags give safe progressive delivery. Short-lived branches (per bolt) are acceptable if merged within one day.

### Positive Consequences

- Every merge to `main` triggers Vercel preview deploy — instant feedback.
- No long-lived branches rotting while other bolts are in progress.
- Forces small, atomic commits — each bolt = 1–3 commits maximum.

### Negative Consequences / Trade-offs

- Incomplete features must be behind flags (adds a small code overhead).
- Requires discipline: no "I'll clean it up later" commits to main.

### Risks / Open Questions

- Feature flag implementation not yet decided. Start with simple `const FLAGS = { rpg: false }` in `src/skeleton/platform/flags.ts`. Graduate to a service (LaunchDarkly, Unleash) when needed.
