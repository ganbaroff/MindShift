# MindShift — Handover Package
## For New Engineering Team · 48-Hour Deployment Guide

**Prepared by:** Antigravity AI — Pre-Acquisition Due Diligence  
**Date:** 2026-06-06  
**Target:** A new engineering team with zero prior context should be able to clone, deploy, and extend MindShift within 48 hours using only this document and the repository.

---

## 1. Product Overview

MindShift is an **ADHD-friendly productivity PWA** built around a focus timer with an AI companion (Mochi). The core design philosophy is **shame-free, energy-aware, non-punitive** — every design decision is rooted in ADHD research. Do not "simplify" features without reading the research comments in the code.

### User Flows
```
Onboarding (5 steps) → Home → Focus Setup → Breathwork Ritual →
Active Session (Mochi companion, ambient audio, haptics) →
Nature Buffer → Recovery Lock → Progress / Crystal Economy
```

### Architecture
```
Frontend (Vite 5 + React 18/19)
    ↓ Supabase JS client (PKCE auth)
Supabase (Auth + Postgres + Edge Functions)
    ↓ Edge Functions (Deno)
        ├── mochi-respond     ← Cerebras → Gemini → Groq (AI chain)
        ├── decompose-task    ← Groq 70B
        ├── weekly-insight    ← Gemini
        ├── gdpr-export/delete
        ├── dodo-webhook      ← payment events
        └── volaura-bridge-proxy ← VOLAURA platform
    ↓ External
        ├── Claude API (primary AI — legacy path)
        ├── Gemini 2.5 Flash (primary via shared router)
        ├── Groq (fast inference)
        ├── DodoPayments (subscription billing)
        └── Langfuse (LLM observability)
```

---

## 2. Required Environment Variables

### Vercel (Frontend)

| Variable | Description | Required |
|---------|-------------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL | ✅ Yes |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | ✅ Yes |
| `VITE_SENTRY_DSN` | Sentry error reporting DSN | Recommended |
| `VITE_APP_ENV` | `production` / `staging` | Recommended |

### Supabase Edge Functions (set via `supabase secrets set`)

| Variable | Description | Required |
|---------|-------------|---------|
| `GEMINI_API_KEY` | Google Gemini API key — primary AI | ✅ Yes |
| `GROQ_API_KEY` | Groq inference API key — fast path | ✅ Yes |
| `CEREBRAS_API_KEY` | Cerebras ultra-fast path for Mochi | Recommended |
| `CLAUDE_API_KEY` | Anthropic Claude — legacy path | Optional |
| `OPENROUTER_API_KEY` | OpenRouter — free model fallback | Optional |
| `NVIDIA_API_KEY` | NVIDIA NIM — max quality chain | Optional |
| `DEEPSEEK_API_KEY` | DeepSeek — max quality chain | Optional |
| `DODO_WEBHOOK_SECRET` | DodoPayments webhook HMAC secret | ✅ Yes (payments) |
| `LANGFUSE_PUBLIC_KEY` | Langfuse LLM observability | Recommended |
| `LANGFUSE_SECRET_KEY` | Langfuse LLM observability | Recommended |
| `LANGFUSE_HOST` | Langfuse host URL | Recommended |
| `VOLAURA_BRIDGE_URL` | VOLAURA platform bridge URL | Optional |
| `VOLAURA_BRIDGE_KEY` | VOLAURA bridge auth key | Optional |

> ⚠️ **DO NOT use `SUPABASE_PAT` from `check-secrets.ps1`** — this token is compromised. Generate a new PAT from the Supabase dashboard and store it in your local environment only.

---

## 3. Local Setup (< 5 minutes)

```bash
# 1. Clone and install
git clone https://github.com/ganbaroff/MindShift.git
cd MindShift
npm install

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local — fill VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# 3. Push database schema to your Supabase project
npx supabase db push

# 4. Start dev server
npm run dev
# Opens at http://localhost:5173
```

> ⚠️ **Known issue (CRIT-01):** Migrations for `daily_tasks` and `usage_limits` tables are missing from the repo. `supabase db push` may fail or skip these tables. Check `audit/sprint-02-backend.md` for reconstruction guidance.

---

