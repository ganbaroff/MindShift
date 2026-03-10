# MindShift — Pre-Production Deploy Checklist

**Stack:** React 19 + Vite 7 + Supabase + Vercel | **PWA** | **Branch:** `fix/mobile-ux-bugs`
**Last reviewed:** 2026-03-09 | **Skill:** engineering:deploy-checklist

> Complete every section in order. Do not skip steps. Sign off with date + initials.

---

## 0. Pre-Requisites (Before Starting)

- [ ] You are on a **Linux or macOS** machine (not Windows) — rollup binary must match
- [ ] Run `npm install` to ensure correct platform binaries are present
- [ ] All WIP is committed or stashed — working tree is clean (`git status`)
- [ ] You have Supabase CLI installed and authenticated (`supabase status`)
- [ ] You have Vercel CLI installed (`vercel --version`)

---

## 1. Code Quality Gate

```bash
# Run in order — all must pass before proceeding
npx tsc --noEmit           # TypeScript: 0 errors
npm run lint               # ESLint: 0 violations
npm run test               # vitest: all 78 tests passing
npm run build              # Vite build: 0 errors, 0 warnings
```

- [ ] `npx tsc --noEmit` → **0 errors** ✓
- [ ] `npm run lint` → **0 violations** ✓
- [ ] `npm run test` → **78/78 passing** ✓
- [ ] `npm run build` → builds without errors ✓
- [ ] Bundle gzip size is **≤ 120 kB** (baseline: 98 kB — alert if regression >20%)

> **STOP HERE if any step fails.**

---

## 2. Database Migrations

All migrations are in `supabase/migrations/`. Check which are already applied:

```bash
supabase db diff          # Shows pending migrations
supabase migration list   # Shows applied vs pending
```

Current migrations (applied in order):
- [x] `001_init.sql` — base schema
- [x] `002_subscriptions.sql` — push subscriptions
- [x] `003_dashboard_config.sql` — user dashboard config
- [x] `004_edge_rate_limits.sql` — rate_limits table + RPC
- [x] `005_consent.sql` — GDPR consent tracking
- [x] `006_audit_fixes.sql` — Row Level Security fixes

**For each new migration being deployed:**
- [ ] Migration is tested on a local Supabase instance (`supabase start`)
- [ ] Migration is backward-compatible (no column drops without transition period)
- [ ] If altering `tasks` or `focus_sessions` table: verify `partialize` in store matches schema
- [ ] RLS policies verified — users can only access their own rows
- [ ] `supabase db push` to staging environment first

---

## 3. Edge Functions

Deploy all functions to staging before production:

```bash
supabase functions deploy decompose-task
supabase functions deploy recovery-message
supabase functions deploy weekly-insight
supabase functions deploy gdpr-export
supabase functions deploy gdpr-delete
```

- [ ] `GEMINI_API_KEY` secret is set in Supabase dashboard (`supabase secrets list`)
- [ ] CORS origin allowlist includes the production URL (check `_shared/cors.ts`)
- [ ] **Remove/audit** any `ngrok` dev URLs from the CORS allowlist before production deploy
- [ ] Rate limits are configured correctly per function:
  - `decompose-task`: 20 calls/user/hour
  - `recovery-message`: 5 calls/user/day
  - `weekly-insight`: 3 calls/user/day
- [ ] Each function tested manually via Supabase Dashboard → Edge Functions → Test
- [ ] `null` count bug in `rateLimit.ts` verified (treat null as 0, not allow-all)

---

## 4. Environment Variables

Verify all required env vars are set in Vercel:

```
VITE_SUPABASE_URL         → https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY    → eyJ... (anon/public key only — never service key)
VITE_SENTRY_DSN           → https://...@sentry.io/... (optional but recommended)
```

