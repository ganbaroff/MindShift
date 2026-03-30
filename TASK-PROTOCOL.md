# TASK-PROTOCOL v6.0 — MindShift Team Operating Standard

> **Owner:** Yusif Ganbarov
> **Project:** MindShift — ADHD-aware productivity PWA
> **Updated:** 2026-03-31
> **Status:** ACTIVE — all Claude Code agents follow this protocol without exception

---

## THE TEAM

These are the real roles for a production PWA. Each maps to a Claude agent specialization.

| Role | Real-world title | Claude Agent | Responsibility |
|------|-----------------|--------------|----------------|
| **ARCH** | Lead Engineer / Architect | `general-purpose` | Store integrity, decomposition, types, migrations |
| **SEC** | Security Engineer | `Explore` | Auth, edge functions, GDPR, secrets, RLS |
| **PERF** | Performance Engineer | `Explore` | Bundle, React memo, hooks, audio, Web Vitals |
| **UX** | UX + Accessibility Engineer | `Explore` | ADHD safety, copy, a11y, motion, color |
| **TEST** | QA Engineer | `e2e-runner` | Playwright E2E, unit tests, coverage gaps |
| **INFRA** | Platform / DevOps Engineer | `Explore` | CI/CD, Vercel, Supabase migrations, PWA, SW |
| **LIVEOPS** | Live Ops / SRE | `Explore` | Production health, Sentry errors, Vercel logs, user-facing incidents |
| **GROWTH** | Growth Engineer | `Explore` | Analytics, funnel gaps, retention metrics, A/B hooks |

### LIVEOPS — the "app is alive" role

This agent runs FIRST after any prod deploy or user-reported incident. Checks:
- Vercel deployment status + runtime logs
- Sentry error rate (project: `mindshift`, org: `yusif-ganbarov`)
- E2E suite on production URL: `PLAYWRIGHT_BASE_URL=https://mindshift-umber.vercel.app npx playwright test`
- Supabase edge function logs: `supabase functions list` + `supabase logs`
- Any crash reports or auth failures in the last 24h

### GROWTH — metrics that matter for an ADHD app

Key signals (not vanity metrics):
- **Day-7 retention** — did user complete ≥1 focus session in first week?
- **First session rate** — % of onboarded users who start first focus session
- **Streak resilience** — how many users recover after a 2+ day gap?
- **Audio engagement** — % of sessions where audio is active
- Funnel: install → onboard → first focus → day 7 → day 30

---

## THE FIVE STEPS (non-negotiable order)

```
0.5  FLOW DETECTION    → classify task type, pick agent(s)
1.0  TEAM READS        → parallel reads of all relevant files
1.5  TEAM PROPOSES     → each agent returns ranked findings
2.0  DEBATE + LOCK     → triage, priority vote, declare BATCH-ID
3.0  EXECUTE           → implement, tsc -b, commit
4.0  CLOSE             → docs, memory, "what's next"
```

**MICRO fastpath (≤10 lines, zero arch risk):** skip 1.5–2.0, fix directly.
**LARGE (>400 lines touched):** ARCH review mandatory before any code.

---

## STEP 0.5 — FLOW DETECTION

Classify incoming request before anything else:

| Signal | Route |
|--------|-------|
| "bug" / crash / error / broken / ошибка | `build-error-resolver` agent |
| E2E / Playwright / spec failing | `e2e-runner` agent |
| User complaint about production | **LIVEOPS first**, then route |
| audit / security / performance / analyze | 4–8 agent swarm |
| new feature | `Plan` → `general-purpose` |
| copy / UX text / translation | `humanizer` skill |
| ≤10 lines, obvious | MICRO fastpath → `Edit` directly |
| "what's next" / roadmap | GROWTH + UX agents |

---

## STEP 1.0 — TEAM READS (always parallel)

Launch all relevant agents simultaneously. Never read sequentially.

### Domain → Files mapping

