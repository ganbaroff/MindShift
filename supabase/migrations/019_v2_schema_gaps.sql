-- 019_v2_schema_gaps.sql
-- Forward-only patch. Idempotent. No destructive changes.
--
-- Fixes two schema gaps that block migration 020:
--
-- Gap 1: revenue_snapshots (created in 019) is missing columns
--         dividend_per_share_crystal and published_at.
--         These are referenced by get_latest_dividend() in 020
--         and distribute_dividends() in 021.
--
-- Gap 2: get_pending_dividend() (created in 019) references
--         shareholder_positions.share_units, but migration 020
--         creates shareholder_positions with column staked_crystals.
--         Replaced here before the table is created in 020.

-- ── Gap 1: add missing columns to revenue_snapshots ──────────────────────────

alter table public.revenue_snapshots
  add column if not exists dividend_per_share_crystal integer not null default 0,
  add column if not exists published_at               timestamptz;

-- Backfill: any rows inserted before this patch (seed row from 019)
-- get published_at = created_at so ORDER BY published_at works correctly.
update public.revenue_snapshots
  set published_at = created_at
  where published_at is null;

-- ── Gap 2: replace get_pending_dividend() with correct column name ────────────
-- Original in 019 used share_units (typo — table was not yet defined).
-- Migration 020 creates shareholder_positions with staked_crystals.
-- This replacement uses the correct column name.

create or replace function public.get_pending_dividend(
  p_user_id       uuid,
  p_community_id  uuid
) returns integer
language sql stable security definer set search_path = public as $$
  with my_pos as (
    select staked_crystals
    from public.shareholder_positions
    where user_id = p_user_id
      and community_id = p_community_id
  ),
  total_staked as (
    select coalesce(sum(staked_crystals), 1) as total
    from public.shareholder_positions
    where community_id = p_community_id
  ),
  pending_pool as (
    select coalesce(sum(dividend_pool_cents), 0) as pool
    from public.revenue_snapshots
    where distributed_at is null
      and net_income_cents > 0
  )
  select coalesce(
    (
      (pending_pool.pool / 100.0)
      * (my_pos.staked_crystals::float / total_staked.total::float)
    )::integer,
    0
  )
  from total_staked, pending_pool
  left join my_pos on true;
$$;
