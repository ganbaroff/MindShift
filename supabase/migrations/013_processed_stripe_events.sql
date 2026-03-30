-- ── 013_processed_stripe_events.sql ──────────────────────────────────────────
-- Idempotency table for Stripe webhook events.
-- stripe-webhook edge function checks this table before processing any event
-- to skip duplicate webhook deliveries (Stripe guarantees at-least-once).

create table if not exists processed_stripe_events (
  event_id   text        primary key,
  created_at timestamptz not null default now()
);

-- Auto-prune events older than 30 days (Stripe retries within 3 days)
-- Run via pg_cron or manually; keeps table small.
comment on table processed_stripe_events is
  'Idempotency log for Stripe webhook events. Prune rows older than 30 days.';

-- RLS: service role only (edge function uses service role key)
alter table processed_stripe_events enable row level security;

-- No SELECT/INSERT policies needed — service role bypasses RLS
