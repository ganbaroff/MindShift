-- ── Migration 007: Health Profile ──────────────────────────────────────────
-- Adds difficulty_level to tasks (Traffic Light, Block 6)
-- Adds burnout_score to user_behavior (Burnout Radar, Block 2)
-- energy_logs already exists (created in 001_init.sql)
-- Health preferences (timerStyle, chronotype, etc.) stay in localStorage only.

-- Traffic Light difficulty (nullable — backward compat with existing tasks)
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS difficulty_level text
    CHECK (difficulty_level IN ('easy', 'medium', 'hard'));

-- Burnout score on user_behavior (computed daily, 0–100)
ALTER TABLE user_behavior
  ADD COLUMN IF NOT EXISTS burnout_score integer NOT NULL DEFAULT 0
    CHECK (burnout_score >= 0 AND burnout_score <= 100);

-- RLS: existing policies on tasks and user_behavior already cover new columns.
-- No new table, no new policy needed.
