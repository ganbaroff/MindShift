-- 037 | «Пульт v2» brief queue.
--
-- Table public.pult_briefs stores the state of video briefs generated via Telegram
-- and driven through all gates.
--
-- Security model: RLS ON, NO policies → deny-all for anon/authenticated. Accessible only
-- by the service role (edge function / CI poller).
-
create table if not exists public.pult_briefs (
  id             uuid        primary key default gen_random_uuid(),
  chat_id        bigint      not null,
  state          text        not null default 'draft'
                             check (state in (
                               'draft',
                               'brief_ok',
                               'scripted',
                               'script_ok',
                               'voiced',
                               'voice_ok',
                               'rendered',
                               'qa_pass',
                               'delivering',
                               'delivered',
                               'published'
                             )),
  brief          jsonb       not null,
  episodes       jsonb       not null default '[]'::jsonb,
  receipts       jsonb       not null default '{}'::jsonb,
  rework_reason  text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Index for runnable briefs (brief_ok, script_ok, voice_ok, qa_pass)
create index if not exists idx_pult_briefs_runnable
  on public.pult_briefs (state)
  where state in ('brief_ok', 'script_ok', 'voice_ok', 'qa_pass');

alter table public.pult_briefs enable row level security;

comment on table public.pult_briefs is
  '«Пульт v2» content briefs and execution state. creator-pult edge function inserts/updates; conveyor_worker.mjs processes transitions. RLS on, service-role only.';
