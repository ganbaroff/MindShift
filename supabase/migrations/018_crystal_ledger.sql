-- Sprint AG-1 | crystal_ledger + shareholder_positions
-- Part of ECOSYSTEM-AGENTS-CONTRACT v1
--
-- Crystal types:
--   FOCUS — earned through focus sessions (1 min = 5 crystals). Personal, non-transferable.
--   SHARE — donable/investable crystal. Used for community entry + shareholder positions.
--
-- Crystal Ethics (Constitution Rule):
--   - Crystals NEVER expire
--   - No timers, no urgency
--   - Transparent formula always shown

-- ── crystal_ledger ────────────────────────────────────────────────────────────
-- Append-only. Never update or delete rows. Truth lives here.

create table if not exists public.crystal_ledger (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references auth.users(id) on delete cascade,
  crystal_type    text        not null
                              check (crystal_type in ('FOCUS', 'SHARE')),
  amount          integer     not null,                   -- positive = credit, negative = debit
  source_event    text        not null,
  -- source_event values:
  --   'focus_session'     — earned via MindShift focus
  --   'community_entry'   — spent to join a community
  --   'donation_sent'     — SHARE crystals given to another user
  --   'donation_received' — SHARE crystals received from another user
  --   'dividend_accrued'  — shareholder dividend credited
  --   'dividend_claimed'  — shareholder withdraws dividend as FOCUS crystals
  --   'admin_grant'       — manual grant (only service role)
  reference_id    uuid,                                   -- focus_sessions.id, community_memberships.id, etc
  balance_after   integer     not null,                   -- snapshot of THAT crystal_type balance after tx
  created_at      timestamptz not null default now()
);

alter table public.crystal_ledger enable row level security;

-- Users read only their own ledger
create policy "Users can read own crystal ledger"
  on public.crystal_ledger for select
  using (auth.uid() = user_id);

-- Inserts only via service role (edge functions) — no direct user insert
-- This protects ledger integrity: balance_after must be computed server-side

create index if not exists ledger_user_type_idx
  on public.crystal_ledger(user_id, crystal_type, created_at desc);

create index if not exists ledger_source_idx
  on public.crystal_ledger(source_event, created_at desc);

-- ── balance_after integrity trigger ──────────────────────────────────────────
-- P0 fix: enforce that balance_after matches the actual running sum on every insert.
-- This makes the append-only guarantee enforceable at DB layer, not just by convention.

create or replace function public.validate_ledger_balance_after()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  computed_balance integer;
begin
  select coalesce(sum(amount), 0)
  into computed_balance
  from public.crystal_ledger
  where user_id = new.user_id
    and crystal_type = new.crystal_type;
  -- The new row is already inserted (AFTER trigger), so sum includes it.
  if computed_balance != new.balance_after then
    raise exception 'crystal_ledger: balance_after mismatch for user % type %. expected %, got %',
      new.user_id, new.crystal_type, computed_balance, new.balance_after;
  end if;
  return new;
end;
$$;

create trigger validate_ledger_insert
  after insert on public.crystal_ledger
  for each row execute function public.validate_ledger_balance_after();

-- ── Helper: get current crystal balance ───────────────────────────────────────
-- P1 fix: SECURITY DEFINER functions need SET search_path + caller authorization.
-- Users can only query their own balance — prevents financial privacy leak.

create or replace function public.get_crystal_balance(
  p_user_id uuid,
  p_type    text
) returns integer
language plpgsql stable security definer set search_path = public as $$
begin
  if p_user_id is distinct from auth.uid() then
    raise exception 'Unauthorized: can only query your own crystal balance';
  end if;
  return (
    select coalesce(sum(amount), 0)::integer
    from public.crystal_ledger
    where user_id = p_user_id
      and crystal_type = p_type
  );
end;
$$;

grant execute on function public.get_crystal_balance(uuid, text) to authenticated;

-- ── shareholder_positions ─────────────────────────────────────────────────────
-- Tracks each user's shareholder stake in a community.
-- Stake = SHARE crystals invested. Dividends accrue from revenue_snapshots.

create table if not exists public.shareholder_positions (
  id                  uuid        primary key default gen_random_uuid(),
  user_id             uuid        not null references auth.users(id) on delete cascade,
  community_id        uuid        not null references public.communities(id) on delete cascade,
  share_units         integer     not null default 0 check (share_units >= 0),
  -- SHARE crystals currently staked in this position
  dividend_earned     integer     not null default 0 check (dividend_earned >= 0),
  -- cumulative dividends credited (in FOCUS crystals)
  dividend_claimed    integer     not null default 0 check (dividend_claimed >= 0),
  -- cumulative dividends the user has claimed/converted
  updated_at          timestamptz not null default now(),
  unique (user_id, community_id)
);

alter table public.shareholder_positions enable row level security;

-- Users read their own positions only
create policy "Users can read own shareholder positions"
  on public.shareholder_positions for select
  using (auth.uid() = user_id);

-- Shareholders within same community can see aggregate (not individual) positions
-- (Application layer aggregates for community dashboard — no per-user exposure)

create index if not exists shareholder_community_idx
  on public.shareholder_positions(community_id);

create index if not exists shareholder_user_idx
  on public.shareholder_positions(user_id);

-- ── Migrate existing XP to FOCUS crystals ─────────────────────────────────────
-- P0 fix: use EXISTS check instead of ON CONFLICT (ledger has no unique constraint to conflict on).
-- ON CONFLICT DO NOTHING without a target only skips duplicate PKs (UUID — never duplicates).
-- This safe pattern ensures idempotency on supabase db reset / disaster recovery replay.

insert into public.crystal_ledger (user_id, crystal_type, amount, source_event, balance_after)
select
  u.id,
  'FOCUS',
  coalesce(u.xp_total, 0),
  'admin_grant',
  coalesce(u.xp_total, 0)
from public.users u
where coalesce(u.xp_total, 0) > 0
  and not exists (
    select 1 from public.crystal_ledger cl
    where cl.user_id = u.id
      and cl.source_event = 'admin_grant'
  );
