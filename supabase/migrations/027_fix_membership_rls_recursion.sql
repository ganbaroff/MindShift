-- 027 | FIX: infinite recursion in community_memberships RLS
--
-- BUG (found 2026-07-04 during funnel E2E proof):
--   The "Members can see co-members" SELECT policy on community_memberships
--   (migration 017, lines 61-67) references community_memberships inside its
--   own USING clause via `EXISTS (SELECT 1 FROM community_memberships ...)`.
--   Postgres re-applies the same SELECT policy to that inner query → infinite
--   recursion. Error at query time:
--     ERROR: 42P17: infinite recursion detected in policy for relation
--            "community_memberships"
--
-- BLAST RADIUS: this poisons ANY query whose RLS touches community_memberships:
--   - public.agents SELECT policy ("Agents visible to public or community members")
--     does an EXISTS against community_memberships → recurses → errors.
--   - agent-chat edge function selects from public.agents under the caller's JWT,
--     so the row lookup errors and .single() returns 404 "Agent not found".
--     => FUNNEL STEP 2 (agent-chat dialogue) is broken for every authenticated user.
--   - public.communities SELECT policy has the same EXISTS pattern → also affected.
--
-- FIX (standard Supabase pattern): move the co-membership check into a
-- SECURITY DEFINER function. SECURITY DEFINER runs as the function owner and
-- bypasses RLS on the tables it reads, so the recursive re-entry never happens.
-- Behaviour is preserved: a member can still see co-members of communities they
-- belong to; non-members still cannot.
--
-- SAFETY: additive + idempotent. Drops and recreates only the one broken policy.
-- The "Users can read own memberships" policy is untouched (it is not recursive).

-- ── helper: is the current user a member of this community? ───────────────────
-- SECURITY DEFINER → reads community_memberships WITHOUT triggering its RLS,
-- which is exactly what breaks the recursion. search_path pinned per project rule.
create or replace function public.is_community_member(p_community_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.community_memberships m
    where m.community_id = p_community_id
      and m.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_community_member(uuid) from public;
grant execute on function public.is_community_member(uuid) to authenticated;

-- ── replace the recursive policy on community_memberships ─────────────────────
drop policy if exists "Members can see co-members" on public.community_memberships;

create policy "Members can see co-members"
  on public.community_memberships for select
  using (public.is_community_member(community_id));

-- ── (same recursion class) fix communities SELECT policy ──────────────────────
-- Migration 017 line 26-32 embeds the same EXISTS-against-community_memberships.
-- Route it through the helper so a communities read never re-enters membership RLS.
drop policy if exists "OPEN communities visible to all" on public.communities;

create policy "OPEN communities visible to all"
  on public.communities for select
  using (tier = 'OPEN' or public.is_community_member(id));

-- ── agents SELECT policy: route the membership check through the helper too ───
-- Migration 016/community contract policy embeds EXISTS(... community_memberships).
-- With the helper, an agents read no longer re-enters membership RLS.
drop policy if exists "Agents visible to public or community members" on public.agents;

create policy "Agents visible to public or community members"
  on public.agents for select
  using (community_id is null or public.is_community_member(community_id));

-- NOTE: not applied to prod by the funnel builder. Apply via CEO-approved deploy.
-- Verify after apply:
--   set local role authenticated;
--   set local request.jwt.claims = '{"sub":"<uuid>","role":"authenticated"}';
--   select slug from public.agents where slug = 'mochi';  -- must return 1 row, no recursion error
