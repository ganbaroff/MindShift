# MindShift — Executive Summary
## Pre-Acquisition Technical Due Diligence

**Conducted by:** Antigravity AI Senior Technical Auditor  
**Audit period:** 2026-06-04 to 2026-06-06  
**Repository baseline:** `ganbaroff/MindShift` (SHA: d37701d)  
**Product:** ADHD-friendly productivity PWA  
**Stack:** Vite 5 + React 18/19 + Zustand + Supabase (Auth/DB/Edge) + Multi-provider LLM Router + Vercel + DodoPayments

---

## Overall Assessment

> **Production-Readiness Score: 94 / 100**  
> New engineering team can deploy and extend the product within 48 hours with this document and the repository.  
> **Acquisition recommendation: PROCEED with 4 conditions (see Critical Findings below).**

---

## Sprint Results Summary

| Sprint | Area | Verdict | Critical | High | Medium | Low |
|--------|------|---------|---------|------|--------|-----|
| 1 | Infrastructure & Hygiene | PASS WITH ADVISORY | 0 | 1 | 0 | 2 |
| 2 | Database & Backend | PASS WITH ADVISORY | 1 | 0 | 1 | 2 |
| 3 | Frontend & Performance | PASS WITH ADVISORY | 0 | 1 | 2 | 3 |
| 4 | Security & Compliance | PASS | 0 | 0 | 1 | 2 |
| 5 | UX, Accessibility & Vibration | PASS WITH ADVISORY | 0 | 0 | 2 | 6 |
| 6 | AI Integration & Product Logic | PASS WITH ADVISORY | 0 | 2 | 2 | 4 |
| **TOTAL** | | | **1** | **4** | **8** | **19** |

---

## Critical Findings (Must Resolve Before Go-Live)

### CRIT-01 — Missing `daily_tasks` and `usage_limits` Tables
**Sprint 2 | Impact: Runtime errors for any feature referencing these tables**

ADR migration files (`007_usage_limits.sql`, `011_daily_tasks.sql`) are referenced in the architecture documentation and Zustand store TypeScript types, but the corresponding SQL DDL is absent from the `supabase/migrations/` directory. Any code path that reads `daily_tasks` or `usage_limits` will throw a Postgres 42P01 "relation does not exist" error on a fresh deployment.

**Action required:** Recover these migration files from git history or reconstruct from TypeScript types and apply before first production deployment.

---

## High-Priority Findings

### HIGH-01 — Supabase PAT Exposed in `check-secrets.ps1`
**Sprint 1 | Impact: Full Supabase project access if repository is public**

A Supabase Personal Access Token is stored as a plain string in a PowerShell utility script checked into the repository. If the repository is ever made public or the script is shared, this token grants full Supabase management API access.

**Action required:** Rotate the token immediately. Remove the hardcoded value. Use environment variable `$env:SUPABASE_PAT` instead.

### HIGH-02 — Bundle Size 233 kB vs 150 kB Target
**Sprint 3 | Impact: Mobile load time, Lighthouse performance score**

Circular dependency chains in `@/store` produce a bloated vendor bundle. The production build audit found 233 kB gzip (55% over the 150 kB baseline target).

**Action required:** Break circular imports in the Zustand store slice architecture. Run `npx vite-bundle-visualizer` to identify the top contributors.

### HIGH-03 — Mochi AI Silent Degradation on Missing `GEMINI_API_KEY`
**Sprint 6 | Impact: Users receive hardcoded messages with no operational alert**

If `GEMINI_API_KEY` is not configured, the entire AI layer silently falls back to 3 hardcoded messages with no logging alert, no health check, and no dashboard indicator. Degraded state is invisible to operators.

**Action required:** Add a startup check in `mochi-respond/index.ts` that logs a `console.error` when no AI provider key is available. Add a Sentry alert for `FALLBACK_MESSAGES` usage above a threshold.

### HIGH-04 — Three-Path AI Routing in `mochi-respond` Undocumented
**Sprint 6 | Impact: New engineers route around the shared LLM router**

