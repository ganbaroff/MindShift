-- 036_publish_journal.sql
-- Cross-runner idempotency for the kapibara content factory.
--
-- APPLIED 2026-07-06 via Supabase MCP (migration name "publish_journal") on project
-- ref awfoqycoltvhamtrsvxk. This file is the repo record for replayability/documentation;
-- the table already exists in production. Re-running it is a safe no-op (IF NOT EXISTS).
--
-- WHY: the daily GitHub Actions workflow has 3 cron slots for reliability. Idempotency
-- previously relied on tmp/kapibara/state.json + tmp/kapibara/published.json, but both are
-- gitignored + runner-local, so every fresh CI runner was blind and re-published. On
-- 2026-07-06 two similar posts landed 27 min apart. This table is the cross-runner source
-- of truth: a single row per (episode_date, format, svc). RLS is ON with NO policies, so
-- only the service-role key (which bypasses RLS) can read/write it.

create table if not exists public.publish_journal (
  id           bigint generated always as identity primary key,
  episode_date date        not null,
  format       text        not null,   -- 'ai-news' | 'ladder' | 'football'
  svc          text        not null,   -- 'instagram' | 'tiktok' | ...
  post_id      text,
  caption_lang text,
  gcs_url      text,
  run_id       text,
  created_at   timestamptz not null default now(),
  unique (episode_date, format, svc)
);

-- Lookup path used by isPublished(): filter by (episode_date, format).
create index if not exists publish_journal_date_format_idx
  on public.publish_journal (episode_date, format);

-- RLS enabled, NO policies => service-role key only (client anon key sees nothing).
alter table public.publish_journal enable row level security;
