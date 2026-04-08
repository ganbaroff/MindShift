# WIP — Sprint E2 Phase 3: volaura-bridge-proxy

**Started:** 2026-04-08  
**Status:** 🔨 IN PROGRESS

## What & Why

Phase 1 bridge (`src/shared/lib/volaura-bridge.ts`) calls VOLAURA Railway API
directly with MindShift JWTs → gets 401 because JWTs are cross-project and not trusted.

Fix: new Supabase edge function `volaura-bridge-proxy` that:
1. Validates MindShift user (Supabase auto-validates JWT server-side)
2. Exchanges MindShift user_id for a shared VOLAURA JWT via `/api/auth/from_external`
3. Caches the shared JWT (1hr, refresh at -5min)
4. Forwards character events to VOLAURA with the shared JWT

## VOLAURA Backend (DONE by VOLAURA-Claude @ 9F7C173)
- Endpoint: `POST https://volauraapi-production.up.railway.app/api/auth/from_external`
- Header: `X-Bridge-Secret: <secret>`
- Body: `{ mindshift_user_id, email }`
- Returns: `{ shared_user_id, shared_jwt, expires_at, created_new_user }`

## Plan B (if minted JWT still rejected)
- Use `X-Bridge-Secret + X-External-User-Id` headers directly on character event endpoint
- ~30 lines added to VOLAURA deps.py

## Files Changed
- [ ] `supabase/functions/volaura-bridge-proxy/index.ts` — CREATE
- [ ] `src/shared/lib/volaura-bridge.ts` — Phase 4 update (route through proxy)

## CEO Actions Required (cannot do without them)
- [ ] Set `EXTERNAL_BRIDGE_SECRET` as Railway env var (VOLAURA side)
- [ ] Set `EXTERNAL_BRIDGE_SECRET` as Supabase secret: `supabase secrets set EXTERNAL_BRIDGE_SECRET=...`
- [ ] Apply migration `20260408000001_user_identity_map.sql` to shared Supabase project

## Checkpoints
- [x] Verified no `volaura-bridge-proxy` exists in 15 edge functions
- [x] Read volaura-bridge.ts Phase 1 — understand all endpoints needed
- [x] Read mochi-respond — understand edge function pattern (CORS, auth, Deno.serve)
- [x] Read cors.ts — getCorsHeaders pattern
- [x] Write volaura-bridge-proxy/index.ts — DONE
- [x] tsc -b exit 0 ✅
- [x] Phase 4 complete — volaura-bridge.ts now routes through proxy

## Status: DONE (phases 3+4 shipped)
Still pending CEO actions before Phase 5 (E2E test) is possible.
