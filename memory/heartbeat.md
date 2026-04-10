# MindShift Heartbeat
**Updated:** 2026-04-10
**Sprint:** Sprint AG (Agents + Community + Economy) — DEPLOYED ✅
**Session:** ongoing

## Last 4 Sprints
- Sprint AG (AG-1→AG-5): agents DB, communities, crystal ledger, shareholder positions, economy dashboard, LLM router, 5 AI agents seeded, BottomNav Globe tab, 56 i18n keys, 20/20 E2E. **PROD DEPLOYED 2026-04-10.**
- BATCH-2026-04-04-R: feature graphic 1024×500 (Playwright render)
- BATCH-2026-04-04-Q: 8-agent audit, 15 fixes, a11y focus rings, analytics events
- BATCH-2026-04-04-P: room_created/joined/session_started analytics, Play Store screenshots

## APIs Changed
- agent-chat edge function: DEPLOYED ✅ | POST /functions/v1/agent-chat | JWT required, 20/day rate limit | 8s timeout via Promise.race
- community-join edge function: DEPLOYED ✅ | POST /functions/v1/community-join | JWT required, 5/hr rate limit | advisory lock in join_community()
- publish-revenue-snapshot: DEPLOYED ✅ | POST /functions/v1/publish-revenue-snapshot | JWT + ADMIN_EMAIL gate
- telegram-agent-update: DEPLOYED ✅ | internal cron 08:57 UTC | x-cron-secret header | pg_cron job active

## Production DB State (verified 2026-04-10)
- agents: 5 rows (mochi/guardian/strategist/coach/scout)
- communities: 3 rows (foundation-club/deep-focus-collective + 1 seed)
- shareholder_positions.staked_crystals: ✅ column exists (was share_units in 018)
- agents.llm_policy: ✅ column exists
- revenue_snapshots.dividend_per_share_crystal: ✅ column exists
- security hardening: ✅ REVOKE on distribute_dividends + grant_share_crystals applied

## Secrets Set in Supabase (2026-04-10)
- GROQ_API_KEY ✅ (from VOLAURA/apps/api/.env)
- TELEGRAM_BOT_TOKEN ✅ (from VOLAURA/apps/api/.env)
- ADMIN_EMAIL ✅ (ganbarov.y@gmail.com)
- NVIDIA_API_KEY ✅ (from mindshift/.env)
- CRON_SECRET ✅ (regenerated 2026-04-10, saved to .env.local)

## Known Limitation (non-blocking)
- app.cron_secret GUC: NOT SET — requires superuser (ALTER DATABASE). Supabase management API role denied.
  Impact: pg_cron sends empty x-cron-secret header → telegram-agent-update returns 500 on scheduled runs.
  Workaround: manual invocation with correct header works. Daily bot message won't auto-fire until GUC set.
  Fix path: Supabase Dashboard → SQL Editor → `ALTER DATABASE postgres SET "app.cron_secret" = '<CRON_SECRET from .env.local>';`

## Events Changed
- crystal_earned: CONFIRMED in crystal_ledger via earn_focus_crystals() RPC | payload: { amount, source_event, balance_after }
- community_joined: DEPLOYED | via community-join edge function → volaura-bridge-proxy (best-effort)
- dividend_accrued: DEPLOYED | via distribute_dividends() RPC | payload: { user_id, snapshot_id, amount }

## Blocked By Other Products
- VOLAURA: POST /api/character/events endpoint still not built — crystal events can't flow upstream
- VOLAURA: GET /api/character/state endpoint still not built — can't show AURA badge in MindShift

## Growth Agent Findings (2026-04-10) — P1 items for next sprint
- RISK 1 (Critical): Foundation Club SHARE crystal circular dependency — no earn path for non-shareholders. 10,000 SHARE = unreachable.
- RISK 2 (High): Guest dead-end on community tab — no sign-in CTA when userId starts with guest_
- RISK 3 (High): No daily re-entry hook after joining community — Day-7 retention impact near zero
- QUICK WIN: useAgentChat.ts line 73 hardcoded 'Come back tomorrow' → warm i18n key (30 min)
- QUICK WIN: CommunityScreen guest state → sign-in prompt with agent catchphrase (2-3h)
- QUICK WIN: Show SHARE earn path (or honest 'coming soon') in EconomyDashboard CRYSTAL_RULES (15 min)

## Planning That Affects Others
- 7 pending migrations (019→024) applied — crystal_ledger, shareholder_positions, revenue_snapshots tables live
- shareholder_positions schema: staked_crystals column ✅ (was share_units in 018 — fixed in 020)
- Crystal economy now in Supabase — ecosystem-contract.md must stay synced
- Telegram bot: cron job active but GUC needed for auth header (see Known Limitation above)

## Skills This CTO Has (that others don't)
- pdf-generation: Playwright HTML → PDF (LinkedIn carousels)
- screenshot-capture: Playwright viewports → PNG (Play Store assets)
- html-to-image: DOM → PNG at 2x retina (share cards)
- humanizer: AI-ism removal from text
- e2e-runner: Playwright chromium + iPhone 14 mobile testing
- bundle-analyzer: Vite chunk analysis + CI gate
- a11y-scanner: WCAG 2.2 AA compliance checking
- sec-agent: pre-deploy migration security review
- infra-agent: edge function deployment planning
