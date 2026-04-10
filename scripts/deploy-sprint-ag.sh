#!/bin/bash
# deploy-sprint-ag.sh
# Run AFTER Yusif sets: GROQ_API_KEY, ADMIN_EMAIL, TELEGRAM_BOT_TOKEN, CRON_SECRET
# in Supabase Dashboard → Settings → Edge Functions → Secrets
#
# Also requires in Supabase SQL Editor ONCE:
#   ALTER DATABASE postgres SET "app.cron_secret" = '<CRON_SECRET_VALUE>';
#
# Usage:
#   bash scripts/deploy-sprint-ag.sh

set -e

echo "=== Sprint AG Deploy ==="
echo "Date: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

# Step 1: Verify tsc
echo "--- Step 1: TypeScript check ---"
npx tsc -b
echo "tsc: OK"
echo ""

# Step 2: db push (7 pending migrations)
echo "--- Step 2: supabase db push ---"
echo "Migrations to apply:"
echo "  019_v2_schema_gaps.sql"
echo "  019_v3_fix_shareholder_schema.sql"
echo "  020_seed_elite_community.sql"
echo "  021_crystal_earn_rpc.sql"
echo "  022_llm_policy.sql"
echo "  023_telegram_agent_cron.sql"
echo "  024_security_hardening.sql"
echo ""
npx supabase db push
echo "db push: OK"
echo ""

# Step 3: Deploy 4 Sprint AG edge functions
echo "--- Step 3: Deploy edge functions ---"
npx supabase functions deploy agent-chat
echo "agent-chat: deployed"

npx supabase functions deploy community-join
echo "community-join: deployed"

npx supabase functions deploy publish-revenue-snapshot
echo "publish-revenue-snapshot: deployed"

npx supabase functions deploy telegram-agent-update
echo "telegram-agent-update: deployed"
echo ""

# Step 4: Smoke test
echo "--- Step 4: Smoke test ---"
echo "TODO: run liveops agent to verify prod health"
echo ""
echo "Manual verification:"
echo "  1. Open MindShift → Community tab → should load"
echo "  2. Try joining Deep Focus Collective (free, 0 crystals)"
echo "  3. Verify crystal balance shows 0 FOCUS / 0 SHARE"
echo "  4. Check Supabase → Table Editor → crystal_ledger (should be empty)"
echo "  5. Check Supabase → Table Editor → community_memberships (your user)"
echo ""

echo "=== Deploy complete ==="
echo "Next: update memory/heartbeat.md with deploy date"
