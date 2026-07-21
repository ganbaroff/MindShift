-- 039 | kapibara_episodes + kapibara_metrics — the tables supabase_sync.mjs has 404'd on
-- EVERY daily run since the beginning ("[sync] episode upsert failed (404) PGRST205").
-- Shapes mirror the existing writer supabase_sync.mjs exactly:
--   episodes: upserted via on_conflict=date,format  -> REQUIRES unique(date,format)
--   metrics:  plain POST each run                    -> NO unique(episode_id,svc): each row is a
--             point-in-time snapshot (future T+24/72h re-pulls APPEND — a time series, not a slot).
-- Security: RLS ON, no policies -> deny-all for anon/authenticated; service role only (house style).

create table if not exists public.kapibara_episodes (
  id          bigint      generated always as identity primary key,
  date        date        not null,
  format      text        not null,
  episode     text,
  video_file  text,
  gcs_url     text,
  size_mb     numeric,
  created_at  timestamptz not null default now(),
  unique (date, format)
);

create table if not exists public.kapibara_metrics (
  id             bigint      generated always as identity primary key,
  episode_id     bigint      not null references public.kapibara_episodes(id) on delete cascade,
  svc            text        not null,
  status         text,
  buffer_post_id text,
  external_link  text,
  views          int,
  reach          int,
  reactions      int,
  comments       int,
  shares         int,
  saves          int,
  eng_rate       numeric,
  error          text,
  created_at     timestamptz not null default now()
);

alter table public.kapibara_episodes enable row level security;
alter table public.kapibara_metrics  enable row level security;

comment on table public.kapibara_episodes is
  'Daily episode registry; supabase_sync.mjs upserts on (date,format). RLS on, service-role only. 039, 2026-07-21.';
comment on table public.kapibara_metrics is
  'Per-post metrics snapshots (append-only time series; T+24/72h re-pulls append rows). RLS on, service-role only. 039, 2026-07-21.';
