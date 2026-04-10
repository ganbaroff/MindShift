-- 019_v3_fix_shareholder_schema.sql
-- Forward-only patch. Idempotent. No destructive data changes.
--
-- Problem: migration 018_crystal_ledger.sql created shareholder_positions
-- with column `share_units`. All downstream code (019_v2, 020, 021) uses
-- `staked_crystals`. CREATE TABLE IF NOT EXISTS in 020 is a no-op because
-- the table already exists — so `staked_crystals` never gets created.
-- Every call to join_community(), get_pending_dividend(), distribute_dividends()
-- would fail at runtime with "column staked_crystals does not exist".
--
-- Fix: rename share_units → staked_crystals while preserving data.
-- The extra columns (dividend_earned, dividend_claimed) are left in place —
-- they are unused by 020/021 but harmless. A future migration can drop them
-- if the schema is cleaned up.

do $$
begin
  -- Only rename if share_units still exists (idempotent guard)
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'shareholder_positions'
      and column_name  = 'share_units'
  ) then
    alter table public.shareholder_positions
      rename column share_units to staked_crystals;
  end if;

  -- Add created_at if missing (020 does not add it but join_community() does not need it,
  -- however consistent with other tables for audit tracing)
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'shareholder_positions'
      and column_name  = 'created_at'
  ) then
    alter table public.shareholder_positions
      add column created_at timestamptz not null default now();
  end if;
end;
$$;
