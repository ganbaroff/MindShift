-- Fix RLS performance: wrap auth.uid() in (SELECT ...) to prevent per-row re-evaluation
-- Applies to google_tokens and telegram_links tables

-- google_tokens
DROP POLICY IF EXISTS "Users can only access own tokens" ON google_tokens;
CREATE POLICY "Users can only access own tokens"
  ON google_tokens FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- telegram_links (4 policies)
DROP POLICY IF EXISTS "Users can read own links" ON telegram_links;
DROP POLICY IF EXISTS "Users can insert own links" ON telegram_links;
DROP POLICY IF EXISTS "Users can update own links" ON telegram_links;
DROP POLICY IF EXISTS "Users can delete own links" ON telegram_links;

CREATE POLICY "Users can read own links"
  ON telegram_links FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own links"
  ON telegram_links FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own links"
  ON telegram_links FOR UPDATE
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own links"
  ON telegram_links FOR DELETE
  USING ((SELECT auth.uid()) = user_id);
