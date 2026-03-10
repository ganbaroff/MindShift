-- MindShift — Initial Schema
-- Run via: Supabase Dashboard > SQL Editor > Run

-- ── Enable RLS on all tables ─────────────────────────────────────────────────

-- ── users ────────────────────────────────────────────────────────────────────

create table if not exists public.users (
  id                  uuid        primary key references auth.users(id) on delete cascade,
  email               text        not null,
  cognitive_mode      text        not null default 'focused' check (cognitive_mode in ('focused', 'overview')),
  energy_level        smallint    not null default 3 check (energy_level between 1 and 5),
  psychotype          text        check (psychotype in ('achiever', 'explorer', 'connector', 'planner')),
  avatar_id           smallint    not null default 1,
  xp_total            integer     not null default 0,
  app_mode            text        not null default 'minimal' check (app_mode in ('minimal', 'habit', 'system')),
  onboarding_completed boolean    not null default false,
  created_at          timestamptz not null default now(),
  last_session_at     timestamptz
);

alter table public.users enable row level security;

create policy "Users can read own row"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can upsert own row"
  on public.users for insert
  with check (auth.uid() = id);

create policy "Users can update own row"
  on public.users for update
  using (auth.uid() = id);

-- ── tasks ────────────────────────────────────────────────────────────────────

create table if not exists public.tasks (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        not null references public.users(id) on delete cascade,
  title             text        not null,
  pool              text        not null default 'now' check (pool in ('now', 'next', 'someday')),
  status            text        not null default 'active' check (status in ('active', 'completed', 'archived')),
  difficulty        smallint    not null default 2 check (difficulty between 1 and 3),
  estimated_minutes integer     not null default 25,
  completed_at      timestamptz,
  created_at        timestamptz not null default now(),
  snooze_count      integer     not null default 0,
  parent_task_id    uuid        references public.tasks(id) on delete set null,
  position          integer     not null default 0
);

alter table public.tasks enable row level security;

create policy "Users can manage own tasks"
  on public.tasks for all
  using (auth.uid() = user_id);

create index if not exists tasks_user_pool_idx on public.tasks(user_id, pool, status);

-- ── focus_sessions ────────────────────────────────────────────────────────────

create table if not exists public.focus_sessions (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references public.users(id) on delete cascade,
  started_at     timestamptz not null default now(),
  ended_at       timestamptz,
  duration_ms    bigint,
  phase_reached  text        check (phase_reached in ('struggle', 'release', 'flow', 'recovery')),
  audio_preset   text        check (audio_preset in ('brown', 'lofi', 'nature', 'pink')),
  task_id        uuid        references public.tasks(id) on delete set null,
  energy_before  smallint    check (energy_before between 1 and 5),
  energy_after   smallint    check (energy_after between 1 and 5)
);

alter table public.focus_sessions enable row level security;

create policy "Users can manage own sessions"
  on public.focus_sessions for all
  using (auth.uid() = user_id);

create index if not exists sessions_user_idx on public.focus_sessions(user_id, started_at desc);

-- ── user_behavior ─────────────────────────────────────────────────────────────

create table if not exists public.user_behavior (
  id                     uuid        primary key default gen_random_uuid(),
  user_id                uuid        not null references public.users(id) on delete cascade,
  date                   date        not null,
  session_timestamps     timestamptz[] not null default '{}',
  session_duration_ms    bigint      not null default 0,
  task_completion_ratio  real        not null default 0,
  snooze_count           integer     not null default 0,
  feature_span           integer     not null default 0,
  interaction_pace_ms    bigint      not null default 0,
  unique (user_id, date)
);

alter table public.user_behavior enable row level security;

create policy "Users can manage own behavior data"
  on public.user_behavior for all
  using (auth.uid() = user_id);

-- ── achievements ──────────────────────────────────────────────────────────────

create table if not exists public.achievements (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references public.users(id) on delete cascade,
  achievement_key text        not null,
  unlocked_at     timestamptz not null default now(),
  unique (user_id, achievement_key)
);

alter table public.achievements enable row level security;

create policy "Users can manage own achievements"
  on public.achievements for all
  using (auth.uid() = user_id);

-- ── energy_logs ───────────────────────────────────────────────────────────────
-- NEW table (not in original spec) — tracks per-session energy for weekly insights

create table if not exists public.energy_logs (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references public.users(id) on delete cascade,
  energy_before  smallint    not null check (energy_before between 1 and 5),
  energy_after   smallint    check (energy_after between 1 and 5),
  session_id     uuid        references public.focus_sessions(id) on delete set null,
  logged_at      timestamptz not null default now()
);

alter table public.energy_logs enable row level security;

create policy "Users can manage own energy logs"
  on public.energy_logs for all
  using (auth.uid() = user_id);

create index if not exists energy_logs_user_idx on public.energy_logs(user_id, logged_at desc);

-- ── Auto-create user row on auth.users insert ─────────────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