**ARCH reads:**
- `src/store/index.ts`, `src/store/slices/`, `src/store/types.ts`
- `src/app/App.tsx`, `src/app/AppShell.tsx`
- `src/types/index.ts`, `src/types/database.ts`

**SEC reads:**
- `src/shared/lib/supabase.ts`, `src/app/AuthGuard.tsx`
- `supabase/functions/` (all edge functions)
- `.env.example`, `src/shared/lib/logger.ts`
- `supabase/migrations/` (latest 3)

**PERF reads:**
- `vite.config.ts`, `package.json` (deps + scripts)
- `src/shared/hooks/useAudioEngine.ts`
- `src/features/focus/useFocusSession.ts`
- `src/features/focus/MochiSessionCompanion.tsx`

**UX reads:**
- `src/features/today/TodayPage.tsx`
- `src/features/home/HomePage.tsx`
- `src/features/focus/FocusScreen.tsx`
- `src/components/TaskCard.tsx`
- `.claude/rules/guardrails.md`

**TEST reads:**
- `e2e/helpers.ts`, `playwright.config.ts`
- `e2e/*.spec.ts` (all specs, filenames only + line counts)
- `src/store/__tests__/store.test.ts`

**INFRA reads:**
- `public/manifest.json`, `src/sw.ts`
- `vercel.json`, `.github/workflows/`
- `capacitor.config.ts`
- `supabase/migrations/` (all, for schema state)

**LIVEOPS reads:**
- Vercel deployment logs (via MCP or CLI)
- Sentry DSN from `.env` → check recent errors
- `src/shared/lib/logger.ts` — what gets captured
- `src/app/AppShell.tsx` — offline bar, error boundaries

**GROWTH reads:**
- `src/features/onboarding/OnboardingPage.tsx`
- `src/features/tutorial/FirstFocusTutorial.tsx`
- `src/features/focus/FocusScreen.tsx` (setup screen)
- `src/shared/lib/volaura-bridge.ts` — analytics events
- `src/shared/hooks/useInAppReview.ts`

---

## STEP 1.5 — TEAM PROPOSES

Each agent returns proposals in this exact format:

```
AGENT: {ID}
FINDING: {one line — what's wrong or what opportunity exists}
SEVERITY: P0 | P1 | P2 | P3
EFFORT: MICRO (≤10 lines) | SMALL (1-4h) | MEDIUM (4-8h) | LARGE (2+ days)
FILE: {exact path:line}
FIX: {exact change in plain English}
BLOCKS_LAUNCH: yes | no
```

**Severity levels:**
- **P0** = data loss / security breach / crash / auth broken
- **P1** = user-facing bug / compliance gap / feature not working at all
- **P2** = degraded UX / tech debt / missing translation / performance issue
- **P3** = polish / nice-to-have / future optimization

---

## STEP 2.0 — DEBATE + BATCH LOCK

### Priority rules (non-negotiable)
1. P0 always executes first, regardless of effort
2. MICRO items batch together (≤5 per batch)
3. LARGE items require Yusif approval before execution
4. Nothing ships without `tsc -b` passing
5. LIVEOPS P0 items bypass all other queues

### Veto rules
- Store `partialize()` change → ARCH must verify no data loss
- New npm dependency → PERF must check bundle impact first
- Edge function change → SEC must verify rate limit logic untouched
- Any red color, shame language, urgency copy → rejected, no vote needed
- Component >400 lines → decompose first, feature second

### Batch naming
```
BATCH-{YYYY-MM-DD}-{LETTER}
Example: BATCH-2026-03-31-A
```
Each batch gets one commit. Commit message includes batch ID.

---

## STEP 3.0 — EXECUTE

```bash
# Gate check — run before touching ANYTHING:
npx tsc -b

# After every individual item:
npx tsc -b

# Before commit:
npx tsc -b && npx playwright test --reporter=line
```

