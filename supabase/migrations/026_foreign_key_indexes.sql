-- Migration 026: Add missing foreign key indexes
-- Speeds up database queries and cascading deletes.

CREATE INDEX IF NOT EXISTS idx_tasks_parent
  ON public.tasks (parent_task_id);

CREATE INDEX IF NOT EXISTS idx_focus_sessions_task
  ON public.focus_sessions (task_id);

CREATE INDEX IF NOT EXISTS idx_energy_logs_session
  ON public.energy_logs (session_id);

CREATE INDEX IF NOT EXISTS idx_user_behavior_user
  ON public.user_behavior (user_id);

CREATE INDEX IF NOT EXISTS idx_achievements_user
  ON public.achievements (user_id);

CREATE INDEX IF NOT EXISTS idx_daily_tasks_user
  ON public.daily_tasks (user_id);

CREATE INDEX IF NOT EXISTS idx_usage_limits_user
  ON public.usage_limits (user_id);
