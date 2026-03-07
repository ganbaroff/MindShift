# Bolt 2026-03-07-003 — Centralised Error Logging (INVARIANT 7)

- **Date:** 2026-03-07
- **Owner:** Claude Code (claude/romantic-archimedes)
- **Feature:** shared
- **Sprint:** 2026-Q1-Sprint-1
- **Goal:** Every caught error flows through a single `logError()` function so that a future observability hook (Sentry, PostHog, etc.) can be wired in one place — zero silent failures for any non-trivial async operation.

---

## Plan

1. Create `src/shared/lib/logger.js` — exports `logError(context, error, meta?)`
2. Add import to `mindflow.jsx`
3. Replace all `console.error(...)` calls in `mindflow.jsx` with `logError(context, e)`
4. Add `logError` to meaningful silent `catch {}` blocks (AI calls, data writes)
5. Build — verify zero errors

---

## Changes

**Files created:**
- `src/shared/lib/logger.js` — structured `logError(context, error, meta?)` with a commented future hook slot

**Files modified:**
- `src/mindflow.jsx`
  - Added `import { logError } from "./shared/lib/logger.js"` (Bolt 1.4 import line)
  - `PricingModal.waitlistUpsert` — `catch {}` → `catch (e) { logError(...) }`
  - `ErrorBoundary.componentDidCatch` — replaced `console.error("[MindFlow ErrorBoundary]", ...)` with `logError("ErrorBoundary", error, { componentStack })`
  - `DumpScreen.handleSubmit` — replaced `console.error(e)` with `logError("DumpScreen.handleSubmit", e)`
  - `TodayScreen.getSuggestions` — added `logError(...)` before the silent `setAiSuggestion(null)` fallback
  - `EveningScreen.generate` — added `logError(...)` before the fallback string
  - `EveningScreen.save` — replaced `console.error("review save:", e)` with `logError("EveningScreen.save", e)`
  - `App.persistPersona` — `catch {}` → `catch (e) { logError(...) }` (persona localStorage write)
  - `App.persistThoughtsLocal` — `catch {}` → `catch (e) { logError(...) }` (thoughts localStorage write)

**Silent catches intentionally left as-is:**
- `localStorage.getItem` fallback returns — noisy, value is replaced by safe default
- `localStorage.setItem("mf_lang/mf_step")` — trivial UI preferences, not data
- Clipboard API fallbacks (ExportPanel, NotionPanel) — `execCommand` fallback is intentional UX, not an error
- Settings screen `clearAll` localStorage.removeItem — transient cleanup

---

## Decisions

- `logError` signature: `(context: string, error: unknown, meta?: object)` — context is a dot-path string ("Screen.handlerName") for easy log filtering
- No external SDK dependency — just `console.error` + a commented future hook slot. Adding Sentry later = one line change in `logger.js`.
- localStorage read-fallback catches kept silent (return safe default values by design)
- Clipboard API uses graceful degradation — the `execCommand` path is intentional, not an error

---

## Testing

- [x] Build: `npm run build` — ✅ 0 errors (verified after changes)
- [x] `grep -n "console.error" src/mindflow.jsx` → 0 results
- [x] Manual: All 8 updated catch sites confirmed by grep/read

**Status:** ✅ Passed

---

## Risks / Tech Debt

- `logError` currently only calls `console.error` — no real telemetry yet. Acceptable for Sprint 1; Sprint 3 adds Sentry or PostHog.
- `avgPriority` referenced in `buildPersonaContext` (`claude.js`) but never set by `updatePersona` — pre-existing bug, out of scope here. Track separately.

---

## Summary for Next Agent

`src/shared/lib/logger.js` is live. Every non-trivial async error in `mindflow.jsx` now calls `logError(context, error)` instead of `console.error` or silent swallow. To add a real observability backend (Sentry / PostHog), wire it inside `logger.js` — zero other files need to change.

**Continue with:** Bolt 1.3 — extract `DumpScreen` to `src/features/dump/`.
