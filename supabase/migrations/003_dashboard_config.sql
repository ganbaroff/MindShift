-- MindShift — dashboard_config JSONB for bento grid widget layout
-- Research #1 (Adaptive Onboarding) recommendation:
-- Store widget order + visibility in Supabase so layout survives
-- across devices and sign-out/sign-in cycles.
--
-- Structure: { "widgets": WidgetConfig[] }
-- Synced debounced 500ms after every drag / visibility toggle.
-- Run via: Supabase Dashboard > SQL Editor > Run

alter table public.users
  add column if not exists dashboard_config jsonb not null default '{}'::jsonb;

-- Index for faster reads (JSONB GIN — supports key existence / containment queries)
create index if not exists users_dashboard_config_gin
  on public.users using gin (dashboard_config);

comment on column public.users.dashboard_config is
  'Bento grid layout: { widgets: WidgetConfig[] }. Synced debounced 500ms from client.';
