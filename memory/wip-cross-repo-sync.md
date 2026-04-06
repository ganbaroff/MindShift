# WIP: Cross-repo live sync via ZEUS Gateway
# READ THIS FIRST if context compressed

## Goal
3 repos (MindShift, claw3d, VOLAURA) see each other's changes in real-time.
Not shared docs — actual event-driven sync.

## Plan
Each repo gets a GitHub Action that on push to main:
1. Builds a summary of what changed (files, commit messages)
2. POSTs it to ZEUS Gateway `POST /event` on Railway
3. ZEUS classifies + stores in `memory/cross-repo-events/`
4. Any agent reading context sees recent changes from ALL repos

ZEUS already has:
- `POST /event` endpoint with GATEWAY_SECRET auth
- `classifyEvent()` function
- Railway URL: `wss://zeus-gateway-production.up.railway.app`

## Files to create/modify
- `C:/Users/user/Downloads/mindshift/.github/workflows/sync-to-zeus.yml` — NEW
- `C:/Users/user/Downloads/claw3d-fork/.github/workflows/sync-to-zeus.yml` — NEW
- VOLAURA session-end.yml already pushes, add ZEUS event POST

## Required secrets (per repo GitHub Settings)
- ZEUS_GATEWAY_URL = https://zeus-gateway-production.up.railway.app
- GATEWAY_SECRET = (same as Railway env var)

## Progress
- [x] Verified ZEUS /event accepts HTTP POST (line 1662, Authorization: Bearer GATEWAY_SECRET)
- [x] MindShift: `.github/workflows/sync-to-zeus.yml` — pushed (ea9d2b9)
- [x] claw3d: `.github/workflows/sync-to-zeus.yml` — pushed (d6906e3)
- [x] VOLAURA: session-end.yml updated with ZEUS POST — pushed (7315f38)

## REMAINING: GitHub repo settings needed (manual, Yusif)
All 3 repos need in GitHub Settings → Secrets and variables → Actions:
- **Variable:** `ZEUS_GATEWAY_URL` = `https://zeus-gateway-production.up.railway.app`
- **Secret:** `GATEWAY_SECRET` = same value as Railway env var

Without these, the `if: ${{ vars.ZEUS_GATEWAY_URL != '' }}` guard skips the step silently.
