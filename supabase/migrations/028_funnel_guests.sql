-- 028 | funnel_guests — cold Telegram guest funnel state
--
-- A cold Telegram guest arrives via t.me/<bot>?start=quiz with NO app account.
-- telegram-webhook mints a real Supabase user for them (admin API, service role)
-- so it can reuse the JWT-gated agent-chat + create-checkout functions AS-IS,
-- and tracks the short quiz progress here. No /link, adults-only funnel.
--
-- Written by the funnel builder. Additive + idempotent. Service-role-only access
-- (the edge function uses the service role); no anon/authenticated policies needed.

create table if not exists public.funnel_guests (
  telegram_id  bigint      primary key,
  user_id      uuid        not null references auth.users(id) on delete cascade,
  quiz_step    integer     not null default 0,   -- 0 = idle/done, 1..N = active quiz turn
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id)
);

create index if not exists funnel_guests_user_id_idx on public.funnel_guests(user_id);

-- RLS on, no policies: only the service role (edge function) touches this table.
-- anon/authenticated get deny-all by default — correct for a server-only table.
alter table public.funnel_guests enable row level security;

-- keep updated_at fresh
create or replace function public.touch_funnel_guests_updated_at()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists funnel_guests_touch on public.funnel_guests;
create trigger funnel_guests_touch
  before update on public.funnel_guests
  for each row execute procedure public.touch_funnel_guests_updated_at();

-- NOTE: not applied to prod by the funnel builder. Apply via CEO-approved deploy
-- together with the telegram-webhook redeploy (they ship as one go-live unit).
