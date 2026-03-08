-- MindShift — Edge Function rate limiting
-- Persistent, cross-instance rate limiting for Supabase Edge Functions.
-- Uses a SECURITY DEFINER Postgres function for atomic increment-and-read,
-- which guarantees correctness even across concurrent Deno isolates.
--
-- Run via: Supabase Dashboard > SQL Editor > Run

-- ── Table ────────────────────────────────────────────────────────────────────

create table if not exists public.edge_rate_limits (
  user_id      uuid        not null references auth.users(id) on delete cascade,
  fn_name      text        not null,
  window_start timestamptz not null,
  call_count   integer     not null default 0 check (call_count >= 0),
  primary key (user_id, fn_name, window_start)
);

alter table public.edge_rate_limits enable row level security;

-- Users can only see (and cannot modify) their own rate limit rows.
-- The SECURITY DEFINER function below handles writes.
create policy "Users can read own rate limits"
  on public.edge_rate_limits for select
  to authenticated
  using (auth.uid() = user_id);

-- Index to speed up the periodic cleanup inside the function
create index if not exists idx_edge_rate_limits_window
  on public.edge_rate_limits (window_start);

-- ── Atomic increment function ─────────────────────────────────────────────────
-- Returns the new call_count AFTER incrementing.
-- SECURITY DEFINER so it can write to edge_rate_limits regardless of RLS.
-- SET search_path = public prevents search-path injection.

create or replace function public.increment_rate_limit(
  p_user_id      uuid,
  p_fn_name      text,
  p_window_start timestamptz
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  insert into public.edge_rate_limits (user_id, fn_name, window_start, call_count)
  values (p_user_id, p_fn_name, p_window_start, 1)
  on conflict (user_id, fn_name, window_start)
  do update set call_count = public.edge_rate_limits.call_count + 1
  returning call_count into v_count;

  -- Best-effort cleanup: drop windows older than 48 hours.
  -- Non-blocking — runs inside the same transaction but is fast.
  delete from public.edge_rate_limits
  where window_start < now() - interval '48 hours';

  return v_count;
end;
$$;

-- Allow authenticated users to call this function via their JWT
grant execute on function public.increment_rate_limit(uuid, text, timestamptz)
  to authenticated;
