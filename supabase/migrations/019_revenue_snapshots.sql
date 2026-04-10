-- Sprint AG-1 | revenue_snapshots
-- Part of ECOSYSTEM-AGENTS-CONTRACT v1
--
-- Transparent economy: all revenue numbers public.
-- 50% of net_income goes to dividend_pool_cents → distributed to shareholders.
-- This is internal utility credit redistribution — NOT a security or equity instrument.

create table if not exists public.revenue_snapshots (
  id                    uuid        primary key default gen_random_uuid(),
  period                date        not null unique,      -- first day of month (e.g. 2026-04-01)
  gross_revenue_cents   integer     not null default 0,   -- total payments received
  operating_cost_cents  integer     not null default 0,   -- infra + API costs
  net_income_cents      integer     not null default 0,   -- gross - costs
  dividend_pool_cents   integer     not null default 0,   -- 50% of net_income (when positive)
  shareholder_count     integer     not null default 0,   -- snapshot of shareholders at period close
  distributed_at        timestamptz,                      -- null = pending distribution
  notes                 text,                             -- public narrative from founder
  created_at            timestamptz not null default now()
);

alter table public.revenue_snapshots enable row level security;

-- Fully public — this is the transparency promise
create policy "Revenue snapshots are public"
  on public.revenue_snapshots for select
  using (true);

-- Only service role inserts (admin action, never user-triggered)

create index if not exists revenue_snapshots_period_idx
  on public.revenue_snapshots(period desc);

-- ── Helper: pending dividend per shareholder ──────────────────────────────────
-- Returns how many FOCUS crystal-equivalent a shareholder is owed
-- from undistributed revenue snapshots for their community.
-- Formula: (dividend_pool_cents / 100) * (share_units / total_community_shares)
-- Application layer calls this before displaying shareholder dashboard.

-- P1 fix: SET search_path = public on all SECURITY DEFINER functions.
-- P1 fix: COALESCE to return 0 (not NULL) when user has no shareholder position.
-- NULL return caused silent suppression in IF get_pending_dividend(...) > 0 checks.

create or replace function public.get_pending_dividend(
  p_user_id       uuid,
  p_community_id  uuid
) returns integer
language sql stable security definer set search_path = public as $$
  with my_pos as (
    select share_units
    from public.shareholder_positions
    where user_id = p_user_id and community_id = p_community_id
  ),
  total_shares as (
    select coalesce(sum(share_units), 1) as total
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
      * (my_pos.share_units::float / total_shares.total::float)
    )::integer,
    0
  )
  from total_shares, pending_pool
  left join my_pos on true;
$$;

-- ── Seed: first snapshot placeholder ─────────────────────────────────────────
-- Shows the UI is wired. Real data filled by admin each month.

insert into public.revenue_snapshots (
  period,
  gross_revenue_cents,
  operating_cost_cents,
  net_income_cents,
  dividend_pool_cents,
  shareholder_count,
  notes
) values (
  '2026-04-01',
  0,
  0,
  0,
  0,
  0,
  'Первый месяц. Прозрачность начинается здесь. Данные появятся по итогам апреля.'
) on conflict (period) do nothing;