## 4. Database Schema (Key Tables)

```
users                  — profile, subscription_tier, ADHD profile fields
tasks                  — all user tasks (now/next/someday pools via pool_type)
focus_sessions         — completed session records
parked_thoughts        — thoughts captured during sessions
achievements           — client-side achievement tracker (IDB-backed)
edge_rate_limits       — AI call rate limiting (user_id, fn_name, window_start, count)
crystal_ledger         — economy transactions (focus_session, shop_purchase)
community_aliases      — anonymous community identity
agent_sessions         — community AI agent chat sessions
revenue_snapshots      — admin-published revenue data
```

**Key RPC functions:**
- `increment_rate_limit(p_user_id, p_fn_name, p_window_start)` — atomic rate limit increment
- `earn_focus_crystals(p_amount, p_source_event)` — crystal ledger entry
- `get_ambient_orbit_count()` — anonymized active user count for social signal

---

## 5. Deployment

### Frontend (Vercel)
```bash
npm run build     # Produces dist/
vercel --prod     # Or push to main branch with Vercel GitHub integration
```

Vercel settings:
- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Node version: 18+

### Supabase Edge Functions
```bash
npx supabase functions deploy mochi-respond
npx supabase functions deploy decompose-task
npx supabase functions deploy gdpr-export
npx supabase functions deploy gdpr-delete
# ... deploy all functions in supabase/functions/
```

---

## 6. Architecture Deep-Dives

### Focus Session State Machine

The session flow is a distributed FSM across 5 hooks. Here is the canonical state map:

```
setup
  → session         (handleStart)
    → interrupt-confirm  (handleStop)
      → session          (handleResume)
      → bookmark-capture (handleConfirmStop)
    → hard-stop          (120-min hard stop, softStopFiredRef)
    → bookmark-capture   (timer end → handleSessionEnd)

bookmark-capture
  → nature-buffer   (handleBookmarkSave or handleBookmarkSkip)

nature-buffer
  → recovery-lock   (if elapsedMin >= 90)
  → setup           (handleSkipBuffer or bufferSeconds countdown)

recovery-lock
  → setup           (handleBypassRecovery or countdown)

hard-stop
  → nature-buffer   (handleBypassHardStop or onEndAndRest)
```

Hooks that call `setScreen()`:
- `useFocusSession.ts` — setup, session, interrupt-confirm, bookmark-capture
- `useSessionEnd.ts` — nature-buffer, recovery-lock
- `useSessionPhase.ts` — hard-stop trigger
- `FocusScreen.tsx` — reads `screen` state, renders sub-component

### AI Routing in `mochi-respond`

The function uses THREE call paths in order:
1. **Cerebras fast path** — `CEREBRAS_API_KEY` → `qwen-3-235b` (ultra-low latency)
2. **Direct Gemini** — `GEMINI_API_KEY` → `gemini-2.5-flash` (fallback)
3. **`_shared/callLLM`** — policy chain (Groq → Gemini → OpenRouter) — last resort

All paths have an 8-second outer timeout. On all-fail, returns `FALLBACK_MESSAGES[random]`.

### Zustand Store Structure

```
src/store/
  index.ts            — store composition, IDB persist config
  userSlice.ts        — userId, subscription, ADHD profile
  taskSlice.ts        — nowPool, nextPool, somedayPool, CRUD
  sessionSlice.ts     — activeSession, sessionPhase, timers
  uiSlice.ts          — energyLevel, appMode, theme, locale
  achievementSlice.ts — achievements (IDB-backed, NOT server-backed)
  shopSlice.ts        — crystal balance, shopUnlocks
  mochiSlice.ts       — mochiMemory, mochiCompanionEnabled
```

**Circular dependency warning:** Several slices import from each other. This is the root cause of the 233 kB bundle (HIGH-02). Do not add new cross-slice imports without addressing this first.

### Haptic Engine

All haptic calls go through `src/shared/lib/haptic.ts`. The store registers a getter to break a circular dependency. Pattern:

```ts
// store/index.ts (on init):
_registerHapticsGetter(() => store.getState().hapticsEnabled)

// Any component or hook:
import { hapticDone } from '@/shared/lib/haptic'
hapticDone() // calls navigator.vibrate([15, 50, 25]) if enabled
```

