-- Bolt 2.2: daily_tasks table
-- Stores tasks from a user's AI-generated daily plan.
-- Separate from the `thoughts` table — day plans are ephemeral daily structures,
-- not general-purpose thought captures.
--
-- ADR 0007: why separate table → docs/bolts/0007-day-plan-prompt.md

create table if not exists public.daily_tasks (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        not null references auth.users(id) on delete cascade,
  date              text        not null,              -- 'YYYY-MM-DD' local date
  title             text        not null,
  priority          text        not null default 'medium', -- 'high' | 'medium' | 'low'
  estimated_minutes integer     not null default 25,
  microsteps        jsonb       not null default '[]'::jsonb, -- string[]
  completed         boolean     not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Common query: all tasks for user X on date Y
create index if not exists daily_tasks_user_date
  on public.daily_tasks (user_id, date);

-- ── RLS ────────────────────────────────────────────────────────────────────────
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

-- ── updated_at trigger ─────────────────────────────────────────────────────────
-- Re-uses or creates the set_updated_at() function from 001_dumps_tasks.sql.
-- Safe to run even if function already exists.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger daily_tasks_updated_at
  before update on public.daily_tasks
  for each row execute procedure public.set_updated_at();
