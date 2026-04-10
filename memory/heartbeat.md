# MindShift Heartbeat
**Updated:** 2026-04-10
**Sprint:** Sprint AG (Agents + Community + Economy) — deploy pending
**Session:** ongoing

## Last 4 Sprints
- Sprint AG (AG-1→AG-5): agents DB, communities, crystal ledger, shareholder positions, economy dashboard, LLM router, 5 AI agents seeded, BottomNav Globe tab, 56 i18n keys, 20/20 E2E
- BATCH-2026-04-04-R: feature graphic 1024×500 (Playwright render)
- BATCH-2026-04-04-Q: 8-agent audit, 15 fixes, a11y focus rings, analytics events
- BATCH-2026-04-04-P: room_created/joined/session_started analytics, Play Store screenshots

## APIs Changed
- agent-chat edge function: ADDED | POST /functions/v1/agent-chat | JWT required, 20/day rate limit
- community-join edge function: ADDED | POST /functions/v1/community-join | JWT required, 5/hr rate limit
- publish-revenue-snapshot: ADDED | POST /functions/v1/publish-revenue-snapshot | ADMIN_EMAIL gate
- telegram-agent-update: ADDED | internal cron only | x-cron-secret header
- volaura-bridge-proxy: unchanged | breaking: no

## Events Changed
- crystal_earned: CONFIRMED in crystal_ledger via earn_focus_crystals() RPC | payload: { amount, source_event, balance_after }
- community_joined: ADDED | via community-join edge function → volaura-bridge-proxy (best-effort)
- dividend_accrued: ADDED | via distribute_dividends() RPC | payload: { user_id, snapshot_id, amount }

## Blocked By Other Products
- VOLAURA: POST /api/character/events endpoint still not built — crystal events can't flow upstream
- VOLAURA: GET /api/character/state endpoint still not built — can't show AURA badge in MindShift
- CEO: GROQ_API_KEY, ADMIN_EMAIL, TELEGRAM_BOT_TOKEN not yet set in Supabase secrets

## Planning That Affects Others
- 7 pending migrations (019_v2 → 024) add: agents, communities, crystal_ledger, shareholder_positions, revenue_snapshots tables
- shareholder_positions schema: staked_crystals column (NOT share_units — renamed in 019_v3)
- Crystal economy now in Supabase, not just VOLAURA — ecosystem-contract.md must stay synced
- Telegram bot will send proactive daily messages (08:57 UTC) once TELEGRAM_BOT_TOKEN is set

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