iOS: `navigator.vibrate()` is silently ignored (WebKit blocks it). Android: full support after user gesture. Settings UI correctly labels haptics "(Android only)."

---

## 7. ADHD Design Rules (DO NOT REMOVE)

These are product-critical — violating them will harm users:

1. **Shame-free:** Never show "failed," "missed," "overdue" language without a warm reframe
2. **Bypass always visible:** Recovery lock, hard stop — the bypass button must always be visible, never hidden behind a timer
3. **No alarming haptic patterns:** `hapticError` is intentionally lighter than OS error patterns (avoids shame pathways)
4. **Post-session vulnerability window:** Do not show the crystal shop on the `nature-buffer` screen — `Research #10`
5. **Crisis detection:** Never remove `detectCrisis()` from `MochiChat.handleSend` — flagged text must never reach the AI endpoint
6. **Reduced motion:** All animations gate on `useMotion().shouldAnimate` — never hardcode animations
7. **Energy-aware defaults:** `getSmartDuration(energyLevel)` — do not change the 5/25/52 minute defaults without ADHD research justification

---

## 8. Test Suite

```bash
npm test              # All 131 tests (76 unit + 55 Playwright E2E)
npm run test:unit     # Unit tests only
npm run test:e2e      # Playwright E2E only (requires dev server running)
```

Key test files:
- `src/__tests__/` — unit tests (store slices, haptic, crisis detection, timer logic)
- `e2e/` — Playwright tests (onboarding flow, focus session, GDPR, auth)

---

## 9. Monitoring & Observability

| Tool | Purpose | Config |
|------|---------|--------|
| Sentry | Frontend error tracking | `VITE_SENTRY_DSN` + `src/shared/lib/sentry.ts` |
| Langfuse | LLM call tracing | `LANGFUSE_*` secrets in Supabase |
| Supabase Logs | Edge function logs | Supabase dashboard → Edge Functions → Logs |
| Vercel Analytics | Frontend metrics | Enabled via Vercel dashboard |

> ⚠️ Sentry is on free tier (5K events/month). Upgrade immediately if launch brings significant traffic.

---

## 10. Known Issues / Technical Debt

| Priority | Issue | Detail |
|---------|-------|--------|
| CRITICAL | Missing DB migrations | `daily_tasks`, `usage_limits` DDL absent — see `audit/RISK_REGISTER.md#CRIT-01` |
| HIGH | Bundle size 233 kB | Circular imports in store — see `audit/RISK_REGISTER.md#HIGH-02` |
| HIGH | Leaked Supabase PAT | Rotate immediately — `check-secrets.ps1` |
| MEDIUM | `PHASE_LABELS` not i18n | Hardcoded English on session screen for all locales |
| LOW | Achievements not server-backed | Lost on storage clear — IDB only |
| LOW | Crisis detection EN/RU only | Missing Turkish, German, Spanish, Azerbaijani keywords |

Full register: `audit/RISK_REGISTER.md`

---

## 11. Contact / Context Documents

| Document | Location | Purpose |
|---------|---------|---------|
| Sprint 1 (Infrastructure) | `audit/sprint-01-infra.md` | CI, secrets, lock file |
| Sprint 2 (Database) | `audit/sprint-02-backend.md` | Schema, RLS, ER diagram |
| Sprint 3 (Frontend) | `audit/sprint-03-frontend.md` | Bundle, PWA, audio |
| Sprint 4 (Security) | `audit/sprint-04-security.md` | CORS, GDPR, auth |
| Sprint 5 (UX/A11y) | `audit/sprint-05-ux-accessibility.md` | ADHD design, haptics, ARIA |
| Sprint 6 (AI/Logic) | `audit/sprint-06-ai-product-logic.md` | LLM router, rate limits, FSM |
| Risk Register | `audit/RISK_REGISTER.md` | All 32 findings |
| Executive Summary | `audit/EXECUTIVE_SUMMARY.md` | Score, critical findings, checklist |
| LLM Router Contract | `docs/ROUTER-CONTRACT.md` | AI provider chain spec |
| Crystal Economy | `docs/crystal-shop-ethics.md` | Economy design rules |
