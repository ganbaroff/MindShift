-- 035 | Harden earn_focus_crystals against the client-controlled self-mint
-- (audit 2026-07-06, findings #1 CRITICAL + #3). The old body trusted the client's
-- p_amount and p_source_event, letting any authenticated user POST an arbitrary amount
-- (unbounded FOCUS self-mint) and forge ledger provenance (e.g. 'dividend' rows).
--
-- Fix: the function now IGNORES all client args and derives everything server-side from
-- the caller's own focus_sessions rows:
--   * amount = duration_ms/60000 * 5, clamped to a 120-min ceiling (Constitution 1min=5)
--   * source = hard-coded 'focus_session'
--   * one credit per session (reference_id = session id + the partial UNIQUE index)
-- Signature unchanged, so the existing client (useFocusSession.ts) keeps working; its
-- p_amount/p_source_event/p_reference_id are simply not read. No client change, no grant
-- change, no coordination window. crystal_ledger is empty at apply time (verified).
-- Rollback: restore the 021 body; drop index crystal_ledger_focus_session_uniq.

create unique index if not exists crystal_ledger_focus_session_uniq
  on public.crystal_ledger (reference_id)
  where source_event = 'focus_session' and reference_id is not null;

create or replace function public.earn_focus_crystals(
  p_amount        integer,
  p_source_event  text    default 'focus_session',
  p_reference_id  uuid    default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session  record;
  v_amount   integer;
  v_balance  integer;
begin
  -- client args are intentionally IGNORED; everything below is server-derived.

  -- Serialize per-user to prevent a concurrent double-credit.
  perform pg_advisory_xact_lock(
    ('x' || substring(md5(auth.uid()::text || 'FOCUS'), 1, 16))::bit(64)::bigint
  );

  -- Most-recent COMPLETED, not-yet-credited focus session for the caller.
  select fs.id, fs.duration_ms
    into v_session
    from public.focus_sessions fs
   where fs.user_id = auth.uid()
     and fs.ended_at is not null
     and not exists (
       select 1 from public.crystal_ledger cl
        where cl.reference_id = fs.id and cl.source_event = 'focus_session'
     )
   order by fs.ended_at desc
   limit 1;

  if not found then
    return;  -- nothing new to credit
  end if;

  v_amount := least(greatest(round(coalesce(v_session.duration_ms, 0)::numeric / 60000.0), 0), 120)::int * 5;
  if v_amount <= 0 then
    return;
  end if;

  select coalesce(sum(amount), 0) into v_balance
    from public.crystal_ledger
   where user_id = auth.uid() and crystal_type = 'FOCUS';

  insert into public.crystal_ledger
    (user_id, crystal_type, amount, source_event, reference_id, balance_after)
  values
    (auth.uid(), 'FOCUS', v_amount, 'focus_session', v_session.id, v_balance + v_amount);
end;
$$;