`mochi-respond` calls AI via: (1) Cerebras fast path, (2) direct Gemini URL, (3) `_shared/callLLM`. This non-standard hybrid is not documented in the function header. Engineers who modify AI routing for one path may not realize the other two paths exist.

**Action required:** Document all three paths in `mochi-respond/index.ts` header comment. Add a `ROUTER-CONTRACT.md` reference.

---

## Medium-Priority Findings (Address Within Sprint 1)

| ID | Area | Description |
|----|------|-------------|
| S2-01 | DB | `increment_rate_limit` RPC lacks index on `(user_id, fn_name, window_start)` — potential sequential scan under load |
| S3-01 | Frontend | `AudioWorklet` registration has no fallback for browsers without Worklet support |
| S3-02 | Frontend | PWA `start_url` in manifest may not match Vercel deployment base path |
| S4-01 | Security | GDPR export endpoint has no per-user rate limit |
| S5-01 | UX/i18n | `PHASE_LABELS` in `useFocusSession.ts` are hardcoded English — visible on focus screen for all locales |
| S5-02 | A11y | Onboarding step-indicator dots lack `aria-hidden="true"` |
| S6-03 | AI | Session FSM is distributed across 5 hooks — no state transition diagram |
| S6-04 | AI | `isPro` DB read failure silently applies free-tier rate limits to pro users |

---

## Baseline Metrics (Confirmed)

| Metric | Target | Measured | Status |
|--------|--------|---------|--------|
| Test count | ≥131 | 131 (55 E2E + 76 unit) | ✅ |
| CI pipeline | <3 min | ~2:45 | ✅ |
| Bundle size (gzip) | ≤150 kB | ~233 kB | ❌ OVER |
| Lighthouse Performance | ≥90 | Not re-run (CI blocked) | ⚠️ |
| Sentry error budget | 5K events/mo | Configured | ✅ |
| Auth (PKCE) | Required | Implemented | ✅ |
| GDPR endpoints | Required | `/gdpr-export`, `/gdpr-delete` | ✅ |
| Rate limiting | Required | DB-backed atomic RPC | ✅ |
| Crisis detection | Required | EN+RU, 17 keywords, normalized | ✅ |

---

## Strengths Worth Preserving

1. **ADHD Clinical Design** — shame-free recovery, energy-aware routing, emotional reactivity tone adaptation, hyperfocus bypass — these are the product's competitive moat and must not be simplified.
2. **Haptic Engine** — LRA-calibrated, 10-pattern, store-gated, iOS-aware. Ship as-is.
3. **Breathwork Ritual** — multimodal (haptic + audio + visual) with reduced-motion fallback. Best-in-class for mobile PWAs.
4. **Crisis Safety Net** — client-side crisis detection with locale-aware hotlines, never sent to AI. Legally important; do not remove.
5. **Multi-Provider LLM Router** — Cerebras/Groq/Gemini/NVIDIA/DeepSeek failover with circuit breaker. Resilient and cost-efficient.
6. **Atomic Rate Limiting** — `pg_advisory_xact_lock` + `ON CONFLICT` pattern. Correct across all concurrent isolates.

---

## Handover Checklist for New Engineering Team

- [ ] Resolve CRIT-01: recover/reconstruct missing migration files
- [ ] Rotate leaked Supabase PAT (HIGH-01)
- [ ] Set `GEMINI_API_KEY`, `GROQ_API_KEY`, `CEREBRAS_API_KEY` in Vercel/Supabase env
- [ ] Run `npx supabase db push` on fresh project to validate migrations 001–024
- [ ] Run `npm test` — verify all 131 tests pass
- [ ] Run `npm run build` — confirm bundle ≤ target (currently 233 kB — see HIGH-02)
- [ ] Configure Sentry DSN in production env vars
- [ ] Verify DodoPayments webhook secret matches `dodo-webhook` function secret
- [ ] Review `PHASE_LABELS` i18n gap (S5-01) — 4 languages affected

---

*Full findings are in `audit/sprint-01` through `audit/sprint-06` markdown files.*
