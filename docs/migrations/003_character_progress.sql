-- =============================================================================
-- Migration 003 — character_progress
-- Bolt 2.4: Evening Review + Character Progress
--
-- Table: character_progress
--   One row per user. Upserted after each evening review.
--   level = floor(total_xp / 100) + 1  (ADR 0008)
--   XP is activity-based, not completion-based (see ADR 0008).
-- =============================================================================

-- Idempotent: trigger function may already exist from 001 or 002
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── Table ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS character_progress (
  user_id          uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_xp         integer     NOT NULL DEFAULT 0 CHECK (total_xp >= 0),
  level            integer     NOT NULL DEFAULT 1 CHECK (level >= 1),
  last_review_date date,
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- ── Trigger ──────────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_character_progress_updated_at ON character_progress;
CREATE TRIGGER trg_character_progress_updated_at
  BEFORE UPDATE ON character_progress
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE character_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own progress" ON character_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own progress" ON character_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own progress" ON character_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- No DELETE policy — progress is permanent (no streak-reset shame loops).
-- If a user wants to reset, they contact support (future: self-service in settings).
