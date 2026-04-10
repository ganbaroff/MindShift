-- Sprint AG-4 | Crystal earning + dividend distribution
-- Fixes the critical gap: focus sessions must write to crystal_ledger,
-- and publishing a revenue snapshot must distribute FOCUS dividends.

-- ── earn_focus_crystals() ─────────────────────────────────────────────────────
-- Called after every focus session completion (via supabase.rpc in useFocusSession).
-- Atomically computes current balance and inserts a new ledger row.
-- balance_after trigger validates integrity after insert.

create or replace function public.earn_focus_crystals(
  p_amount        integer,
  p_source_event  text    default 'focus_session',
  p_reference_id  uuid    default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
begin
  if p_amount <= 0 then return; end if;

  -- Advisory lock per user prevents concurrent session races
  perform pg_advisory_xact_lock(
    ('x' || substring(md5(auth.uid()::text || 'FOCUS'), 1, 16))::bit(64)::bigint
  );

  select coalesce(sum(amount), 0)
    into v_balance
    from public.crystal_ledger
   where user_id = auth.uid()
     and crystal_type = 'FOCUS';

  insert into public.crystal_ledger
    (user_id, crystal_type, amount, source_event, reference_id, balance_after)
  values
    (auth.uid(), 'FOCUS', p_amount, p_source_event, p_reference_id, v_balance + p_amount);
end;
$$;

grant execute on function public.earn_focus_crystals(integer, text, uuid) to authenticated;

-- ── distribute_dividends() ────────────────────────────────────────────────────
-- Called by publish-revenue-snapshot edge function (service role) after a
-- new revenue snapshot is published.
-- Pays every shareholder: floor(staked_crystals × dividend_per_share_crystal) FOCUS.
-- Idempotent: skips snapshot if ledger rows for that reference_id already exist.

create or replace function public.distribute_dividends(p_snapshot_id uuid)
returns integer   -- number of shareholders paid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dividend_per_crystal  numeric;
  v_paid_count            integer := 0;
  r                       record;
  v_focus_earned          integer;
  v_balance               integer;
begin
  -- Idempotency: if any row exists for this snapshot, distribution already ran
  if exists (
    select 1 from public.crystal_ledger
    where source_event = 'dividend' and reference_id = p_snapshot_id
    limit 1
  ) then
    return 0;
  end if;

  select dividend_per_share_crystal
    into v_dividend_per_crystal
    from public.revenue_snapshots
   where id = p_snapshot_id;

  if not found or v_dividend_per_crystal <= 0 then return 0; end if;

  for r in
    select sp.user_id, sp.staked_crystals
      from public.shareholder_positions sp
     where sp.staked_crystals > 0
  loop
    v_focus_earned := floor(r.staked_crystals * v_dividend_per_crystal);
    if v_focus_earned <= 0 then continue; end if;

    -- Advisory lock per user to prevent concurrent writes
    perform pg_advisory_xact_lock(
      ('x' || substring(md5(r.user_id::text || 'FOCUS'), 1, 16))::bit(64)::bigint
    );

    select coalesce(sum(amount), 0)
      into v_balance
      from public.crystal_ledger
     where user_id = r.user_id
       and crystal_type = 'FOCUS';

    insert into public.crystal_ledger
      (user_id, crystal_type, amount, source_event, reference_id, balance_after)
    values
      (r.user_id, 'FOCUS', v_focus_earned, 'dividend', p_snapshot_id, v_balance + v_focus_earned);

    v_paid_count := v_paid_count + 1;
  end loop;

  return v_paid_count;
end;
$$;

-- Only service role can call distribute_dividends (called from edge fn, not browser)
-- No grant to authenticated — intentionally restricted

-- ── grant_share_crystals() ───────────────────────────────────────────────────
-- Admin-only: grant SHARE crystals to a user (Dodo purchase credit or initial grant).
-- Called from edge function with service role key only.

create or replace function public.grant_share_crystals(
  p_user_id       uuid,
  p_amount        integer,
  p_source_event  text    default 'admin_grant'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
begin
  if p_amount <= 0 then return; end if;

  perform pg_advisory_xact_lock(
    ('x' || substring(md5(p_user_id::text || 'SHARE'), 1, 16))::bit(64)::bigint
  );

  select coalesce(sum(amount), 0)
    into v_balance
    from public.crystal_ledger
   where user_id = p_user_id
     and crystal_type = 'SHARE';

  insert into public.crystal_ledger
    (user_id, crystal_type, amount, source_event, balance_after)
  values
    (p_user_id, 'SHARE', p_amount, p_source_event, v_balance + p_amount);
end;
$$;

-- Service role only — not granted to authenticated
