-- =============================================================================
-- Migration 004 — usage_limits + user_profiles
-- Bolt 2.5: Freemium Gate
--
-- Tables:
--   usage_limits   — per-user, per-day AI call counts
--   user_profiles  — Pro flag (expandable)
--
-- Free limits (ADR 0009):
--   day_plan_calls:      3 per UTC day
--   evening_review_calls: 1 per UTC day
--
-- Limits reset at UTC midnight (date TEXT 'YYYY-MM-DD').
-- Pro users bypass all limits via user_profiles.is_pro.
-- =============================================================================

-- ── user_profiles ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id    uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_pro     boolean     NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Idempotent trigger function (may exist from earlier migrations)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- ── usage_limits ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS usage_limits (
  user_id              uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date                 text    NOT NULL,   -- 'YYYY-MM-DD' UTC
  day_plan_calls       integer NOT NULL DEFAULT 0 CHECK (day_plan_calls >= 0),
  evening_review_calls integer NOT NULL DEFAULT 0 CHECK (evening_review_calls >= 0),
  PRIMARY KEY (user_id, date)
);

ALTER TABLE usage_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own usage" ON usage_limits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own usage" ON usage_limits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own usage" ON usage_limits
  FOR UPDATE USING (auth.uid() = user_id);

-- No DELETE policy — usage history is append-only (audit trail).
-- Old rows accumulate; cleanup via scheduled DB job if needed (future).
