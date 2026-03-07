-- Migration 005 — Persona Archetype columns on user_profiles
-- Bolt 3.1 — Persona / Character UI
-- Date: 2026-03-08
--
-- Run in Supabase SQL editor (or via CLI migration).
-- No new RLS policies needed — existing "auth.uid() = user_id" policies
-- on user_profiles cover any new columns automatically.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS persona_archetype varchar(32) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS persona_name       varchar(64) DEFAULT NULL;

-- persona_archetype: one of 'explorer' | 'builder' | 'dreamer' | 'guardian'
-- persona_name: user-chosen display name, defaults to archetype default name
