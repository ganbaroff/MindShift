# Skeleton Layer

> **Human-owned. Do not modify without an ADR and explicit permission from Yusif.**

This layer defines the architectural boundaries that AI agents must not cross unilaterally:

- `app-shell/` — Root App component, routing setup, error boundaries, global providers
- `design-system/` — Design tokens (C object), typography scale, spacing, component primitives
- `security/` — Auth wrappers, RLS invariant checks, input validation utilities
- `platform/` — PWA manifest wiring, service worker config, feature flags (`FLAGS` object)

## Why "Skeleton"?

The skeleton gives the app its shape. AI agents fill in the flesh (features) but don't redesign the bones without architectural review. This prevents agents from accidentally breaking auth, bypassing RLS, or introducing inconsistent design tokens.

## Current Status

Directories created in Sprint 0. Code will be migrated here from `src/mindflow.jsx` during Sprint 1, starting with `design-system/tokens.ts` (the `C` object) and `platform/flags.ts`.
