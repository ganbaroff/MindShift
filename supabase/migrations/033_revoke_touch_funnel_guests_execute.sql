-- 033 | Lock down the SECURITY DEFINER trigger function touch_funnel_guests_updated_at().
-- Advisor WARN (0028/0029 anon/authenticated_security_definer_function_executable): it is a
-- SECURITY DEFINER function whose EXECUTE is reachable by public/anon/authenticated, so
-- PostgREST exposes it as an /rpc endpoint. It has no business being callable directly —
-- it only runs as a BEFORE UPDATE trigger, and trigger invocation runs as the table owner
-- and is UNAFFECTED by caller EXECUTE grants.
--
-- Same gotcha as migration 029: Postgres grants EXECUTE to PUBLIC by default, and
-- `REVOKE ... FROM anon` is a no-op while PUBLIC still holds it (has_function_privilege
-- stays true via PUBLIC). So revoke FROM PUBLIC (plus the named roles for drift-correction).
-- service_role is superuser-like and keeps EXECUTE; the trigger keeps firing.
--
-- Additive/idempotent. Verified live 2026-07-05: after apply, pub/anon/authed = false,
-- svc = true, AND an UPDATE to a synthetic funnel_guests row still bumped updated_at
-- (trigger fired), then the advisor WARN for this function cleared.

revoke execute on function public.touch_funnel_guests_updated_at() from public, anon, authenticated;

comment on function public.touch_funnel_guests_updated_at() is
  'BEFORE UPDATE trigger fn for funnel_guests.updated_at. EXECUTE revoked from public/anon/authenticated (033) — trigger runs as table owner, unaffected. Rollback: grant execute on function public.touch_funnel_guests_updated_at() to public;';
