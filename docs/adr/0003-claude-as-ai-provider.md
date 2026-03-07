# [0003] Claude Sonnet 4 as AI Provider

- **Status:** Accepted
- **Date:** 2026-03-07
- **Owner:** Yusif Ganbarov
- **Related:** Sprint 0 handover findings

## Context and Problem Statement

MindFlow's AI features (parseDump, eveningReview, focusSuggest) need an LLM. The original CLAUDE.md specified Gemini Flash, but the actual code used Claude Sonnet 4 — creating a documentation gap. This ADR formally aligns the decision with reality and sets the forward path.

## Considered Options

- **Option A: Claude Sonnet 4 (current)** — high quality, higher cost (~$3/$15 per 1M tokens in/out).
- **Option B: Gemini 2.0 Flash** — fast, cheap (~$0.075/$0.30 per 1M tokens), slightly lower quality on ADHD-coaching tone.
- **Option C: Hybrid** — Gemini Flash for parseDump (high-volume structural task), Claude Sonnet for eveningReview and focusSuggest (quality-sensitive).

## Decision Outcome

**Chosen option: Option A for now, migrate to Option C in Sprint 3**

Quality of the evening review and ADHD-coaching tone matters for user retention. Keep Claude for all three functions until the app has real users and cost becomes measurable. Migrate parseDump to Gemini Flash in Sprint 3 when usage data justifies it (estimated 70% cost reduction on free-tier dumps).

### Positive Consequences

- Consistent AI persona and tone across all three features.
- Single API key to manage.
- No prompt re-tuning needed now.

### Negative Consequences / Trade-offs

- Higher per-call cost than Gemini Flash alternatives.
- API key exposed client-side until Edge Function migration.

### Risks / Open Questions

- **Client-side key exposure** — `VITE_ANTHROPIC_API_KEY` sent from browser. Acceptable in dev/beta; must move to Edge Function before public launch.
- **Rate limits** — Claude Sonnet 4 has lower RPM limits on low tiers. Add retry + user-facing error messaging.
- **CLAUDE.md still references Gemini** — update it to match this ADR.
