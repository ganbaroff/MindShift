-- MindShift — Audit fixes (production readiness sprint)
-- Run via: Supabase Dashboard > SQL Editor > Run

-- ── Fix DB-05: activate_trial auth guard (privilege escalation) ──────────────
-- Previously any authenticated user could activate a trial for ANY user_id.
-- Now rejects calls where p_user_id != auth.uid().

create or replace function public.activate_trial(p_user_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_trial_end timestamptz;
begin
  -- Authorization guard: only own trial can be activated
  if p_user_id <> auth.uid() then
    raise exception 'Unauthorized: can only activate own trial';
  end if;

  v_trial_end := now() + interval '30 days';

  -- Update user row
  update public.users
  set subscription_tier = 'pro_trial',
      trial_ends_at = v_trial_end
  where id = p_user_id
    and subscription_tier = 'free'; -- only activate if currently free

  -- Log subscription event
  insert into public.subscriptions (user_id, tier, ends_at)
  values (p_user_id, 'pro_trial', v_trial_end);
end;
$$;

-- ── Fix DB-06: Add UPDATE/DELETE policies for subscriptions ──────────────────

create policy "Users can update own subscriptions"
  on public.subscriptions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Fix DB-01: Missing index for task ordering by created_at ─────────────────

create index if not exists tasks_user_created_idx
  on public.tasks(user_id, created_at desc);

-- ── Fix DB-02: Missing index on focus_sessions.task_id (FK perf) ─────────────

create index if not exists focus_sessions_task_idx
  on public.focus_sessions(task_id) where task_id is not null;

-- ── Fix DB-07: Drop unnecessary GIN index on dashboard_config ────────────────
-- Only queried via primary key lookup; GIN adds write overhead with no benefit.

drop index if exists users_dashboard_config_gin;

-- ── Fix DB-08: Consent columns append-only trigger ───────────────────────────
-- Prevents users from clearing their own consent fields once set.

create or replace function public.protect_consent_fields()
returns trigger
language plpgsql
as $$
begin
  -- Prevent setting consent timestamps back to NULL once set
  if old.terms_accepted_at is not null and new.terms_accepted_at is null then
    new.terms_accepted_at := old.terms_accepted_at;
  end if;
  if old.cookie_accepted_at is not null and new.cookie_accepted_at is null then
    new.cookie_accepted_at := old.cookie_accepted_at;
  end if;
  if old.age_confirmed = true and new.age_confirmed = false then
    new.age_confirmed := old.age_confirmed;
  end if;
  return new;
end;
$$;

create trigger protect_consent_fields_trigger
  before update on public.users
  for each row
  execute function public.protect_consent_fields();
