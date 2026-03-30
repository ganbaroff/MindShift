-- Migration 012: Add repeat, category columns to tasks; add gamma to audio_preset constraint
-- These fields are used in code (useTaskSync.ts) but were missing from the schema.

-- Add repeat column (matches Task type: 'none' | 'daily' | 'weekly')
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS repeat text NOT NULL DEFAULT 'none'
  CHECK (repeat IN ('none', 'daily', 'weekly'));

-- Add category column (matches TaskCategory type)
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS category text
  CHECK (category IS NULL OR category IN ('work', 'personal', 'health', 'learning', 'finance'));

-- Fix audio_preset constraint on focus_sessions to include 'gamma'
-- Drop old constraint, add new one including gamma
ALTER TABLE focus_sessions
  DROP CONSTRAINT IF EXISTS focus_sessions_audio_preset_check;

ALTER TABLE focus_sessions
  ADD CONSTRAINT focus_sessions_audio_preset_check
  CHECK (audio_preset IS NULL OR audio_preset IN ('brown', 'lofi', 'nature', 'pink', 'gamma'));

-- Update TaskRow type comment for documentation
COMMENT ON COLUMN tasks.repeat IS 'Recurrence: none | daily | weekly';
COMMENT ON COLUMN tasks.category IS 'Task category: work | personal | health | learning | finance';
