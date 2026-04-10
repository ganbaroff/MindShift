-- 022_llm_policy.sql
-- Adds llm_policy to agents: each agent declares what quality brain it needs.
-- Decouples model routing from user tier (tier = access, policy = quality requirement).
-- See docs/ROUTER-CONTRACT.md for full spec.

alter table public.agents
  add column if not exists llm_policy text not null default 'balanced'
    check (llm_policy in ('ultra_fast', 'balanced', 'max_quality'));

comment on column public.agents.llm_policy is
  'LLM quality policy: ultra_fast (<400ms), balanced (<800ms), max_quality (<3s). '
  'Combined with user subscription_tier to resolve final model chain.';

-- Seed values: set per-agent based on task profile
-- ultra_fast: warm companions, casual chat, low-latency mascots
-- balanced:   analysis, security, productivity agents
update public.agents set llm_policy = 'ultra_fast'
  where slug in ('mochi', 'coach', 'scout');

update public.agents set llm_policy = 'balanced'
  where slug in ('guardian', 'strategist');
