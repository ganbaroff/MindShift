# CEO Task Tracker — Yusif's Pending Actions

**Purpose:** Atlas tracks CEO-only tasks. These block launch — no agent can substitute.
**Updated:** 2026-07-06 (Atlas — added 🔒 SECURITY section from authz audit)

---

## 🔴 LAUNCH BLOCKERS (only you can do these)

| # | Task | Overdue since | Time needed | Impact |
|---|------|---------------|-------------|--------|
| 1 | **Google Play verification** — complete account verification | Apr 4 (80 days) | varies | Blocks Android distribution entirely |
| 2 | **Play Store listing** — Data Safety form + Content Rating + upload AAB (4.3 MB ready) | Apr 4 (80 days) | ~30 min | Blocks Android beta |
| 3 | **Supabase: Google OAuth provider** — enable in Dashboard → Auth → Providers | Apr 4 (80 days) | 5 min | Enables social login (only magic link works now) |
| 4 | **Supabase: pg_cron activation** — enable in Dashboard → Database → Extensions | Apr 4 (80 days) | 2 min | Enables scheduled push notifications |
| 5 | **Secret rotation** — Supabase service role key + Sentry auth token + NVIDIA key | Apr 4 (80 days) | 15 min | ⚠️ SECURITY: keys potentially leaked, still unrotated |
| 6 | **Gemini budget cap** — Google AI Studio → Project → Budget alert | Apr 4 (80 days) | 5 min | Prevents surprise billing |

## 🔒 SECURITY — authz audit 2026-07-06 (report: `audit/SECURITY-AUDIT-2026-07-06-authz.md`)

| # | Task | Owner | Status | Impact |
|---|------|-------|--------|--------|
| S1 | **creator-pult**: `supabase secrets set PULT_WEBHOOK_SECRET=<rand 32+ch>` → re-register @CreatorBy_bot webhook with that `secret_token` (steps in file header) | CEO (restores pult) | ✅ **HARDENED + DEPLOYED** (v3; live curl: burned `?k=` key now returns 500 — key **DEAD**). Pult is safely **offline** until you set the secret + re-register. | 🟠 HIGH — now closed at the code layer; only your secret restores service |
| S2 | **earn_focus_crystals (CRITICAL)** | Atlas | ✅ **FIXED in prod** — migration `035` applied + verified. RPC ignores client amount, server-derives from `focus_sessions` (duration_ms×5, clamped), idempotent per session. No client change needed. | 🔴 CRITICAL — closed |
| S3 | **Enable leaked-password protection** (Supabase → Auth → HaveIBeenPwned) — still OFF | CEO | ~2 min dashboard toggle | Breached passwords accepted at signup |
| S4 | subscriptions latent self-grant + agent-chat prompt-injection guard | Atlas | Queued (low sev, safe standalone edits) | Billing foot-gun; brand-surface guardrail bypass |

## 🟡 DISTRIBUTION (first 20 users)

| # | Task | Time needed | Impact |
|---|------|-------------|--------|
| 7 | **Post to r/ADHD** — "I built an ADHD focus app, looking for beta testers" + PWA link | 20 min | First real users |
| 8 | **LinkedIn carousel post** — text+PDF ready at `public/linkedin-carousel.pdf` | 5 min (upload) | Professional visibility |
| 9 | **Telegram bot webhook** — `supabase secrets set TELEGRAM_BOT_TOKEN=...` + register | 10 min | Enables bot-based task creation |

## ✅ COMPLETED

| Task | When |
|------|------|
| Capacitor install + Gradle + JDK 21 | Apr 4 |
| Supabase API keys sent | Apr 4 |
| Telegram bot token sent | Apr 4 |
| 17 research documents sent | Apr 4-5 |
| Code: 26 sprints shipped (A→AG) | Apr–Jun |
| Code: 227 tests passing, tsc clean | Jun 24 |
| Android native resources tracked in git | Jun 24 |

---

## THE TRUTH (from strategic audit 2026-06-24)

MindShift is code-complete. 15 routes, AI mascot, community, economy, 227 tests, live on Vercel. **But 0 users besides you.** The code is at 95th percentile quality. Distribution is at 0th percentile. The product doesn't need more code — it needs its first 20 users. Every day without users is a day without learning what's actually wrong.