### Commit format
```
{type}: {description} ({BATCH-ID})

- item 1: what changed and why
- item 2: what changed and why

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

Types: `fix` · `feat` · `perf` · `refactor` · `test` · `chore` · `docs`

---

## STEP 4.0 — CLOSE

After every batch:
1. Run `npx playwright test` — must stay green (flaky tests noted but not blocking)
2. If Vercel auto-deploys — LIVEOPS agent checks production within 10 min
3. Update CLAUDE.md sprint history if a feature landed
4. Update `memory/` if new architectural decision made
5. Report "what's next" from remaining backlog with priorities

---

## PRODUCTION HEALTH CHECKLIST (LIVEOPS runs this)

```
□ Vercel latest deploy: status = READY?
□ Sentry: 0 new P0 errors in last 24h?
□ Supabase: all 13 edge functions deployed and responding?
□ E2E on prod: 340+ tests passing?
□ Auth: magic link + Google OAuth working?
□ Push notifications: scheduled-push edge function running via pg_cron?
□ IDB storage: no quota errors in Sentry?
□ Service worker: latest version cached?
```

---

## STRESS TEST CHECKLIST (TEST + PERF run before launch gates)

```
□ 500 tasks in store — TasksPage renders without lag?
□ 90-min session — timer drift? phases fire at 7/15 min?
□ Offline → complete task → online → task synced to Supabase?
□ Tab close at 30 min → reopen → pending session toast shown?
□ IDB quota exceeded → localStorage backup kicks in?
□ Auth token expired mid-session → graceful recovery?
□ SW update available → user prompted?
□ Push notification with app in background → opens correct route?
□ energyLevel=1 → low-energy UI simplifies?
□ RecoveryProtocol after 72h → doesn't override fresh sessions?
□ Audio autoplay: session starts → brown noise starts automatically?
□ Tomorrow task → does NOT appear in TodayPage?
□ Google OAuth → redirect back to app → user lands on /today?
```

---

## GUARDRAILS (enforced by all agents — never override)

From `.claude/rules/guardrails.md`:

1. **Never red.** Teal/indigo/gold only. #FF0000, red-*, hue 0-15 = instant reject.
2. **Never urgency.** "hurry", "running out", "don't miss", "urgent" = instant reject.
3. **Never shame.** Missed tasks → warm amber badge. No penalties. No guilt.
4. **Motion is opt-out.** All animations gated by `useMotion()`. No bypasses.
5. **Accessibility baseline.** aria-label on all interactive. focus-visible:ring-2 everywhere.
6. **Store integrity.** New persisted field → add to `partialize()`. Always.
7. **Max ~400 lines.** Component over limit → decompose before feature.
8. **`tsc -b` before commit.** Not `tsc --noEmit`. Non-negotiable.
9. **No new deps without PERF approval.** Bundle size matters.
10. **Mochi is a companion, not a coach.** Never medical advice. Never diagnose.

---

## CURRENT STACK (hot cache for agents)

| Layer | Tech | Key file |
|-------|------|---------|
| Frontend | React 18 + TypeScript + Vite | `vite.config.ts` |
| State | Zustand v5 + idbStorage | `src/store/index.ts` |
| Routing | React Router v6 | `src/app/App.tsx` |
| Animation | motion/react (NOT framer-motion) | — |
| Backend | Supabase (project: `awfoqycoltvhamtrsvxk`) | `src/shared/lib/supabase.ts` |
| Edge Functions | Deno + Gemini 2.5 Flash | `supabase/functions/` |
| Auth | Supabase Auth (magic link + Google OAuth) | `src/features/auth/AuthScreen.tsx` |
| Hosting | Vercel (prod: `mindshift-umber.vercel.app`) | `vercel.json` |
| E2E Tests | Playwright (chromium + iPhone 14) | `playwright.config.ts` |
| Error tracking | Sentry (org: `yusif-ganbarov`, project: `mindshift`) | `src/shared/lib/logger.ts` |
| Push | Web Push + VAPID + Supabase pg_cron | `supabase/functions/scheduled-push/` |
| i18n | react-i18next + `src/locales/` | `en.json`, `ru.json`, `tr.json`, `az.json` |
| CSS | Tailwind + CSS variables (`:root` tokens) | `src/index.css` |
| Audio | Web Audio API (synthesized, no files) | `src/shared/hooks/useAudioEngine.ts` |
| PWA | Workbox injectManifest | `public/manifest.json`, `src/sw.ts` |
| Native | Capacitor (scaffold ready, not built) | `capacitor.config.ts` |

---

## BACKLOG PRIORITIES (as of 2026-03-31)

### P0 — Blockers
- [x] Google OAuth — ✅ Supabase enabled + Google Cloud redirect URI set (2026-03-31)
- [x] `useFocusSession.ts` — ✅ 335 lines (decomposed in prior sprint)
- [x] `SettingsPage.tsx` — ✅ 48 lines (decomposed in prior sprint)
- [x] `src/store/index.ts` — ✅ 163 lines (decomposed in prior sprint)

### P1 — User-facing gaps
- [ ] Audio: BreathworkRitual has zero audio (visual only)
- [ ] Audio: volume default too quiet at 0.55 (maps to gain ~0.009)
- [ ] Google Calendar: inbound sync missing (one-way only)
- [ ] Push notifications: pg_cron needs enabling in Supabase Dashboard

### P2 — Quality
- [ ] QuickCapture: "today" / "tomorrow" without time shows no dueTime (expected)
- [ ] TodayPage: no "add task for today" shortcut when pool is empty but tasks exist in NEXT
- [ ] HistoryPage: no search/filter (large history unnavigable)
- [ ] Onboarding: no progress indicator on steps

### P3 — Polish
- [ ] Play Store: 8 screenshots need manual capture (`scripts/capture-screenshots.ts`)
- [ ] Feature graphic 1024×500 (needs design)
- [ ] In-App Review API trigger (code ready: `useInAppReview.ts`)

---

## FILE REGISTRY (key files only — full list in CLAUDE.md)

### Over guardrail (>400 lines) — needs decomposition
- `src/features/auth/AuthScreen.tsx` — 540 lines ⚠️
- `src/features/mochi/MochiChat.tsx` — 491 lines ⚠️
- `src/features/focus/FocusScreen.tsx` — 465 lines ⚠️
- `src/features/tasks/TasksPage.tsx` — 418 lines ⚠️
- `src/features/focus/MonthlyReflection.tsx` — 412 lines ⚠️

### Already decomposed (previously in this list — resolved)
- `src/store/index.ts` — 163 lines ✅ (slices in `src/store/slices/`)
- `src/features/settings/SettingsPage.tsx` — 48 lines ✅
- `src/features/focus/useFocusSession.ts` — 335 lines ✅
- `src/features/focus/FocusSetup.tsx` — 207 lines ✅ (FocusSetupHeader/TaskPicker/DurationPicker/SoundPicker)
- `src/features/progress/ProgressPage.tsx` — 109 lines ✅

### Core orchestrators
- `src/app/App.tsx` — Router + overlay priority logic
- `src/app/AppShell.tsx` — Layout, offline bar, friction nudge
- `src/features/today/TodayPage.tsx` — Default route, daily view
- `src/features/focus/FocusScreen.tsx` — Focus orchestrator

### Supabase edge functions (13 deployed)
- `decompose-task` · `recovery-message` · `weekly-insight`
- `classify-voice-input` · `mochi-respond` · `gdpr-export` · `gdpr-delete`
- `scheduled-push` · `gcal-store-token` · `gcal-sync`
- `telegram-webhook` · `stripe-webhook` · `send-magic-link`

### Infrastructure
- `supabase/migrations/` — 13 migrations applied
- `.github/workflows/e2e-production.yml` — runs on Vercel deploy
- `scripts/capture-screenshots.ts` — Play Store screenshots
- `scripts/translate.mjs` — auto-translate en.json → other locales
