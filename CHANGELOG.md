# Changelog

All notable changes to MindFlow are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versions follow [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### Security
- Removed hardcoded Supabase URL and anon key from `mindflow.jsx` — now read from `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` env vars
- Fixed missing `Authorization` header in `callClaude()` — AI features (parseDump, eveningReview, focusSuggest) were returning 401 silently; now read from `VITE_ANTHROPIC_API_KEY`

### Added
- `supabase-setup.sql` — complete DB setup script (thoughts + personas tables, RLS, indexes, triggers)
- `.env.example` — environment variable template with documentation
- `README.md` — developer onboarding guide
- `public/manifest.json` — PWA manifest (standalone display, theme colour, icon declarations)
- `ARCHITECTURE.md` — living architecture document
- `DECISIONS.md` — ADR index
- `docs/adr/` — 5 initial Architecture Decision Records (0001–0005)
- `docs/bolts/` — bolt log system for AI-agent micro-iterations
- `docs/sprints/` — sprint planning and retrospective documents
- `.ai/` — AI agent context layer (PROJECT_CONTEXT, coding-standards, common-tasks, prompt-log)
- `src/features/` — vertical slice directory structure (empty, populated in Sprint 1)
- `src/skeleton/` — human-owned architecture boundary (empty, populated in Sprint 1)
- `src/shared/` — shared utilities directory structure (empty, populated in Sprint 1)

### Changed
- `index.html` — added `<link rel="manifest">` and Apple PWA status bar meta

---

## [0.4.0] — 2026-02-XX (v4 UI)

### Added
- Full UI v4 with dark mode, glassmorphism, bento grid layout
- SVG icon system (crisp, production-grade)
- Gemini API integration (note: actually Claude Sonnet 4 — corrected in Sprint 0)
- Streak tracker (Duolingo-style, localStorage-based)
- Evening review screen with AI reflection
- AI focus suggest on Today screen
- Multilingual support: EN, RU, AZ
- Offline retry queue (localStorage-based)
- Persona system (AI learns user patterns)
- PWA meta tags (apple-mobile-web-app-capable)
- Export to Markdown (Pro feature)
- Notification scheduling
- Pro/waitlist pricing screen

---

_Previous versions not tracked. History begins at v0.4.0._
