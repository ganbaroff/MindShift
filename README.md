# MindShift

ADHD-aware productivity PWA. Calm, shame-free, mobile-first.

**Live app:** https://mind-shift-git-main-yusifg27-3093s-projects.vercel.app

## What it is

MindShift helps people with ADHD stay focused without pressure. No streaks that shame you, no red alerts, no countdown timers in the shop. Just a calm workspace that adapts to your energy.

## Key features

- **Focus sessions** with phase-adaptive audio and a surprise timer mode (no digits, no arc — pure flow)
- **Task pools** — NOW (max 3), NEXT, SOMEDAY — sized for ADHD working memory
- **Energy-aware UI** — low energy state simplifies everything automatically
- **AI Mochi** — personalized mascot companion during sessions (Gemini 2.5 Flash, psychotype-aware)
- **Focus Rooms** — anonymous co-working via Supabase Realtime presence (no identity exposed)

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS + CSS custom properties |
| State | Zustand v5 + IndexedDB persistence |
| Backend | Supabase (Auth + Postgres + Realtime + Edge Functions) |
| AI | Gemini 2.5 Flash via Supabase Edge Functions |
| Hosting | Vercel (auto-deploy on push to main) |

## Quick start

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env` and fill in your Supabase credentials before starting.

## Build check

```bash
tsc -b && npm run build
```

Always run `tsc -b` (not `tsc --noEmit`) before committing — it catches stricter errors.

## Part of the VOLAURA ecosystem

MindShift is one of five products. Crystal earnings (1 min focus = 5 crystals) feed into the shared VOLAURA economy.
