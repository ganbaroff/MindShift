-- 031 | Idempotency log for Telegram webhook updates.
-- telegram-webhook cold starts run 11-12s; Telegram retries any slow/non-2xx
-- delivery, replaying the SAME update_id. Without dedup this double-inserts tasks,
-- doubles agent-chat LLM calls, and double-fires create-checkout on the final turn.
-- Mirrors the processed_stripe_events pattern. Service-role only (RLS on, no policy).

create table if not exists public.telegram_processed_updates (
  update_id    bigint      primary key,
  processed_at timestamptz not null default now()
);

alter table public.telegram_processed_updates enable row level security;

comment on table public.telegram_processed_updates is
  'Idempotency log for Telegram webhook update_id. Insert ON CONFLICT DO NOTHING at handler top; skip processing on conflict. Prune rows older than 7 days (Telegram retries within minutes). Service-role only.';
