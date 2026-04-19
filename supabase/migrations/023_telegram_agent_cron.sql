-- 023_telegram_agent_cron.sql
--
-- Schedules the telegram-agent-update edge function to run daily at 08:57 UTC
-- via pg_cron. Messages go out just before the 09:00 AM hour so they land
-- at the start of the user's morning — not in the middle of it.
--
-- pg_cron must be enabled in the Supabase dashboard:
-- https://supabase.com/dashboard/project/awfoqycoltvhamtrsvxk/database/extensions
--
-- The CRON_SECRET and TELEGRAM_BOT_TOKEN secrets must be set:
-- supabase secrets set CRON_SECRET=<value>
-- supabase secrets set TELEGRAM_BOT_TOKEN=<value>

select
  cron.schedule(
    'telegram-agent-daily-update',          -- job name (unique)
    '57 8 * * *',                           -- 08:57 UTC every day
    $$
    select
      net.http_post(
        url := 'https://awfoqycoltvhamtrsvxk.supabase.co/functions/v1/telegram-agent-update',
        headers := jsonb_build_object(
          'Content-Type',  'application/json',
          'x-cron-secret', current_setting('app.cron_secret', true)
        ),
        body := '{}'::jsonb
      );
    $$
  );
