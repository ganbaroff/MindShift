# Shared Layer

Utilities, services, hooks and UI components used by two or more feature slices.

- `lib/` — Pure utility functions (no React): `uid()`, `isToday()`, date formatters, streak calculation
- `services/` — Async service wrappers: `supabase.ts` (all DB calls), `claude.ts` (all AI calls)
- `hooks/` — Custom React hooks: `useAuth`, `useThoughts`, `usePersona`, `useOffline`
- `ui/` — Reusable React components: `ThoughtCard`, `BottomNav`, `ProBanner`, `Spinner`, `Toast`

## Current Status

Directories created in Sprint 0. Code will be migrated here from `src/mindflow.jsx` during Sprint 1.

## Rules

- `lib/` must be pure functions — no React imports, no side effects.
- `services/` must be pure async functions — no React state, no UI.
- Changes to `services/supabase.ts` or `services/claude.ts` require review (security-sensitive).
