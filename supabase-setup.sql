-- =============================================================================
-- MindFlow — Supabase Database Setup
-- Run this entire script in the Supabase SQL Editor (Database → SQL Editor)
-- Safe to run on a fresh project. Uses CREATE TABLE IF NOT EXISTS throughout.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. THOUGHTS TABLE
--    Core data model. Each row is one parsed thought from a brain dump.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.thoughts (
  uid            TEXT             PRIMARY KEY,
  user_id        UUID             NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  raw_text       TEXT,
  normalized_text TEXT,
  type           TEXT             NOT NULL DEFAULT 'task'
                                  CHECK (type IN ('task','note','idea','reminder','expense','memory')),
  priority       TEXT             NOT NULL DEFAULT 'none'
                                  CHECK (priority IN ('none','low','medium','high','critical')),
  tags           TEXT[]           DEFAULT '{}',
  reminder_at    TIMESTAMPTZ,
  is_today       BOOLEAN          NOT NULL DEFAULT false,
  is_archived    BOOLEAN          NOT NULL DEFAULT false,
  source         TEXT             NOT NULL DEFAULT 'app',
  recurrence     TEXT             CHECK (recurrence IN (
                                    'daily','weekly:MON','weekly:TUE','weekly:WED',
                                    'weekly:THU','weekly:FRI','weekly:SAT','weekly:SUN',
                                    'monthly'
                                  )),
  created_at     TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 2. PERSONAS TABLE
--    One row per user. Stores AI-learned behaviour patterns as JSON.
--    Schema of `data` jsonb (maintained by app):
--      { updatedAt, patterns: { tagFreq, topTags, totalTasks, doneTasks,
--                               completionRate, hourCounts, mostActiveHour } }
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.personas (
  user_id    UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data       JSONB       NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 3. INDEXES
-- -----------------------------------------------------------------------------

-- Thoughts: most queries filter by user_id
CREATE INDEX IF NOT EXISTS idx_thoughts_user_id
  ON public.thoughts (user_id);

-- Thoughts: TodayScreen filters by is_today = true
CREATE INDEX IF NOT EXISTS idx_thoughts_is_today
  ON public.thoughts (user_id, is_today)
  WHERE is_today = true;

-- Thoughts: main list excludes archived rows
CREATE INDEX IF NOT EXISTS idx_thoughts_active
  ON public.thoughts (user_id, created_at DESC)
  WHERE is_archived = false;

-- Personas: already PK on user_id, no extra index needed

-- -----------------------------------------------------------------------------
-- 4. UPDATED_AT AUTO-TRIGGER
--    Keeps updated_at current whenever a row is changed.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS thoughts_set_updated_at ON public.thoughts;
CREATE TRIGGER thoughts_set_updated_at
  BEFORE UPDATE ON public.thoughts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS personas_set_updated_at ON public.personas;
CREATE TRIGGER personas_set_updated_at
  BEFORE UPDATE ON public.personas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS)
--    Every user sees and modifies ONLY their own rows.
-- -----------------------------------------------------------------------------
ALTER TABLE public.thoughts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personas ENABLE ROW LEVEL SECURITY;

-- thoughts policies
DROP POLICY IF EXISTS "thoughts: user can select own" ON public.thoughts;
CREATE POLICY "thoughts: user can select own"
  ON public.thoughts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "thoughts: user can insert own" ON public.thoughts;
CREATE POLICY "thoughts: user can insert own"
  ON public.thoughts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "thoughts: user can update own" ON public.thoughts;
CREATE POLICY "thoughts: user can update own"
  ON public.thoughts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "thoughts: user can delete own" ON public.thoughts;
CREATE POLICY "thoughts: user can delete own"
  ON public.thoughts FOR DELETE
  USING (auth.uid() = user_id);

-- personas policies
DROP POLICY IF EXISTS "personas: user can select own" ON public.personas;
CREATE POLICY "personas: user can select own"
  ON public.personas FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "personas: user can insert own" ON public.personas;
CREATE POLICY "personas: user can insert own"
  ON public.personas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "personas: user can update own" ON public.personas;
CREATE POLICY "personas: user can update own"
  ON public.personas FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "personas: user can delete own" ON public.personas;
CREATE POLICY "personas: user can delete own"
  ON public.personas FOR DELETE
  USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 6. GRANT ACCESS TO AUTHENTICATED ROLE
-- -----------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.thoughts TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.personas TO authenticated;

-- -----------------------------------------------------------------------------
-- Done. Verify with:
--   SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public';
-- -----------------------------------------------------------------------------
