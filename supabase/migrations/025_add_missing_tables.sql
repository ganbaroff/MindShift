-- Migration 025: Add missing daily_tasks and usage_limits tables
-- Reconstructs schema definitions referenced in ADRs and types.

-- ── daily_tasks ──────────────────────────────────────────────────────────────

create table if not exists public.daily_tasks (
  id                  uuid        primary key default gen_random_uuid(),
  user_id             uuid        not null references public.users(id) on delete cascade,
  actual_minutes      integer     not null default 0 check (actual_minutes >= 0),
  last_started_at     timestamptz,
  created_at          timestamptz not null default now()
);

alter table public.daily_tasks enable row level security;

create policy "Users can read own daily tasks"
  on public.daily_tasks for select
  using (auth.uid() = user_id);

create policy "Users can insert own daily tasks"
  on public.daily_tasks for insert
  with check (auth.uid() = user_id);

create policy "Users can update own daily tasks"
  on public.daily_tasks for update
  using (auth.uid() = user_id);

create policy "Users can delete own daily tasks"
  on public.daily_tasks for delete
  using (auth.uid() = user_id);

-- ── usage_limits ─────────────────────────────────────────────────────────────

create table if not exists public.usage_limits (
  id                  uuid        primary key default gen_random_uuid(),
  user_id             uuid        not null references public.users(id) on delete cascade,
  action_type         text        not null,
  limit_max           integer     not null check (limit_max >= 0),
  current_usage       integer     not null default 0 check (current_usage >= 0),
  reset_at            timestamptz not null default now()
);

alter table public.usage_limits enable row level security;

create policy "Users can read own usage limits"
  on public.usage_limits for select
  using (auth.uid() = user_id);

create policy "Users can insert own usage limits"
  on public.usage_limits for insert
  with check (auth.uid() = user_id);

create policy "Users can update own usage limits"
  on public.usage_limits for update
  using (auth.uid() = user_id);

create policy "Users can delete own usage limits"
  on public.usage_limits for delete
  using (auth.uid() = user_id);
