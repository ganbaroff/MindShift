-- ============================================================================
-- Migration 001 — dumps + tasks tables
-- bolt-2.1: brain dump → today pipeline
-- Run in Supabase SQL editor (Dashboard → SQL Editor → New query)
-- ============================================================================

-- ============================================================================
-- TABLE: dumps
-- Stores each raw brain-dump session (text + AI result).
-- One dump record per "Process thoughts" submission.
-- ============================================================================

CREATE TABLE IF NOT EXISTS dumps (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        REFERENCES auth.users NOT NULL,
  raw_text    text        NOT NULL,           -- verbatim user input
  created_at  timestamptz DEFAULT now(),
  processed   boolean     DEFAULT false,      -- true once AI has run
  ai_result   jsonb                           -- full AI output ({ tasks, events, notes })
);

-- Index for user-scoped queries
CREATE INDEX IF NOT EXISTS dumps_user_id_idx ON dumps (user_id, created_at DESC);

-- Row Level Security
ALTER TABLE dumps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own dumps"
  ON dumps FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own dumps"
  ON dumps FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own dumps"
  ON dumps FOR UPDATE
  USING (auth.uid() = user_id);


-- ============================================================================
-- TABLE: tasks
-- Structured tasks generated from brain dumps, with micro-step decomposition.
-- A task has ONE visible first step (step_one) and hidden additional steps.
-- ============================================================================

CREATE TABLE IF NOT EXISTS tasks (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        REFERENCES auth.users NOT NULL,
  title            text        NOT NULL,
  step_one         text,                      -- first concrete action, always visible
  steps            jsonb,                     -- full step array, hidden by default
  source_dump_id   uuid        REFERENCES dumps(id) ON DELETE SET NULL,
  scheduled_date   date,                      -- null = unscheduled
  status           text        DEFAULT 'active', -- active | done | archived
  energy_required  text,                      -- low | medium | high
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS tasks_user_status_idx ON tasks (user_id, status, scheduled_date);

-- Row Level Security
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own tasks"
  ON tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own tasks"
  ON tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own tasks"
  ON tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own tasks"
  ON tasks FOR DELETE
  USING (auth.uid() = user_id);


-- ============================================================================
-- FUNCTION: auto-update updated_at on tasks
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
