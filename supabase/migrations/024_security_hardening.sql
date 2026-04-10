-- 024_security_hardening.sql
-- Forward-only security hardening. Idempotent. No destructive changes.
--
-- Applies 4 fixes identified by security audit before first production deploy:
--
-- Fix 1: REVOKE implicit PUBLIC execute on admin-only functions.
--        PostgreSQL grants EXECUTE to PUBLIC by default on new functions.
--        distribute_dividends() and grant_share_crystals() are service-role-only
--        and must not be callable by authenticated users.
--
-- Fix 2: join_community() — add advisory lock before balance check to prevent
--        double-debit race condition when user triggers two concurrent joins.
--
-- Fix 3: get_pending_dividend() — explicit GRANT to authenticated (matches pattern
--        established by get_crystal_balance() in migration 018).
--
-- Fix 4: get_latest_dividend() — explicit GRANT to authenticated (was already
--        granted to anon + authenticated in 020, this is idempotent confirmation).

-- ── Fix 1: Revoke implicit PUBLIC execute on admin-only functions ─────────────

revoke execute on function public.distribute_dividends(uuid)     from public;
revoke execute on function public.distribute_dividends(uuid)     from authenticated;
revoke execute on function public.distribute_dividends(uuid)     from anon;

revoke execute on function public.grant_share_crystals(uuid, integer, text) from public;
revoke execute on function public.grant_share_crystals(uuid, integer, text) from authenticated;
revoke execute on function public.grant_share_crystals(uuid, integer, text) from anon;

-- ── Fix 2: join_community() — advisory lock before balance check ──────────────
-- Prevents two concurrent joins from both passing the balance check before either debits.
-- Advisory lock is per-user, transaction-scoped (released on commit/rollback).

create or replace function public.join_community(
  p_community_id uuid,
  p_alias        text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cost          integer;
  v_tier          text;
  v_balance       integer;
  v_bal_after     integer;
begin
  -- Advisory lock per user — prevents concurrent balance-check + debit races
  perform pg_advisory_xact_lock(
    ('x' || substring(md5(auth.uid()::text || 'join_community'), 1, 16))::bit(64)::bigint
  );

  select entry_cost_crystals, tier
    into v_cost, v_tier
    from public.communities
   where id = p_community_id;

  if not found then
    raise exception 'Community not found';
  end if;

  -- Check not already a member
  if exists (
    select 1 from public.community_memberships
    where community_id = p_community_id
      and user_id = auth.uid()
  ) then
    raise exception 'Already a member of this community';
  end if;

  -- Debit SHARE crystals if ELITE
  if v_cost > 0 then
    select coalesce(sum(amount), 0) into v_balance
      from public.crystal_ledger
     where user_id = auth.uid()
       and crystal_type = 'SHARE';

    if v_balance < v_cost then
      raise exception 'Insufficient SHARE crystals: need %, have %', v_cost, v_balance;
    end if;

    v_bal_after := v_balance - v_cost;

    insert into public.crystal_ledger
      (user_id, crystal_type, amount, source_event, reference_id, balance_after)
    values
      (auth.uid(), 'SHARE', -v_cost, 'community_entry', p_community_id, v_bal_after);
  end if;

  -- Create membership
  insert into public.community_memberships
    (user_id, community_id, alias, is_shareholder)
  values
    (auth.uid(), p_community_id, p_alias, (v_tier = 'ELITE'));

  -- Record shareholder position for ELITE communities
  if v_tier = 'ELITE' then
    insert into public.shareholder_positions
      (user_id, community_id, staked_crystals)
    values
      (auth.uid(), p_community_id, v_cost)
    on conflict (user_id, community_id)
    do update set
      staked_crystals = shareholder_positions.staked_crystals + excluded.staked_crystals,
      updated_at = now();
  end if;
end;
$$;

grant execute on function public.join_community(uuid, text) to authenticated;

-- ── Fix 3: Explicit GRANT on get_pending_dividend() ──────────────────────────
-- Matches pattern from get_crystal_balance() in migration 018.

grant execute on function public.get_pending_dividend(uuid, uuid) to authenticated;

-- ── Fix 4: Confirm GRANT on get_latest_dividend() ────────────────────────────
-- Migration 020 already granted to anon + authenticated. Idempotent.

grant execute on function public.get_latest_dividend() to anon, authenticated;

-- ── Note: app.cron_secret GUC ─────────────────────────────────────────────────
-- The pg_cron job in 023 uses current_setting('app.cron_secret', true) to
-- populate the x-cron-secret header sent to the telegram-agent-update function.
-- This GUC is NOT set here because it requires the actual CRON_SECRET value.
-- Admin must run ONCE after setting the CRON_SECRET Supabase secret:
--
--   ALTER DATABASE postgres SET "app.cron_secret" = '<CRON_SECRET_VALUE>';
--
-- Until this is set, the cron job will send an empty header and be rejected
-- by the edge function (returns 500). Manual invocation with correct header still works.
-- See: supabase/migrations/023_telegram_agent_cron.sql