- [ ] `VITE_SUPABASE_URL` — production project URL (not local)
- [ ] `VITE_SUPABASE_ANON_KEY` — anon key (public, safe to expose in bundle)
- [ ] `VITE_SENTRY_DSN` — Sentry DSN for error tracking (set if using Sentry)
- [ ] **No service role key** anywhere in Vercel env vars (would be catastrophic)
- [ ] **No Gemini API key** in Vercel env vars (Edge Functions only, set in Supabase)

---

## 5. PWA Verification

- [ ] `manifest.json` has correct `start_url`, `theme_color`, `background_color`
- [ ] All 3 icon sizes present in `public/`: `icon-192.png`, `icon-512.png`, `icon-512-maskable.png`
- [ ] Service worker builds without errors (check Vite output for `sw.js`)
- [ ] `registerType: 'autoUpdate'` — existing users will auto-update silently
- [ ] Test PWA install flow on a real iOS device (Safari → Add to Home Screen)
- [ ] Test PWA install flow on Android (Chrome → Install App)

---

## 6. Staging Deploy & Smoke Tests

```bash
vercel --prod=false  # Deploy to preview URL
```

Deploy to staging (Vercel preview) and verify all 7 core flows:

### Auth Flow
- [ ] Magic link email arrives within 60s
- [ ] Clicking link logs in and redirects to onboarding (new user) or home (returning)
- [ ] Consent checkbox required before sending link
- [ ] "← Use a different email" back button works

### Onboarding Flow
- [ ] 3 steps complete without errors
- [ ] Back button works between steps
- [ ] Sample tasks appear in NOW/NEXT after onboarding
- [ ] Progress bar advances correctly

### Task Loop
- [ ] Add task (text) → appears in NOW or NEXT
- [ ] Voice input works (Chrome/Edge only — graceful fallback text shown on Safari)
- [ ] AI decomposition ("✨ Break it down for me") returns steps
- [ ] Complete task → confetti + XP toast + achievement (if first task)
- [ ] Park it → task moves to NEXT
- [ ] XP total increments in Supabase DB

### Focus Session
- [ ] Duration presets select correctly (5, 25, 52 min + custom)
- [ ] Smart default shows correct duration based on energy level
- [ ] Session starts, ArcTimer animates
- [ ] Phase labels change: "Getting into it..." → "Finding your flow..." → (digits vanish at 15m)
- [ ] Interrupt → "interrupt-confirm" screen → "Resume" returns to session
- [ ] Bookmark capture → text saved to localStorage
- [ ] Session end → "Time to breathe 🌿" screen (2 min) → recovery lock (10 min)
- [ ] Session saved to `focus_sessions` table in Supabase
- [ ] `?quick=1` URL param → 5-min auto-start

### Audio
- [ ] Brown noise plays (no gap/seam after 30s of listening)
- [ ] Pink noise plays
- [ ] Volume slider works (logarithmic feel)
- [ ] dBA warning appears at >80% slider
- [ ] Audio stops when leaving Focus screen

### Progress Screen
- [ ] XP bar renders correctly
- [ ] Avatar matches current level
- [ ] Weekly consistency chart renders (or shows empty state gracefully)
- [ ] "Generate insight" calls edge function, shows result or fallback
- [ ] Achievements show as locked/unlocked correctly

### Settings
- [ ] Avatar selector changes avatar
- [ ] "Export my data" triggers GDPR export edge function
- [ ] Sign out clears session and shows AuthScreen

### Recovery Protocol
- [ ] Trigger by setting `lastSessionAt` to 73h ago in localStorage → refresh
- [ ] Overlay appears with welcome message
- [ ] Overdue tasks archived (check `somedayPool`)
- [ ] Micro-win chips work
- [ ] "Let's go →" adds task and dismisses
- [ ] "Skip" dismisses without adding task

---

## 7. Mobile Device Testing

Test on actual devices, not just browser DevTools:

- [ ] **iPhone (Safari iOS 15+):** PWA install, magic link, focus session, audio
- [ ] **Android (Chrome):** PWA install, voice input, BentoGrid drag-and-drop
- [ ] Safe area padding correct on iPhone with home bar (no content clipped)
- [ ] BottomNav above system home indicator
- [ ] Touch targets are ≥44px (verified by trying to tap small elements)
- [ ] No horizontal scroll on any screen

---

## 8. Accessibility Spot-Check

- [ ] VoiceOver (iOS) can navigate home screen and add a task
- [ ] AddTaskModal is announced as a dialog with title
- [ ] Difficulty and Duration groups are announced with correct group labels
- [ ] Color contrast sufficient in browser DevTools (Lighthouse ≥ 90 accessibility score)

---

## 9. Security Checklist

- [ ] No hardcoded API keys or secrets in source code (`git grep -i "AIza\|sk-\|service_role"`)
- [ ] No `console.log` statements exposing sensitive user data
- [ ] Supabase RLS enabled on all tables: `tasks`, `focus_sessions`, `users`, `rate_limits`
- [ ] CORS allowlist in `_shared/cors.ts` does NOT include wildcard `*` or dev ngrok URLs in prod
- [ ] JWT verification happens before any Edge Function business logic
- [ ] GDPR: user can export and delete their data (tested in step 6)
- [ ] Magic link `emailRedirectTo` points to production URL, not localhost

---

## 10. Production Deploy

```bash
vercel --prod   # Deploy to production
```

- [ ] Vercel deployment succeeded (no build errors in Vercel dashboard)
- [ ] Production URL loads without errors
- [ ] Check Vercel Functions log for any edge function errors
- [ ] Monitor Sentry for 15 minutes post-deploy (if DSN configured)

---

## 11. Post-Deploy Verification

**Within 15 minutes of deploy:**

- [ ] Auth flow works on production URL (send a real magic link to yourself)
- [ ] Add a task and complete it — check Supabase DB that row was written
- [ ] Start a 5-minute focus session — check `focus_sessions` row in DB
- [ ] No new errors appearing in Sentry
- [ ] Vercel analytics (if enabled) showing page loads

**Within 1 hour:**

- [ ] Check Supabase DB metrics — no unusual query load
- [ ] Check Edge Function invocation counts — within expected range
- [ ] Gemini API usage dashboard — rate limiter working (no unexpected spikes)

---

## 12. Rollback Plan

**If any critical issue is found post-deploy:**

1. Identify: Is it frontend (Vercel) or backend (Supabase)?
2. **Frontend rollback:** `vercel rollback` (instantly rolls back to previous deployment)
3. **Edge Function rollback:** `supabase functions deploy <fn> --legacy` (redeploy previous version)
4. **DB migration rollback:** (manual — run inverse SQL — must be prepared in advance for each migration)

**Rollback triggers (deploy should be reverted if):**
- Auth / magic link completely broken
- Task creation or completion silently fails (data loss risk)
- Focus session not saving to DB
- Any screen shows a white/black blank screen to users
- Sentry error rate spikes >5% of sessions within 15 minutes

---

## 13. Release Notes Update

After successful deploy, update:

- [ ] `CLAUDE.md` — update Status field if moving from beta to production
- [ ] Git tag: `git tag v[version] && git push origin v[version]`
- [ ] Add entry to `CHANGELOG.md` (if maintained)
- [ ] Notify beta testers (if applicable)

---

## Sign-Off

| Role | Name | Date | Notes |
|------|------|------|-------|
| Developer | Yusif | | |
| QA | | | |

---

## Quick Reference — Critical Paths to Always Verify

If time-constrained, at minimum verify these 5 paths:

1. **Magic link auth** → new user onboarding → home screen
2. **Add task** → complete task → XP increments in DB
3. **Start focus session** → complete → session saved to DB
4. **Open app after 72h** → RecoveryProtocol shows → dismisses cleanly
5. **iPhone Safari** → safe area padding correct + audio plays
