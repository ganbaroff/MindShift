-- MindShift — Migration 005: Legal Consent Tracking
-- Run via: Supabase Dashboard > SQL Editor > Run
--
-- Adds consent audit columns to public.users so we can prove:
-- (1) the user accepted Terms at a specific timestamp
-- (2) which version of the Terms they accepted
-- (3) whether they confirmed they are 16+ (required by GDPR Art. 8)
-- (4) when they accepted cookie/analytics policy

alter table public.users
  add column if not exists terms_accepted_at  timestamptz,
  add column if not exists terms_version      text        default null,
  add column if not exists age_confirmed      boolean     not null default false,
  add column if not exists cookie_accepted_at timestamptz;

-- Index for compliance queries (e.g. "who accepted before version X?")
create index if not exists users_terms_version_idx
  on public.users(terms_version)
  where terms_accepted_at is not null;

-- Comment for future auditors
comment on column public.users.terms_accepted_at  is 'UTC timestamp when user accepted Terms of Service and Privacy Policy';
comment on column public.users.terms_version      is 'Version string of Terms the user accepted (e.g. "2026-03")';
comment on column public.users.age_confirmed      is 'True when user confirmed they are 16 or older (GDPR Art. 8)';
comment on column public.users.cookie_accepted_at is 'UTC timestamp when user accepted cookie/analytics notice';
