-- 034 | «Пульт v1» command queue — the CEO's phone control panel for the media factory.
--
-- The creator-pult edge function (Telegram webhook for @CreatorBy_bot) enqueues rows here;
-- pult_worker.mjs (GitHub Actions poller, every 10 min) claims + executes them out-of-band,
-- because the actual work (make-clip / ladder_render / buffer_publish) is a 15-40 min render
-- that cannot run inside a 150s edge function.
--
-- NOTE: task spec said "030_pult_commands.sql", but 030-033 are already taken
-- (030_guard_paid_columns, 031_telegram_processed_updates, 032_funnel_rate_limits,
-- 033_revoke_touch_funnel_guests_execute). Using the next free number, 034.
--
-- Security model: RLS ON, NO policies → deny-all for anon/authenticated. Only the
-- service role (edge function insert; worker claim/update via PostgREST + service key)
-- can touch this table. Mirrors the 031_telegram_processed_updates convention.

create table if not exists public.pult_commands (
  id         uuid        primary key default gen_random_uuid(),
  chat_id    bigint      not null,
  cmd        text        not null,
  args       jsonb       not null default '{}'::jsonb,
  status     text        not null default 'pending'
                         check (status in ('pending', 'processing', 'done', 'failed')),
  result     text,
  created_at timestamptz not null default now(),
  claimed_at timestamptz
);

-- Worker claims the oldest pending row: WHERE status='pending' ORDER BY created_at LIMIT 1.
-- This partial index keeps that scan cheap as done/failed rows accumulate.
create index if not exists idx_pult_commands_pending
  on public.pult_commands (created_at)
  where status = 'pending';

alter table public.pult_commands enable row level security;

-- Deliberately NO policies. RLS-on-with-no-policy denies every request from the anon
-- and authenticated roles; the service role bypasses RLS entirely. v1 obscurity for the
-- webhook URL (?k=) is a SEPARATE layer — this table is never reachable from a browser.

comment on table public.pult_commands is
  '«Пульт v1» command queue. creator-pult edge fn inserts (cmd=make|publish, args.format=news|ladder); pult_worker.mjs (CI, every 10 min) claims oldest pending → processing → done/failed with result text. Service-role only (RLS on, no policy).';
