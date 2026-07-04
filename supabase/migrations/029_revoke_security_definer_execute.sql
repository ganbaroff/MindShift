-- 029 | LAUNCH GATE: lock down SECURITY DEFINER function EXECUTE grants
--
-- CONTEXT (ORCHESTRATOR-PLAN LAUNCH GATE #1): PostgREST exposes any function whose
-- EXECUTE is reachable by `anon`/`authenticated` as a callable REST endpoint.
-- Postgres grants EXECUTE to PUBLIC by default on new functions, so several
-- SECURITY DEFINER functions are callable by a cold anon, letting them invoke
-- privileged economy/trial logic directly (bypassing the edge functions).
--
-- KEY GOTCHA (verified live in a rolled-back txn 2026-07-04): the default grant is
-- to PUBLIC, not to `anon`/`authenticated` by name. `REVOKE ... FROM anon` is a
-- NO-OP while PUBLIC still holds EXECUTE (has_function_privilege stays true via
-- PUBLIC). The correct lockdown is: REVOKE ... FROM PUBLIC (and anon/authenticated
-- for good measure), THEN GRANT back only the roles that must keep access.
--
-- SCOPE derived by READING each function body + grepping the app client
-- (grep of C:/Projects/mindshift/src for `.rpc(` — receipts in the funnel report):
--   the ONLY direct client `.rpc()` calls are:
--     - get_crystal_balance   (useCommunity.ts:159-160, EconomyDashboard.tsx:78-79) [authenticated]
--     - earn_focus_crystals   (useFocusSession.ts:218-221)                           [authenticated]
--   both derive the acting user from auth.uid() internally (user can only act on
--   themselves) → safe to keep for `authenticated`.
--   Everything else is invoked via edge functions (service_role) or DB triggers
--   (which run as the table owner, unaffected by caller EXECUTE grants).
--
-- RESULT after apply:
--   get_crystal_balance, earn_focus_crystals -> anon=NO, authenticated=YES, service_role=YES
--   the other 8 (activate_trial, join_community, get_latest_dividend,
--     get_pending_dividend, increment_rate_limit, handle_new_user,
--     update_community_member_count, validate_ledger_balance_after)
--     -> anon=NO, authenticated=NO, service_role=YES
--   distribute_dividends, grant_share_crystals already service_role-only (untouched).
--
-- Additive/idempotent. PREPARED, NOT APPLIED — CEO-approved deploy applies it
-- before first external traffic (LAUNCH GATE rule: traffic only after this).

-- ── revoke the PUBLIC (and named-role) grant on ALL affected funcs ──
revoke execute on function public.get_crystal_balance(uuid, text)                     from public, anon, authenticated;
revoke execute on function public.earn_focus_crystals(integer, text, uuid)            from public, anon, authenticated;
revoke execute on function public.activate_trial(uuid)                                from public, anon, authenticated;
revoke execute on function public.join_community(uuid, text)                          from public, anon, authenticated;
revoke execute on function public.get_latest_dividend()                              from public, anon, authenticated;
revoke execute on function public.get_pending_dividend(uuid, uuid)                    from public, anon, authenticated;
revoke execute on function public.increment_rate_limit(uuid, text, timestamptz)       from public, anon, authenticated;
revoke execute on function public.handle_new_user()                                   from public, anon, authenticated;
revoke execute on function public.update_community_member_count()                     from public, anon, authenticated;
revoke execute on function public.validate_ledger_balance_after()                     from public, anon, authenticated;

-- ── grant back ONLY what the client legitimately calls (authenticated) ──
grant execute on function public.get_crystal_balance(uuid, text)          to authenticated;
grant execute on function public.earn_focus_crystals(integer, text, uuid) to authenticated;

-- service_role retains EXECUTE on everything (it is a superuser-like role and is
-- not affected by these REVOKEs); edge functions that use the service role keep
-- working. Trigger functions run as the table owner and keep firing.

-- Verify after apply:
--   SELECT p.proname,
--     has_function_privilege('anon', p.oid, 'EXECUTE') AS anon,
--     has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authed,
--     has_function_privilege('service_role', p.oid, 'EXECUTE') AS svc
--   FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.prosecdef
--   ORDER BY p.proname;
