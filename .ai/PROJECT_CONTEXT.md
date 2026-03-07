# MindFlow — AI Project Context

> Read this file first. It's the single-page brief for any AI agent starting work on this project.

---

## What Is MindFlow?

A focused productivity app for people with ADHD. Users do a brain dump (raw thoughts, any language, any format), and the AI structures it into tasks, ideas, reminders and notes. Three daily rituals: morning dump → today's focus → evening review.

**Target user:** ADHD adults who need to externalise their thoughts to function. Forgiveness and low friction are the core UX values — never guilt, never punishment.

---

## Tech Stack (actual, as of 2026-03-07)

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite (JavaScript, migrating to TypeScript) |
| State | `useState` in App() + localStorage (Zustand planned Sprint 3) |
| Styling | Inline styles + `C` design tokens object |
| Routing | `useState` screen switch (React Router planned Sprint 2) |
| Backend | Supabase (Auth magic-link, Postgres, Realtime) |
| AI | Claude Sonnet 4 via Anthropic API (`VITE_ANTHROPIC_API_KEY`) |
| Deploy | Vercel (static, auto-deploy from main) |

---

## Architecture Approach

- **Skeleton + Vertical Slices** (ADR 0001): `src/skeleton/` is the human-owned boundary layer; `src/features/*` are AI-executable bolts.
- **Trunk-based development** (ADR 0005): small commits to main, feature flags for incomplete work.
- **Bolt lifecycle**: spec.md → plan → code → test → bolt-log → ADR if needed.

---

## Current State

- `src/mindflow.jsx` — **monolith, 3176 lines**. ALL code lives here. Sprint 1 begins the extraction.
- No TypeScript yet. No Zustand. No React Router.
- DB schema in `supabase-setup.sql` (run manually in Supabase SQL Editor).
- Two DB tables: `thoughts`, `personas`.
- AI features work if `VITE_ANTHROPIC_API_KEY` is set in `.env`.

---

## Files an Agent Must Read Before Starting a Bolt

1. This file — `.ai/PROJECT_CONTEXT.md`
2. The relevant feature spec — `src/features/<feature>/spec.md`
3. Any ADRs referenced in the spec
4. `.ai/coding-standards.md`

---

## What an Agent Must NOT Touch Without Explicit Permission

- `src/skeleton/` — architecture and security boundaries, human decision
- `supabase-setup.sql` — DB schema changes require ADR first
- `src/mindflow.jsx` if working in `src/features/` — migrate code OUT, don't add new code IN
- `.env` and any real credentials

---

## Languages

The app supports EN, RU, AZ. All user-facing strings go through the `T` translation object in `src/mindflow.jsx` (to be extracted to `src/shared/i18n/` in Sprint 1). Do not hardcode user-visible strings in new code.

---

## Freemium Rules

| Feature | Free | Pro |
|---|---|---|
| AI dumps/month | 30 | Unlimited |
| Thoughts stored | 50 | Unlimited |
| Export | — | ✅ |

Gate new paid features with `isPro` prop. Never block navigation, only block the specific action.

---

## Key Contacts

- Product owner / architect: Yusif Ganbarov (ganbarov.y@gmail.com)
- Repo: https://github.com/ganbaroff/MingFocusClaude
