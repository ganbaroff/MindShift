-- Fix RLS performance on push_subscriptions.
--
-- auth.uid() re-evaluates on every row scan when used directly in USING().
-- Wrapping in (SELECT auth.uid()) forces a single evaluation per statement,
-- which is the Supabase-recommended pattern for all RLS policies.
-- Reference: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

DROP POLICY IF EXISTS "Users manage own push subscriptions" ON push_subscriptions;

CREATE POLICY "Users manage own push subscriptions"
  ON push_subscriptions FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
