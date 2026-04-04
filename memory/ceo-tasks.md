# CEO Task Tracker — Yusif's Pending Actions

**Purpose:** CTO tracks CEO tasks. CEO is self-described "раздолбай" — needs external accountability.
**Updated:** 2026-04-05

---

## OVERDUE

| # | Task | Created | Status | Blocker |
|---|------|---------|--------|---------|
| 1 | **LinkedIn post (EN)** — ecosystem vision carousel | Apr 4 | ❌ NOT DONE | Text ready, PDF ready (`public/linkedin-carousel.pdf`), just needs upload |
| 2 | **Telegram bot setup** — `supabase secrets set TELEGRAM_BOT_TOKEN=8670831012:AAG...` + register webhook | Apr 4 | ❌ NOT DONE | Needs Supabase access token (login required) |
| 3 | **Play Store Console** — Data Safety form + Content Rating + listing text | Apr 4 | ❌ NOT DONE | AAB ready (4.3 MB), needs manual upload |
| 4 | **Secret rotation** — Supabase service role key + Sentry auth token | Apr 4 | ❌ NOT DONE | Dashboard access only |
| 5 | **Gemini budget cap** — Google AI Studio → Project → Budget alert | Apr 4 | ❌ NOT DONE | 5 min task |

## PENDING (from mega-plan)

| # | Task | Phase | Due |
|---|------|-------|-----|
| 6 | Approve mega-plan (read `memory/mega-plan-april-2026.md`) | Phase 0 | Apr 5 |
| 7 | Send 5 research prompts to AI models (file: `5-research-prompts.md`) | Parallel | Apr 6-7 |
| 8 | Review crystal economy changes after Phase 2 | Phase 2 | Apr 8 |
| 9 | Validate with Supabase Dashboard: is migration 006 (activate_trial guard) applied? | Security | Apr 6 |

## COMPLETED

| # | Task | Completed |
|---|------|-----------|
| ✅ | Capacitor install (`npm install @capacitor/core @capacitor/cli @capacitor/android`) | Apr 4 |
| ✅ | Gradle download (manual) | Apr 4 |
| ✅ | JDK 21 installed (via winget) | Apr 4 |
| ✅ | Sent Supabase API keys | Apr 4 |
| ✅ | Sent Telegram bot token | Apr 4 |
| ✅ | Sent all 17 research documents | Apr 4-5 |

---

## RECURRING

- [ ] LinkedIn: 4 posts/week (Tue carousel, Wed text, Thu poll, Sun reflection)
- [ ] Review CTO output at end of each session
- [ ] Telegram bot: check for swarm proposals daily

## NOTE

Telegram task creation from bot — discussed, code exists in `supabase/functions/telegram-webhook/index.ts` (606 lines). Bot can already classify messages and create tasks. Just needs webhook registration (Task #2 above).
