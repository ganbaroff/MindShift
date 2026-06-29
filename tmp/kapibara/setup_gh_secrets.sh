#!/usr/bin/env bash
# Reads values from local env files and pushes them as GitHub Actions secrets.
# Values never appear in chat or CI logs — piped directly to gh.
# Run once: bash tmp/kapibara/setup_gh_secrets.sh
set -e
REPO="ganbaroff/MindShift"
ENV="C:/Projects/mindshift/.env"
SEC="C:/Users/user/Downloads/videos/.secrets.env"

get() { grep -m1 "^$1=" "$2" | cut -d= -f2- | tr -d '"'"'" | tr -d '\r'; }

echo "Setting GitHub Secrets for $REPO..."

get GEMINI_API_KEY           "$ENV" | gh secret set GEMINI_API_KEY           --repo "$REPO"
get VITE_SUPABASE_URL        "$ENV" | gh secret set VITE_SUPABASE_URL        --repo "$REPO"
get SUPABASE_SERVICE_ROLE_KEY "$ENV" | gh secret set SUPABASE_SERVICE_ROLE_KEY --repo "$REPO"
get BUFFER_ACCESS_TOKEN      "$SEC" | gh secret set BUFFER_ACCESS_TOKEN      --repo "$REPO"
get TELEGRAM_CREATORBOT_TOKEN "$SEC" | gh secret set TELEGRAM_CREATORBOT_TOKEN --repo "$REPO"
get TELEGRAM_CHANNEL_ID      "$SEC" | gh secret set TELEGRAM_CHANNEL_ID      --repo "$REPO"

echo "Done. Verify:"
gh secret list --repo "$REPO"
