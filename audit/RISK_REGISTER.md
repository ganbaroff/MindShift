# MindShift — Risk Register
## Pre-Acquisition Due Diligence · All Sprints Consolidated

**Last updated:** 2026-06-06  
**Total findings:** 32 (1 Critical · 4 High · 8 Medium · 19 Low)

---

## Severity Definitions

| Severity | Definition |
|----------|-----------|
| **CRITICAL** | Blocks deployment or causes data loss / service unavailability on fresh install |
| **HIGH** | Security exposure or significant user-facing degradation; fix before go-live |
| **MEDIUM** | Addressable within first sprint; does not block launch |
| **LOW** | Advisory; fix in normal sprint cadence |

---

## CRITICAL

| ID | Sprint | File(s) | Description | Recommended Fix |
|----|--------|---------|-------------|----------------|
| CRIT-01 | S2 | `supabase/migrations/` | `daily_tasks` and `usage_limits` tables referenced in ADRs and TypeScript types but DDL is absent from migrations. Fresh deploy throws Postgres 42P01. | Recover from git history or reconstruct DDL from TypeScript types. Apply as migration 025/026. |

---

## HIGH

| ID | Sprint | File(s) | Description | Recommended Fix |
|----|--------|---------|-------------|----------------|
| HIGH-01 | S1 | `check-secrets.ps1` | Supabase Personal Access Token hardcoded in PowerShell utility script. Grants full Supabase management API access if repo is made public. | Rotate token immediately. Use `$env:SUPABASE_PAT`. |
| HIGH-02 | S3 | `src/store/index.ts`, `src/store/*Slice.ts` | Circular dependency chains bloat bundle to 233 kB gzip (55% over 150 kB target). | Break circular imports. Use `npx vite-bundle-visualizer` to identify top contributors. |
| HIGH-03 | S6 | `supabase/functions/mochi-respond/index.ts` | If `GEMINI_API_KEY` is absent, AI silently falls back to 3 hardcoded messages. No operational alerting. | Add startup log + Sentry alert when AI provider unavailable. |
| HIGH-04 | S6 | `supabase/functions/mochi-respond/index.ts`, `_shared/llm.ts` | Three AI call paths (Cerebras → direct Gemini → `callLLM`) are undocumented. New engineers may extend one path without knowing the others exist. | Document all three paths in function header. Add to ROUTER-CONTRACT.md. |

---

## MEDIUM

| ID | Sprint | File(s) | Description | Recommended Fix |
|----|--------|---------|-------------|----------------|
| S2-01 | S2 | `supabase/migrations/016_rate_limits.sql` | `edge_rate_limits` table likely lacks composite index on `(user_id, fn_name, window_start)`. High-volume AI calls may cause sequential scans. | Add `CREATE INDEX CONCURRENTLY idx_edge_rate_limits_lookup ON edge_rate_limits(user_id, fn_name, window_start)`. |
| S2-02 | S2 | ADRs | `increment_rate_limit` RPC relies on `pg_advisory_xact_lock` which is transaction-scoped. Verify the Supabase connection pool mode (session vs. transaction pooler) — transaction pooler may release lock early. | Confirm Supabase pooler mode is `session` for advisory lock functions. |
| S3-01 | S3 | `src/shared/hooks/useAudioEngine.ts` | `AudioWorklet` registration has no browser fallback. If `AudioWorklet` is unavailable, ambient audio fails silently with no user notification. | Add `if (!('AudioWorklet' in AudioContext.prototype))` check and show a toast. |
| S3-02 | S3 | `public/manifest.webmanifest` | `start_url` in PWA manifest may not align with Vercel deployment base path if subdirectory deployment is used. | Verify `start_url` matches `VITE_BASE_URL` in the build config. |
| S4-01 | S4 | `supabase/functions/gdpr-export/index.ts` | GDPR export endpoint has no per-user rate limit. A malicious actor with a valid JWT could trigger many large data exports. | Add `checkDbRateLimit` call: 5 exports/hour per user. |
| S5-01 | S5 | `src/features/focus/useFocusSession.ts:50-55` | `PHASE_LABELS` are hardcoded English strings rendered on the session screen for all 6 locales. | Move to i18n keys: `focus.phaseLabel.struggle`, `.release`, `.flow`, `.recovery`. |
| S5-02 | S5 | `src/features/onboarding/OnboardingPage.tsx:342-356` | Decorative step-indicator dots are animated `motion.div` elements not marked `aria-hidden="true"`. AT may read them as interactive. | Add `aria-hidden="true"` to each dot `motion.div`. |
| S6-03 | S6 | `src/features/focus/useFocusSession.ts` + 4 sub-hooks | Session FSM state transitions distributed across 5 hooks — no canonical transition map. New engineers must trace all 5 files. | Add FSM transition diagram to `docs/FOCUS-SESSION-FSM.md`. |
| S6-04 | S6 | `supabase/functions/mochi-respond/index.ts:181-195` | `isPro` check reads `users.subscription_tier` — if this query fails silently, pro users are throttled at free limits. | Add error check on DB result; log warning when fallback to free limits occurs. |

---

## LOW

