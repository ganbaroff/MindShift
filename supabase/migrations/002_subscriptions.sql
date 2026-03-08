-- MindShift — Subscriptions + reduced stimulation preference
-- Run via: Supabase Dashboard > SQL Editor > Run

-- ── Add subscription columns to users table ─────────────────────────────────

alter table public.users
  add column if not exists subscription_tier text not null default 'free'
    check (subscription_tier in ('free', 'pro_trial', 'pro')),
  add column if not exists trial_ends_at timestamptz,
  add column if not exists reduced_stimulation boolean not null default false;

-- ── subscriptions (audit log — tracks tier changes) ─────────────────────────

create table if not exists public.subscriptions (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references public.users(id) on delete cascade,
  tier            text        not null check (tier in ('free', 'pro_trial', 'pro')),
  started_at      timestamptz not null default now(),
  ends_at         timestamptz,
  active          boolean     not null default true,
  payment_method  text,       -- placeholder: no real payment integration yet
  created_at      timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

create policy "Users can read own subscriptions"
  on public.subscriptions for select
  using (auth.uid() = user_id);

create policy "Users can insert own subscriptions"
  on public.subscriptions for insert
  with check (auth.uid() = user_id);

create index if not exists subscriptions_user_idx on public.subscriptions(user_id, active);

-- ── Function: activate trial ────────────────────────────────────────────────
-- Called from client or Edge Function to start 30-day Pro trial

create or replace function public.activate_trial(p_user_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_trial_end timestamptz;
begin
  v_trial_end := now() + interval '30 days';

  -- Update user row
  update public.users
  set subscription_tier = 'pro_trial',
      trial_ends_at = v_trial_end
  where id = p_user_id
    and subscription_tier = 'free'; -- only activate if currently free

  -- Log subscription event
  insert into public.subscriptions (user_id, tier, ends_at)
  values (p_user_id, 'pro_trial', v_trial_end);
end;
$$;
