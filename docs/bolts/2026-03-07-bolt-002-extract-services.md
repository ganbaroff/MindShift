# Bolt 2026-03-07-002 — Extract Core Services

- **Date:** 2026-03-07
- **Owner:** Claude Code (Cowork) via Yusif
- **Feature:** shared/services — foundational, unblocks all feature bolts
- **Sprint:** 2026-Q1-Sprint-01
- **Goal:** `parseDump`, `generateEveningReview`, `aiFocusSuggest`, and all Supabase DB operations are isolated in `src/shared/services/`, importable independently, and no longer embedded in the monolith.

---

## Plan (pre-work, as agreed)

1. ✅ Write ADR 0006 (persona as character) — pre-bolt architecture decision
2. ✅ Read mindflow.jsx AI + Supabase sections to capture exact function signatures
3. ✅ Create `src/shared/services/claude.js` — two-layer architecture (HTTP client + semantic)
4. ✅ Create `src/shared/services/supabase.js` — client factory + retry queue + all sb* functions
5. ✅ Create golden master fixture `__tests__/parseDump.golden.json`
6. ✅ Update `mindflow.jsx` — remove moved functions, add named imports
7. ✅ Verify: no duplicate function definitions remain in mindflow.jsx

---

## Changes

**Files created:**
- `src/shared/services/claude.js` — Layer 1 (HTTP client: callClaude) + Layer 2 (semantic: parseDump, generateEveningReview, aiFocusSuggest) + prompt helper (buildPersonaContext)
- `src/shared/services/supabase.js` — client factory (getSupabase, waitForSupabase), retry queue (setupRetryListeners + internals), thought ops (sbPushThought, sbPullThoughts), persona ops (sbSavePersona, sbLoadPersona)
- `src/shared/services/__tests__/parseDump.golden.json` — schema-level golden master fixture for parseDump output structure
- `docs/adr/0006-persona-as-character.md` — pre-bolt ADR formalising persona as AI character (not analytics)

**Files modified:**
- `src/mindflow.jsx` — lines 1–17: replaced `import { createClient }` with named imports from shared/services; removed ~220 lines of function definitions (replaced with single-line comments); function call sites unchanged
- `DECISIONS.md` — added ADR 0006 row

**Files unchanged (intentionally):**
- All UI components (DumpScreen, TodayScreen, EveningScreen, SettingsScreen, etc.)
- All business logic in mindflow.jsx except the moved functions
- `updatePersona()` — stays in mindflow.jsx (UI state logic, not a service)
- `exportToMarkdown()` — stays in mindflow.jsx (uses TYPE_CFG local constant)

---

## Decisions made during bolt

- **`buildPersonaContext` → claude.js, not shared/lib/** — It's a prompt-construction helper. Lives next to the functions that use it. Any pure data utility would go to shared/lib.
- **`updatePersona` stays in mindflow.jsx** — Takes thoughts array and updates UI state. Belongs to the dump feature's logic, not a service. Will move to `features/dump/` in Sprint 1 feature extraction.
- **`exportToMarkdown` stays** — Depends on `TYPE_CFG` constant defined in mindflow.jsx. Will move to `features/settings/` when that slice is extracted.
- **Auth operations stay in mindflow.jsx** — `signInWithOtp`, `onAuthStateChange`, `signOut` belong to the `auth/` slice (Sprint 2). For now they call `getSupabase()` imported from supabase.js.
- **`waitForSupabase` kept as export** — Used by AuthScreen (`const sb = await waitForSupabase()`). Legacy compatibility, marked for cleanup in Sprint 2.

---

## TODO (marked in code, NOT fixed in this bolt — scope discipline)

- `buildPersonaContext` references `p.avgPriority` which is never set by `updatePersona()` — potential silent no-op. Marked with `// TODO` comment in claude.js.
- `memory[]` in persona.data (ADR 0006) has no pruning strategy yet — grows unboundedly. Track for Sprint 3.
- `waitForSupabase` is a legacy wrapper — remove when AuthScreen is moved to auth/ slice in Sprint 2.

---

## Acceptance Criteria — Verification

### AC1: AI parse after extraction
**Test:** `parseDump()` is now imported from `shared/services/claude.js` and called at mindflow.jsx:1508.
**Evidence:** `grep -n "parseDump" mindflow.jsx` → only import and usage, no definition.
**Status:** ✅ Verified structurally. Runtime verification: load app + submit brain dump.

### AC2: Supabase sync after extraction
**Test:** `sbPullThoughts()` and `sbPushThought()` imported from `shared/services/supabase.js`, retry queue logic intact inside supabase.js.
**Evidence:** `grep` confirms no duplicate definitions in mindflow.jsx. `setupRetryListeners` called at line 2639.
**Status:** ✅ Verified structurally. Runtime: requires Supabase env vars set.

### AC3: No regression on existing screens
**Test:** All call sites unchanged — `parseDump`, `generateEveningReview`, `aiFocusSuggest`, `sbPushThought`, `sbPullThoughts` are called identically.
**Evidence:** Line count dropped from 3176 → 2975 (201 lines removed = moved functions). Call sites preserved.
**Status:** ✅ Verified structurally. **Manual runtime test required** (see below).

### REQUIRED: Manual runtime check (cannot be automated without Vitest)
1. Start dev server: `npm run dev`
2. Open Dump screen → submit a brain dump → verify AI cards appear
3. Open Today screen → verify AI focus suggest runs
4. Open Evening screen → verify AI review generates
5. Enable sync (Settings) → verify thoughts save/load from Supabase
6. Go offline → create a thought → go online → verify retry queue drains

---

## Technical Debt logged

| Debt | Severity | Sprint |
|---|---|---|
| `avgPriority` not set by updatePersona — prompt context gap | Low | Sprint 2 |
| `memory[]` no pruning strategy | Medium | Sprint 3 |
| AI key exposed client-side | High | Sprint 3 |
| `waitForSupabase` is legacy wrapper | Low | Sprint 2 |
| Golden master test not automated | Medium | Sprint 5 (Vitest) |

---

## Summary for Next Agent

`src/shared/services/claude.js` and `src/shared/services/supabase.js` now exist as standalone, importable modules. `src/mindflow.jsx` (2975 lines) imports from them and no longer defines these functions. The next bolt should extract the first full vertical slice — either `src/features/dump/` (largest, highest value) or `src/shared/lib/` (utility functions, lowest risk). Recommended: start with `shared/lib/` (uid, isToday, streak, formatters) as a warm-up — pure functions, zero React dependency, easiest to test.

**Files the next agent must read first:**
1. `.ai/PROJECT_CONTEXT.md`
2. `src/features/dump/spec.md`
3. `.ai/coding-standards.md`
4. This file (`docs/bolts/2026-03-07-bolt-002-extract-services.md`)
