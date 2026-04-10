-- Sprint AG-4 | Foundation Club seed + shareholder_positions
-- Seeds the first ELITE community and adds shareholder position tracking

-- ── shareholder_positions ──────────────────────────────────────────────────
-- Tracks staked SHARE crystals per user per community
-- Populated atomically when user joins ELITE community (join_community fn)

create table if not exists public.shareholder_positions (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references auth.users(id) on delete cascade,
  community_id    uuid        not null references public.communities(id) on delete cascade,
  staked_crystals integer     not null default 0 check (staked_crystals >= 0),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, community_id)
);

alter table public.shareholder_positions enable row level security;

-- Users can only see their own positions
create policy "Users see own shareholder positions"
  on public.shareholder_positions for select
  using (user_id = (select auth.uid()));

-- Inserted only via join_community() SECURITY DEFINER
-- No direct insert policy for users

create index if not exists shareholder_positions_user_idx      on public.shareholder_positions(user_id);
create index if not exists shareholder_positions_community_idx on public.shareholder_positions(community_id);

-- ── Update join_community() to record shareholder position ─────────────────
-- Replaces migration 017's version — now also inserts into shareholder_positions
-- for ELITE communities

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

-- ── get_pending_dividend() ──────────────────────────────────────────────────
-- Returns the latest dividend_per_share_crystal value for display
-- Public — no auth required

create or replace function public.get_latest_dividend()
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select dividend_per_share_crystal
       from public.revenue_snapshots
      order by published_at desc
      limit 1),
    0
  );
$$;

grant execute on function public.get_latest_dividend() to anon, authenticated;

-- ── Seed: Foundation Club ───────────────────────────────────────────────────

insert into public.communities
  (slug, name, tier, entry_cost_crystals, is_anonymous, constitution)
values (
  'foundation-club',
  'Foundation Club',
  'ELITE',
  10000,
  true,
  E'Members are known by their badge only.\n\n'
  E'Focus is the only currency here. No ranks, no flex, no identity — only work.\n\n'
  E'Rule 1: Never reveal member identities outside this community.\n'
  E'Rule 2: Shareholders receive 50% of net revenue each period.\n'
  E'Rule 3: Entry is permanent. Badges cannot be transferred.'
)
on conflict (slug) do nothing;

-- ── Seed: Open community for testing ───────────────────────────────────────

insert into public.communities
  (slug, name, tier, entry_cost_crystals, is_anonymous, constitution)
values (
  'deep-focus-collective',
  'Deep Focus Collective',
  'OPEN',
  0,
  false,
  'A quiet room for people who focus together. No pressure. Show up when you can.'
)
on conflict (slug) do nothing;
