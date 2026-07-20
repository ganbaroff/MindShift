-- 038 | Factory control state — the single row the daily factory obeys (Ф2, 2026-07-20).
--
-- The Пульт bot UPSERTs this row; make-clip.mjs READs it at the top of each run. Gives the CEO
-- real control over the daily channel from Telegram: posting on/off, genre pick, feed-your-own-script.
--
-- Single-row table (id fixed = 1). Seeded with SAFE DEFAULTS = today's behavior (posting on, news,
-- no queued script), so even before the bot writes anything the factory runs exactly as it does now.
-- Security: RLS ON, no policies → deny-all for anon/authenticated; service role (edge fn / cron) only.

create table if not exists public.factory_control (
  id              int         primary key default 1,
  posting_enabled boolean     not null default true,
  active_genre    text        not null default 'news'
                              check (active_genre in ('news', 'quiz')),
  queued_script   text,
  updated_by      text        not null default 'default',
  updated_at      timestamptz not null default now(),
  constraint factory_control_singleton check (id = 1)
);

-- seed the single row so a first read always finds the safe default
insert into public.factory_control (id, posting_enabled, active_genre, queued_script, updated_by)
values (1, true, 'news', null, 'migration')
on conflict (id) do nothing;

alter table public.factory_control enable row level security;

comment on table public.factory_control is
  'Single-row control state for the daily media factory. Пульт bot upserts; make-clip.mjs reads. posting_enabled/active_genre/queued_script. RLS on, service-role only. Ф2 2026-07-20.';
