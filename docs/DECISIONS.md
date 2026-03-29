# Decision Log — MindShift

**Purpose:** Why we chose X over Y. Prevents revisiting settled decisions. Add any non-obvious choice here.
**Format:** Decision → Rationale → Alternatives rejected

---

## Architecture

### Zustand v5 over Redux / Jotai
Chosen for: flat API (no boilerplate), `subscribeWithSelector` for derived state, `persist` middleware for IDB, v5 removes the `get` pattern footgun.
Rejected: Redux (ceremony), Jotai (too atomic for 7 inter-dependent slices), Context API (re-render problem at scale).
→ ADR: `docs/adr/0002-state-management-zustand.md`

### IndexedDB over localStorage for persistence
Chosen for: no 5MB limit (audio preferences + full session history push it over).
Implemented: `src/shared/lib/idbStorage.ts` — transparent migration reads localStorage first, migrates, deletes.
→ ADR: `docs/adr/0003-offline-first-pattern.md`

### motion/react (not framer-motion)
Both are installed as different package names. `motion/react` is the correct import for new code. `framer-motion` import will still resolve but uses older API.
Rule: always `from 'motion/react'`. See `.claude/rules/guardrails.md`.

### React Router v7 (not TanStack Router)
Chosen when TanStack Router was pre-stable. React Router v7 has first-class lazy() support and is stable.
No plans to migrate — too much disruption for marginal gain.

### Tailwind CSS v4 (@theme syntax)
Uses `@import "tailwindcss"` + `@theme { ... }` block, not `tailwind.config.js`.
All design tokens live in `:root` CSS variables and `@theme`. No `tailwind.config.js` token duplication.

---

## AI / Edge Functions

### Gemini 2.5 Flash (not GPT-4o) for Mochi
Chosen for: cost (significantly cheaper per token), speed (Flash is faster than GPT-4o), quality sufficient for 150-token companion messages.
Rate limit: 10 calls/day free tier. Unlimited pro (future Stripe).
→ ADR: `docs/adr/0006-ai-edge-functions-gemini.md`

### Edge Functions in Deno (not Vercel Edge / Cloudflare Workers)
Chosen for: Supabase is already the backend — co-location eliminates extra latency, RLS enforcement is native.
Tradeoff: Deno doesn't support all Node APIs (notably `web-push` npm package uses Node crypto — required custom ECDH for Sprint CE).

### 8-second AI timeout + instant hardcoded fallback
Pattern in every AI call: show hardcoded message immediately, fire async AI request, replace if it arrives within 8s window.
This is non-negotiable — ADHD users cannot wait for LLM. See `.claude/rules/guardrails.md` Rule 7.

---

## UX / Design

### No red anywhere in the palette
Research #8: red triggers RSD (rejection sensitive dysphoria) in ADHD users — even in celebration contexts.
Palette: teal (#4ECDC4), indigo (#7B72FF), gold (#F59E0B), surface grays.
→ ADR: `docs/adr/0005-adhd-safe-color-system.md`

### Invisible streaks (shown only ≥2 days)
Breaking a streak and seeing "0" causes shame spiral in ADHD. Streaks are only shown when ≥2 days active.
No streak-break penalties. No decay. Reset is invisible.

### Max 3 tasks in NOW pool
Cognitive load research: 3 tasks is the maximum working memory can hold without decision paralysis.
Pool limit is enforced by `getNowPoolMax(appMode, seasonalMode)` — never hardcode `3`.

### Skip button always visible in tutorials and rituals
ADHD users need escape routes. Trapping someone in a flow (even a 60s breathwork) causes anxiety.
Rule: skip is always a tap away. Applied to: BreathworkRitual, ShutdownRitual, WeeklyPlanning, MonthlyReflection, FirstFocusTutorial.

### Task difficulty = traffic light (teal/gold/purple), never red
Easy=teal, Medium=gold, Hard=purple. "Hard" is challenging, not threatening.
`DIFFICULTY_MAP` in `types/index.ts` is the single source of truth.

---

## Infrastructure

### PostgreSQL-backed rate limiting (not Redis)
For AI edge functions. Supabase DB already present, Redis adds infra cost.
Simple `rate_limit_log` table with TTL via cron.
→ ADR: `docs/adr/0001-db-backed-rate-limiting.md`

### injectManifest PWA strategy (not GenerateSW)
Full control over service worker (custom push handlers, phase-adaptive audio caching).
GenerateSW would overwrite our custom SW.
→ ADR: `docs/adr/0004-pwa-service-worker-strategy.md`

### vite-plugin-pwa + Workbox CacheFirst for assets
Static assets: CacheFirst (versioned by hash, safe to cache forever).
API: NetworkFirst.
Navigation: NavigationRoute → index.html.

---

## Testing

### Playwright E2E over Cypress
Chosen for: native async/await, better mobile viewport simulation (iPhone 14), no "cy.wait" hacks.
All Supabase calls mocked via `page.route()` — tests run offline and fast.

### Supabase mocked at network layer (page.route), not module level
Module-level mocking would test the mock, not the component. Network-level mocking tests the full component with realistic response shapes.
