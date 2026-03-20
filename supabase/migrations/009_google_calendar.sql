-- ── Migration 009: Google Calendar integration ──────────────────────────────
-- Stores Google OAuth tokens for Calendar API access.
-- Adds google_event_id to tasks for sync tracking.

-- Google tokens table (encrypted at rest by Supabase)
CREATE TABLE IF NOT EXISTS google_tokens (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  calendar_id TEXT DEFAULT 'primary',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE google_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access own tokens"
  ON google_tokens FOR ALL USING (auth.uid() = user_id);

-- Add google_event_id to tasks for sync tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'google_event_id'
  ) THEN
    ALTER TABLE tasks ADD COLUMN google_event_id TEXT;
  END IF;
END $$;