| ID | Sprint | File(s) | Description | Recommended Fix |
|----|--------|---------|-------------|----------------|
| S1-01 | S1 | `README.md` | README is Vite template placeholder — no stack diagram, setup steps, or env var list. | Replace with full `HANDOVER_PACKAGE.md` content (already written). |
| S1-02 | S1 | `.github/workflows/ci.yml` | CI uses `npm ci` but `package-lock.json` is not audited for integrity. Add `npm audit --audit-level=high` as a CI step. | Add `npm audit --audit-level=high` step after `npm ci`. |
| S3-03 | S3 | `src/sw.ts` | Service worker cache busting relies on Vite hash filenames. If a deploy fails mid-way, old SW may serve stale assets to users. | Add a cache version number as a Vite env var to force SW update on deploy. |
| S3-04 | S3 | `src/features/focus/ArcTimer.tsx` | Timer SVG arc uses `strokeDashoffset` animation. On low-end Android devices with 60Hz displays, SVG stroke animations can drop frames. | Profile on mid-range device; consider CSS animation fallback. |
| S3-05 | S3 | Build output | Source maps are enabled in production (`build.sourcemap: true`). Exposes original source code to end-users via browser DevTools. | Set `sourcemap: false` for production; keep for Sentry via `sourcemap: 'hidden'`. |
| S4-02 | S4 | `supabase/functions/_shared/cors.ts` | CORS `allowedOrigins` list should be verified against all production domains (mindshift.app, VOLAURA bridge). | Run `grep -r allowedOrigins` and confirm all production origins are listed. |
| S4-03 | S4 | `src/shared/lib/sentry.ts` | Sentry is on the free tier (5K events/month). ADHD community users who share the product aggressively may blow past this within weeks of viral growth. | Upgrade Sentry plan as part of post-acquisition action. |
| S5-03 | S5 | `src/features/mochi/MochiChat.tsx:91-99` | `FIRST_TIME_GREETS` and `RETURN_GREETS` arrays are hardcoded English strings. | Move to i18n keys `mochi.firstGreet.*` and `mochi.returnGreet.*`. |
| S5-04 | S5 | `src/shared/lib/haptic.ts` | `hapticWarning` (40 ms gaps) and `hapticError` (20 ms gap) are below the LRA decay threshold documented in the codebase's own comments (≥50 ms). | Increase `hapticWarning` to `[20, 55, 20, 55, 20]` and `hapticError` to `[10, 55, 10]`. |
| S5-05 | S5 | `src/features/focus/BreathworkRitual.tsx:151-177` | Decorative breathing orb animation not marked `aria-hidden="true"`. | Add `aria-hidden="true"` to outer animated `div`. |
| S5-06 | S5 | `src/shared/lib/crisisDetection.ts` | Crisis keywords cover EN and RU only — Turkish, German, Spanish, Azerbaijani not covered. | Add keyword lists for all 6 supported locales. |
| S5-07 | S5 | `src/features/mochi/MochiChat.tsx:199` | Error fallback message is hardcoded English. | Use `t('mochi.errorFallback')` i18n key. |
| S5-08 | S5 | `src/shared/lib/crisisDetection.ts:76` | `import` statement appears mid-file after an `export`. Unconventional but not a runtime error. | Move import to file top. |
| S6-05 | S6 | `src/features/mochi/MochiChat.tsx:143` | `exchanges` variable in `saveMemory()` computed and discarded. Dead code. | Remove the variable and the `void exchanges` line. |
| S6-06 | S6 | `src/features/focus/useFocusSession.ts:218-221` | `earn_focus_crystals` called as untyped RPC (`as never`). Schema change would fail silently at runtime. | Add Supabase typed RPC wrapper or a comment with schema reference. |
| S6-07 | S6 | `src/store/achievementSlice.ts` | Achievements are IDB-backed, not server-backed. Users lose achievements on storage clear or device change. | Document known limitation. Consider server-sync for achievements in v2. |
| S6-08 | S6 | `supabase/functions/_shared/llm.ts:217` | `resolveChain` only explicitly caps `free → max_quality`. Other tier/policy combos are undocumented. | Add explicit comments for all tier × policy mappings. |
| S3-06 | S3 | `vite.config.ts` | `manualChunks` config may need tuning after circular dependency fix — chunk split points may change. | Re-run bundle visualizer after circular dep fix. |

---

## Not-a-Finding Notes

The following were investigated and found to be **correctly implemented**:
- `verify_jwt` usage — JWT validated by Supabase client, not custom implementation ✅
- `pg_advisory_xact_lock` in `increment_rate_limit` — atomic across isolates ✅
- `navigator.vibrate()` iOS handling — documented, settings hint carries "(Android only)" ✅
- PKCE auth flow — `flowType: 'pkce'` confirmed in Supabase client config ✅
- Crisis detection → not sent to AI — verified in `MochiChat.tsx` line 161–173 ✅
- `useMotion()` reduced-motion gating — 100% consistent across all animated components ✅
- Recovery lock "bypass always visible" — `onBypass` button visible at all times ✅
- Crystal shop removal from vulnerability window (post-session) — `Research #10` documented ✅
