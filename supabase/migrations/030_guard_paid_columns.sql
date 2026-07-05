-- 030 | Guard paid-gate columns on public.users against self-grant.
-- The "Users can update own row" RLS policy has with_check=NULL, so a logged-in
-- user could PATCH their own subscription_tier/trial_ends_at to 'pro' via PostgREST
-- with the public anon key, bypassing the whole Dodo checkout/webhook pipeline.
-- Fix: BEFORE UPDATE trigger that rejects changes to the paid-gate columns unless
-- the caller is the service role (dodo-webhook). Additive + reversible; keeps the
-- existing UPDATE policy intact so users can still edit their own profile fields.

create or replace function public.guard_users_paid_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- service_role (dodo-webhook) is the sole writer of paid-gate columns.
  if auth.role() = 'service_role' then
    return new;
  end if;

  -- Any non-service-role UPDATE must leave the paid-gate columns untouched.
  if new.subscription_tier is distinct from old.subscription_tier then
    raise exception 'subscription_tier is managed by billing and cannot be changed here'
      using errcode = '42501';
  end if;
  if new.trial_ends_at is distinct from old.trial_ends_at then
    raise exception 'trial_ends_at is managed by billing and cannot be changed here'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists users_guard_paid_columns on public.users;
create trigger users_guard_paid_columns
  before update on public.users
  for each row execute function public.guard_users_paid_columns();

comment on function public.guard_users_paid_columns() is
  'Blocks non-service-role UPDATEs from changing subscription_tier/trial_ends_at (anti self-grant). Rollback: drop trigger users_guard_paid_columns on public.users; drop function public.guard_users_paid_columns().';
