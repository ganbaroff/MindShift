-- Sprint AG-1 | agents + agent_state_log
-- Part of ECOSYSTEM-AGENTS-CONTRACT v1
-- Agents are world inhabitants: public agents (FREE/PRO) + exclusive community agents (ELITE)

-- ── agents ────────────────────────────────────────────────────────────────────

create table if not exists public.agents (
  id              uuid        primary key default gen_random_uuid(),
  slug            text        not null unique,           -- 'mochi', 'guardian', 'strategist'
  display_name    text        not null,
  tier            text        not null default 'FREE'
                              check (tier in ('FREE', 'PRO', 'ELITE')),
  rank            text        not null default 'PROBATIONARY'
                              check (rank in ('PROBATIONARY', 'MEMBER', 'SENIOR', 'LEAD', 'QUARANTINE')),
  state           text        not null default 'idle'
                              check (state in ('idle', 'listening', 'working', 'recovering', 'offline')),
  personality     jsonb       not null default '{}'::jsonb,
  -- personality shape: { tone: string, specialty: string, catchphrase: string, avatar_url: string }
  zeus_agent_id   text,                                  -- maps to ZEUS gateway agent id
  community_id    uuid,                                  -- null = public; set = exclusive to that community
  created_at      timestamptz not null default now(),
  last_active_at  timestamptz
);

alter table public.agents enable row level security;

-- All users can see public agents (community_id IS NULL)
-- Community members can see their community's agents (enforced via community_memberships join)
-- Using (SELECT auth.uid()) pattern per migration 014 — avoids per-row re-evaluation
create policy "Public agents are visible to all"
  on public.agents for select
  using (community_id is null or exists (
    select 1 from public.community_memberships cm
    where cm.community_id = agents.community_id
      and cm.user_id = (select auth.uid())
  ));

-- Only service role can insert/update agents (managed via migrations + admin)
-- No user-facing insert policy

create index if not exists agents_tier_idx   on public.agents(tier);
create index if not exists agents_state_idx  on public.agents(state);
create index if not exists agents_slug_idx   on public.agents(slug);

-- ── agent_state_log ───────────────────────────────────────────────────────────
-- Append-only audit: every state transition logged
-- Used for: analytics, debugging, agent trust scoring

create table if not exists public.agent_state_log (
  id          uuid        primary key default gen_random_uuid(),
  agent_id    uuid        not null references public.agents(id) on delete cascade,
  state       text        not null
              check (state in ('idle', 'listening', 'working', 'recovering', 'offline')),
  reason      text,                                      -- 'user_request', 'bug_detected', 'scheduled'
  user_id     uuid        references auth.users(id) on delete set null,
  started_at  timestamptz not null default now(),
  ended_at    timestamptz
);

alter table public.agent_state_log enable row level security;

create policy "Users can read agent state log for public agents"
  on public.agent_state_log for select
  using (exists (
    select 1 from public.agents a
    where a.id = agent_state_log.agent_id
      and (a.community_id is null or exists (
        select 1 from public.community_memberships cm
        where cm.community_id = a.community_id
          and cm.user_id = (select auth.uid())
      ))
  ));

create index if not exists agent_state_log_agent_idx
  on public.agent_state_log(agent_id, started_at desc);

create index if not exists agent_state_log_user_idx
  on public.agent_state_log(user_id, started_at desc);

-- ── Seed: core public agents ──────────────────────────────────────────────────
-- These are the 5 baseline inhabitants of the world.
-- tier=FREE agents are available to all users.
-- tier=PRO agents use Groq API (faster, richer responses).

insert into public.agents (slug, display_name, tier, rank, state, personality, zeus_agent_id) values
  ('mochi',
   'Mochi',
   'FREE',
   'MEMBER',
   'idle',
   '{"tone":"warm","specialty":"focus_companion","catchphrase":"Я рядом. Начни — я не отстану.","avatar_url":"/agents/mochi.png"}'::jsonb,
   'mochi-respond'),

  ('guardian',
   'Guardian',
   'PRO',
   'SENIOR',
   'idle',
   '{"tone":"calm_protective","specialty":"bug_catcher","catchphrase":"Тихо. Я слежу.","avatar_url":"/agents/guardian.png"}'::jsonb,
   'security-agent'),

  ('strategist',
   'Strategist',
   'PRO',
   'SENIOR',
   'idle',
   '{"tone":"direct","specialty":"growth_analysis","catchphrase":"Факты. Решение. Действие.","avatar_url":"/agents/strategist.png"}'::jsonb,
   'analytics-retention-agent'),

  ('coach',
   'Coach',
   'FREE',
   'MEMBER',
   'idle',
   '{"tone":"encouraging_grounded","specialty":"adhd_support","catchphrase":"Ты показался. Это считается.","avatar_url":"/agents/coach.png"}'::jsonb,
   'ux-research-agent'),

  ('scout',
   'Scout',
   'FREE',
   'PROBATIONARY',
   'idle',
   '{"tone":"curious","specialty":"exploration","catchphrase":"Нашёл кое-что интересное...","avatar_url":"/agents/scout.png"}'::jsonb,
   'product-agent')

on conflict (slug) do nothing;
