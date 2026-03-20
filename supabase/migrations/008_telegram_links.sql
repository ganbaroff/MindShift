-- ── Telegram integration ──────────────────────────────────────────────────────
-- Links Telegram users to MindShift accounts for task creation via bot.
-- Flow: user generates 6-char code in Settings → sends /link CODE to bot →
-- bot verifies code and stores telegram_id → future messages create tasks.

CREATE TABLE IF NOT EXISTS telegram_links (
  telegram_id         bigint PRIMARY KEY,
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  link_code           text UNIQUE,
  linked_at           timestamptz DEFAULT now(),
  daily_message_count int DEFAULT 0,
  last_message_date   date DEFAULT CURRENT_DATE
);

-- Index for fast lookup by link_code (used during /link flow)
CREATE INDEX IF NOT EXISTS idx_telegram_links_code ON telegram_links(link_code) WHERE link_code IS NOT NULL;

-- Index for user_id (used for disconnect / settings queries)
CREATE INDEX IF NOT EXISTS idx_telegram_links_user ON telegram_links(user_id);

-- RLS: users can only see/manage their own link
ALTER TABLE telegram_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own telegram link"
  ON telegram_links FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own telegram link"
  ON telegram_links FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own telegram link"
  ON telegram_links FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own telegram link"
  ON telegram_links FOR DELETE
  USING (auth.uid() = user_id);

-- Service role (edge functions) bypasses RLS to handle bot webhook writes.
-- The webhook uses service_role key to:
--   1. Look up telegram_id on every incoming message
--   2. Link telegram_id to user_id during /link flow
--   3. Update daily_message_count for rate limiting
--   4. Insert tasks on behalf of the user
