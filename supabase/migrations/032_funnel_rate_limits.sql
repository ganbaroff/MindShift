-- 032 | Text-keyed rate limiter for the Telegram funnel.
-- The existing edge_rate_limits.user_id has a FK to public.users, so it can only
-- rate-limit real logged-in users. The funnel must throttle BEFORE a guest user
-- exists (the /start-quiz guest-minting branch), keyed by telegram id — a non-UUID.
-- Passing a synthetic key to increment_rate_limit(uuid) violated the FK and the
-- caller failed OPEN, silently disabling the limit. This table is FK-free and
-- keyed by an arbitrary text label so pre-mint throttling actually records.

create table if not exists public.funnel_rate_limits (
  rl_key       text        not null,
  window_start timestamptz not null,
  call_count   integer     not null default 0,
  primary key (rl_key, window_start)
);

alter table public.funnel_rate_limits enable row level security;
-- Service-role only (edge function). No anon/authenticated policies.

comment on table public.funnel_rate_limits is
  'FK-free text-keyed rate limiter for the Telegram funnel (pre-guest-mint throttle). Service-role only.';

create or replace function public.increment_funnel_rate_limit(
  p_key text,
  p_window_start timestamptz
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  insert into public.funnel_rate_limits (rl_key, window_start, call_count)
  values (p_key, p_window_start, 1)
  on conflict (rl_key, window_start)
  do update set call_count = public.funnel_rate_limits.call_count + 1
  returning call_count into v_count;

  -- Best-effort cleanup of stale windows.
  delete from public.funnel_rate_limits
  where window_start < now() - interval '48 hours';

  return v_count;
end;
$$;

revoke all on function public.increment_funnel_rate_limit(text, timestamptz) from public, anon, authenticated;

comment on function public.increment_funnel_rate_limit(text, timestamptz) is
  'Atomic INSERT..ON CONFLICT increment for funnel_rate_limits. Rollback: drop function; drop table funnel_rate_limits.';
