-- Migration 006 — persona_calls column on usage_limits
-- Bolt 3.2 — AI Persona Dialogue
-- Date: 2026-03-08
--
-- Run in Supabase SQL editor after migration 005.
-- Adds a daily call counter for persona dialogue (limit: 5/day for free tier).
-- No new RLS needed — existing user_id scoping policies cover new columns.

ALTER TABLE public.usage_limits
  ADD COLUMN IF NOT EXISTS persona_calls integer DEFAULT 0;

-- persona_calls: count of AI persona dialogue messages sent today.
-- Free tier limit: 5 per UTC day (ADR 0012).
-- Increment handled by sbCheckAndIncrementUsage with field="persona_calls", limit=5.
