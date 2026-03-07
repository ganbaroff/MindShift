# [0002] Supabase as BaaS

- **Status:** Accepted
- **Date:** 2026-03-07
- **Owner:** Yusif Ganbarov

## Context and Problem Statement

MindFlow needs Auth, a relational database, and optionally Realtime and Storage. The team is one founder with AI agents — operational overhead must be near zero.

## Considered Options

- **Option A: Supabase** — managed Postgres + Auth + Realtime + Storage + Edge Functions. Free tier generous.
- **Option B: Firebase** — NoSQL, tight Google lock-in, less SQL expressiveness.
- **Option C: Custom backend (Node/Express + Postgres)** — full control, but requires infra management.
- **Option D: PocketBase** — self-hosted, SQLite-based, simpler but no managed cloud.

## Decision Outcome

**Chosen option: Option A — Supabase**

Already in use. RLS enforces per-user data isolation at the DB level, eliminating a whole class of auth bugs. The anon key is safe client-side as long as RLS is enabled on every table. Migrations can be managed via `supabase-setup.sql` or the Supabase CLI.

### Positive Consequences

- Zero backend infra to maintain.
- RLS = security by default; AI agents cannot accidentally bypass auth.
- Edge Functions available for moving sensitive operations server-side (e.g. AI API calls in production).

### Negative Consequences / Trade-offs

- Vendor lock-in to Supabase's Postgres extensions and Auth model.
- Free tier has row limits (500MB DB, 50K MAU) — acceptable for current scale.

### Risks / Open Questions

- **AI API key exposure:** `callClaude()` currently runs client-side with `VITE_ANTHROPIC_API_KEY`. Must be moved to a Supabase Edge Function before public launch. Tracked as Sprint 3 tech debt.
- **Schema migrations:** currently managed manually via `supabase-setup.sql`. Switch to `supabase db push` (CLI) when the team grows.
