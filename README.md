# MindFlow — AI Brain Dump OS

A focused productivity app for people with ADHD. Capture raw thoughts, let AI structure them into tasks, ideas and reminders, track daily focus, and close the day with an AI-powered evening review.

**Languages:** EN · RU · AZ
**Stack:** React 18 + Vite + Supabase + Claude Sonnet 4 (Anthropic API)

---

## Requirements

- Node.js 18+
- npm 9+
- A [Supabase](https://supabase.com) project (free tier works)
- An [Anthropic API key](https://console.anthropic.com) (required for AI features)

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/ganbaroff/MingFocusClaude.git
cd MingFocusClaude
npm install
```

### 2. Environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in:

| Variable | Where to find it |
|---|---|
| `VITE_SUPABASE_URL` | Supabase Dashboard → Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase Dashboard → Project Settings → API → anon/public key |
| `VITE_ANTHROPIC_API_KEY` | https://console.anthropic.com → API Keys |

### 3. Set up the database

1. Open your Supabase project → **SQL Editor**
2. Paste the entire contents of `supabase-setup.sql`
3. Click **Run**

This creates two tables (`thoughts`, `personas`), indexes, RLS policies and triggers. Safe to run on a fresh project.

### 4. Run the dev server

```bash
npm run dev
```

Opens at `http://localhost:3000`

### 5. Production build

```bash
npm run build     # outputs to /dist
npm run preview   # preview the production build locally
```

Deployed on Vercel. Every push to `main` auto-deploys.

---

## Current Architecture

> This is an honest description of the current state, not the target state.

```
src/
├── main.jsx          # React entry point
└── mindflow.jsx      # ENTIRE app — 3176 lines, single monolithic file
```

There is no TypeScript, no feature-based folder structure, no Zustand, no React Router. All screens (Dump, Today, Evening, Settings) and all logic (AI calls, Supabase sync, streak calculation, i18n) live inside `mindflow.jsx`.

This is a known technical debt. The refactor plan (splitting into `features/`, `services/`, `hooks/`) is documented and scheduled for Sprint 1.

---

## AI Integration

The app uses the **Anthropic API** directly from the browser:

- `parseDump()` — parses a raw brain dump into structured thoughts
- `generateEveningReview()` — writes an ADHD-friendly evening summary
- `aiFocusSuggest()` — picks top 3 tasks to focus on today

All three call `claude-sonnet-4-20250514` via `https://api.anthropic.com/v1/messages`.

**Security note:** The API key is sent from the browser (`VITE_ANTHROPIC_API_KEY`). This is acceptable for development and early access, but in production the AI calls should be moved to a Supabase Edge Function so the key is never exposed client-side.

---

## Screens

| Screen | Route (state) | Description |
|---|---|---|
| LangPick | onboarding | Language selection |
| Welcome | onboarding | Intro slides |
| Auth | onboarding | Magic link sign-in (skippable) |
| **Dump** | `dump` | Main brain dump + AI parse |
| **Today** | `today` | Today's tasks + AI focus pick |
| **Evening** | `evening` | Evening review + AI reflection |
| **Settings** | `settings` | Language, sync, export, account |

---

## Data

Two Supabase tables:

- **thoughts** — each parsed thought item (type, priority, tags, recurrence, etc.)
- **personas** — per-user AI context (top tags, completion rate, active hours)

Unauthenticated users get localStorage persistence. Auth unlocks cross-device sync.

---

## Known Issues

- `callClaude()` was missing the `Authorization` header — fixed in Sprint 0 (the function now reads `VITE_ANTHROPIC_API_KEY` from env).
- Supabase URL and anon key were previously hardcoded in `mindflow.jsx` — moved to env vars in Sprint 0.
- No PWA service worker yet — `manifest.json` added in Sprint 0, full Workbox setup planned for Sprint 3.
- Icon files `icon-192.png` and `icon-512.png` are not yet generated — only `icon.svg` exists. PWA install will work but without optimised icons.

---

## Roadmap

| Sprint | Focus |
|---|---|
| **Sprint 0** ✅ | Security fixes, SQL schema, README, PWA manifest |
| Sprint 1 | Split monolith into `features/` architecture |
| Sprint 2 | TypeScript migration |
| Sprint 3 | Zustand state management |
| Sprint 4 | PWA (vite-plugin-pwa + Workbox) |
| Sprint 5 | RPG gamification (stats, quests, achievements) |
