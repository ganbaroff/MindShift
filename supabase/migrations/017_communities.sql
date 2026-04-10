-- Sprint AG-1 | communities + community_memberships
-- Part of ECOSYSTEM-AGENTS-CONTRACT v1
-- Two tiers: OPEN (free entry) and ELITE (high crystal threshold, anonymous, shareholders)

-- ── communities ───────────────────────────────────────────────────────────────

create table if not exists public.communities (
  id                    uuid        primary key default gen_random_uuid(),
  slug                  text        not null unique,
  name                  text        not null,
  tier                  text        not null default 'OPEN'
                                    check (tier in ('OPEN', 'ELITE')),
  entry_cost_crystals   integer     not null default 0,    -- 0 = OPEN, 10000 = ELITE baseline
  is_anonymous          boolean     not null default false, -- member identities hidden outside
  member_count          integer     not null default 0,    -- cached, updated by trigger
  constitution          text,                              -- community rules (Fight Club clause etc)
  created_by            uuid        references auth.users(id) on delete set null,
  created_at            timestamptz not null default now()
);

alter table public.communities enable row level security;

-- OPEN communities: visible to all (name/slug/entry_cost discoverable for join UX)
-- ELITE communities: all fields hidden from non-members
-- Using (SELECT auth.uid()) pattern per migration 014
create policy "OPEN communities visible to all"
  on public.communities for select
  using (tier = 'OPEN' or exists (
    select 1 from public.community_memberships cm
    where cm.community_id = communities.id
      and cm.user_id = (select auth.uid())
  ));

create index if not exists communities_tier_idx on public.communities(tier);
create index if not exists communities_slug_idx on public.communities(slug);

-- ── community_memberships ─────────────────────────────────────────────────────

create table if not exists public.community_memberships (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references auth.users(id) on delete cascade,
  community_id    uuid        not null references public.communities(id) on delete cascade,
  role            text        not null default 'MEMBER'
                              check (role in ('MEMBER', 'MODERATOR', 'FOUNDER')),
  alias           text,       -- public pseudonym when community is_anonymous=true
  badge_id        text        not null default gen_random_uuid()::text,
  is_shareholder  boolean     not null default false,
  joined_at       timestamptz not null default now(),
  unique (user_id, community_id)
);

alter table public.community_memberships enable row level security;

-- Members can see their own memberships
create policy "Users can read own memberships"
  on public.community_memberships for select
  using ((select auth.uid()) = user_id);

-- Within a community: members can see other members
-- For ELITE/anonymous: only alias visible (enforced at application layer by is_anonymous flag)
create policy "Members can see co-members"
  on public.community_memberships for select
  using (exists (
    select 1 from public.community_memberships my_mem
    where my_mem.community_id = community_memberships.community_id
      and my_mem.user_id = (select auth.uid())
  ));

-- Direct insert blocked — use join_community() SECURITY DEFINER function instead.
-- This enforces atomic crystal-check + insert (see function below).
-- No direct INSERT policy for authenticated role.

-- Composite index required for "Members can see co-members" RLS policy performance
create index if not exists memberships_user_community_idx
  on public.community_memberships(user_id, community_id);
create index if not exists memberships_community_idx
  on public.community_memberships(community_id);
create index if not exists memberships_shareholder_idx
  on public.community_memberships(community_id, is_shareholder)
  where is_shareholder = true;

-- ── member_count cache trigger ────────────────────────────────────────────────

-- SET search_path = public required on all SECURITY DEFINER functions (see 001_init.sql pattern)
create or replace function public.update_community_member_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'INSERT') then
    update public.communities
    set member_count = member_count + 1
    where id = new.community_id;
  elsif (tg_op = 'DELETE') then
    update public.communities
    set member_count = greatest(member_count - 1, 0)
    where id = old.community_id;
  end if;
  return null;
end;
$$;

drop trigger if exists community_member_count_trigger on public.community_memberships;
create trigger community_member_count_trigger
  after insert or delete on public.community_memberships
  for each row execute procedure public.update_community_member_count();

-- ── join_community() — atomic entry: check crystals → debit → insert ─────────
-- SECURITY DEFINER enforces crystal cost at DB layer, not just application layer.
-- This prevents users from bypassing the edge function and inserting directly.

create or replace function public.join_community(
  p_community_id uuid,
  p_alias        text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_cost    integer;
  v_tier    text;
  v_balance integer;
  v_bal_after integer;
begin
  -- Fetch community requirements
  select entry_cost_crystals, tier
  into v_cost, v_tier
  from public.communities
  where id = p_community_id;

  if not found then
    raise exception 'Community not found';
  end if;

  -- Check existing membership (prevent duplicate join)
  if exists (
    select 1 from public.community_memberships
    where user_id = auth.uid() and community_id = p_community_id
  ) then
    raise exception 'Already a member of this community';
  end if;

  -- ELITE communities require SHARE crystal payment
  if v_cost > 0 then
    select coalesce(sum(amount), 0) into v_balance
    from public.crystal_ledger
    where user_id = auth.uid() and crystal_type = 'SHARE';

    if v_balance < v_cost then
      raise exception 'Insufficient SHARE crystals: need %, have %', v_cost, v_balance;
    end if;

    v_bal_after := v_balance - v_cost;

    -- Debit SHARE crystals (append to ledger)
    insert into public.crystal_ledger
      (user_id, crystal_type, amount, source_event, reference_id, balance_after)
    values
      (auth.uid(), 'SHARE', -v_cost, 'community_entry', p_community_id, v_bal_after);
  end if;

  -- Insert membership
  insert into public.community_memberships
    (user_id, community_id, alias, is_shareholder)
  values
    (auth.uid(), p_community_id, p_alias, v_tier = 'ELITE');
end;
$$;

-- Grant execute to authenticated users
grant execute on function public.join_community(uuid, text) to authenticated;

-- ── Seed: first OPEN community ────────────────────────────────────────────────

insert into public.communities (slug, name, tier, entry_cost_crystals, is_anonymous, constitution) values
  ('focus-collective',
   'Focus Collective',
   'OPEN',
   0,
   false,
   'Мы здесь чтобы фокусироваться. Никакого давления. Никаких стриков обязательных. Только присутствие.')
on conflict (slug) do nothing;
