# Skill: testing-and-self-review

> Read this file at the end of every bolt before committing. Run through the checklist
> mentally or literally. A bolt is not done until all applicable checks pass.

---

## Bolt Completion Checklist

### Build & Runtime

- [ ] `npm run build` exits with code 0, zero errors (warnings acceptable if pre-existing)
- [ ] `npm run dev` starts — app loads in browser on `localhost:5173`
- [ ] The changed screen renders without a white screen / ErrorBoundary fallback
- [ ] No `console.error` in the browser DevTools for the changed paths

### Code Quality

- [ ] `src/mindflow.jsx` is ≤ 600 lines
- [ ] No raw hex color strings in component files (`grep -r "#[0-9a-f]\{6\}" src/ --include="*.jsx"`)
- [ ] No `TODO` comments left by the bolt (only pre-existing ones allowed)
- [ ] INVARIANT 7: every async operation that can fail calls `logError(context, error)`
- [ ] No direct Supabase client creation in feature files
- [ ] No direct fetch to AI API in feature files
- [ ] New features do not import from other features

### UI / UX

- [ ] Touch targets ≥ 44×44 px on all new interactive elements
- [ ] Loading state visible for all async operations (Spinner or skeleton)
- [ ] Error state visible when an operation fails (not just silently nothing)
- [ ] Mobile viewport (375px) tested — no horizontal overflow
- [ ] All new strings present in EN/RU/AZ in `translations.js`
- [ ] Freemium gate applied if the new feature consumes AI credits or Pro-only data

### Data / Security

- [ ] Any new Supabase table has RLS policies (see `supabase-data-layer.md`)
- [ ] No sensitive data logged to `console.log` (email, tokens, full thought text)
- [ ] `logError` context strings follow `"ComponentName.operationName"` format

---

## Test Priorities

There is no automated test suite yet. Manual testing should focus on these areas in order
of risk:

### 1. AI Functions (highest risk — user-visible, costs money)

- Brain dump parsing: empty input, single word, 50-item list, emoji-only, non-Latin text
- Response parsing: valid JSON, JSON inside markdown fences, malformed JSON, empty string
- Freemium gate: verify `getDumpCount()` increments only on success
- Rate limit UI: verify `<ProBanner>` appears at limit, not before

### 2. Supabase Operations

- Insert thought: verify it appears in the list without full page reload
- Archive thought: verify it disappears from active list, `archived_at` is set
- Save persona: verify `updated_at` updates, `patterns` JSONB is correct shape
- Auth: sign-in flow, sign-out (clears local state), refresh on reload

### 3. Persona Logic

- `updatePersona` with zero thoughts: no crashes, `completionRate = 0`
- `updatePersona` with mixed types: only `task` items affect `priorityCounts`
- `calcAvgPriority` with all-none priorities: returns `"none"`
- `calcMoodTrend` with 1 rate: returns fallback
- `buildPersonaContext` with null persona: returns empty string

### 4. Navigation & Screen Transitions

- All 4 BottomNav tabs navigate correctly
- BottomNav badge updates when tasks are added
- Back navigation from sheets/modals doesn't leave orphaned state

---

## Self-Review Protocol

Before opening a PR or calling a bolt done, ask yourself:

1. **What is the worst-case failure mode?**
   If the new code throws at runtime, what does the user see? (Should be ErrorBoundary
   fallback, not a blank white screen.)

2. **What happens with empty data?**
   New list → empty state shown? New count → zero handled? New date → null handled?

3. **What happens on a slow or failing network?**
   API call fails → `logError` called, user sees an error message, no spinner stuck forever.

4. **Did I introduce a new dependency on another feature?**
   Check: does any `features/X/` import from `features/Y/`? If yes, extract to `shared/`.

5. **Is the persona context richer or noisier after this change?**
   AI prompt changes are ADR-gated. If you changed `buildPersonaContext`, write an ADR.

---

## Running a Smoke Test

After `npm run dev`:

1. Open `http://localhost:5173`
2. Navigate through all 4 tabs (Dump, Today, Evening, Settings)
3. Add a thought via brain dump
4. Archive a thought on the Today screen
5. Open Settings → check language toggle, streak, notifications toggle
6. Sign out (if logged in) → confirm state clears
7. Sign back in via magic link (or continue without account)

If all 7 steps complete without console errors, the bolt is shippable.

---

## When Tests Fail

If `npm run build` fails:

1. Read the full error — don't truncate
2. Fix the import/syntax error before proceeding
3. Never commit a broken build

If the app throws at runtime:

1. Open DevTools → Console
2. Find the stack trace
3. If it's a feature file: fix the feature
4. If it's a skeleton file: create an ADR before changing it
5. Re-run the smoke test after fixing
