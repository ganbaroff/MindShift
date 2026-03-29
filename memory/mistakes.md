# Mistakes — Lessons Learned

**Purpose:** Prevent repeating the same mistakes. Add anything that caused a bug, rework, or wasted time.
**Format:** What went wrong → Root cause → How to avoid

---

## Architecture

### cognitiveMode was set from UI and wired to real logic
What: cognitiveMode drove UI decisions for several sprints. Sprint B found it redundant with appMode.
Root cause: Two concepts (app mode + cognitive mode) that overlapped without clear distinction.
Fix (Sprint B): Removed from UI, kept in store for localStorage backward compat. `appMode` is the real driver.
→ Never read or set cognitiveMode again. It's a dead field kept only so existing localStorage doesn't crash.

### FocusScreen grew to 1180 lines before decomposition
What: FocusScreen accumulated timer FSM, setup UI, post-session flow, and phase detection in one file.
Root cause: "Just one more thing" additions without tracking file size.
Fix (Sprint 8 + Sprint BC): Decomposed into FocusScreen (orchestrator) + FocusSetup + useFocusSession + SessionControls + PostSessionFlow.
→ 400-line guardrail is enforced in `.claude/rules/guardrails.md`. tsc -b catches some violations.

### localStorage hit 5MB limit with full session history
What: Zustand persist with localStorage caused QuotaExceededError for power users.
Root cause: focus_sessions accumulated in store, localStorage has 5MB hard cap.
Fix (Sprint I): idbStorage adapter — transparent migration to IndexedDB. No user-visible change.
→ Never use raw `localStorage` for state. Always go through `idbStorage`.

---

## State / Store

### New persisted fields added without updating partialize()
What: Fields added to store initial state but not added to `partialize()`. Data lost on every reload.
Root cause: Two places to update when adding persisted state.
→ Checklist: when adding store field → immediately add to `partialize()` in the same commit.

### EnergyLevel ±1 offset confusion
What: Store uses 1-5, EnergyPicker UI uses 0-4. Conversion done in wrong places causing off-by-one.
Root cause: Historical: EnergyPicker was built with 0-indexed before store was finalized.
Fix: Conversion ONLY at EnergyPicker boundary. Business logic always uses store values (1-5).
→ See `.claude/rules/guardrails.md` Rule 5.

---

## Testing

### E2E tests used seedStore() data that didn't match real component output
What: Tests seeded tasks directly to store but component filtered/sorted differently than expected.
Root cause: Seeded data bypassed computed/memoized state derivation.
Fix: Tests use `page.route()` for Supabase + `seedStore()` only for local state. Always check what the component actually renders via `getByRole`.

### Hardcoded English strings in test assertions broke after i18n
What: E2E assertions like `expect(page.getByText('Add task')).toBeVisible()` failed after i18n was added.
Root cause: i18n changed visible text; tests used raw English strings.
Fix: After any i18n change, run `npx playwright test` — look for text-match failures. Update to use `getByRole` where possible (aria-labels don't get translated in tests since tests run in default locale).

---

## AI / Edge Functions

### Mochi AI called without hardcoded fallback showing first
What: Before Sprint AA, Mochi showed nothing until AI responded. ADHD users saw blank bubble for 2-8s.
Root cause: Awaited AI response before rendering.
Fix (Sprint AA): Always render hardcoded fallback immediately. Replace with AI response if it arrives within 8s window.
→ This pattern is required for ALL AI calls. Rule 7 in guardrails.

### Edge function locale not passed → responses always in English
What: AI edge functions responded in English regardless of user's device language.
Root cause: `navigator.language` not forwarded from client to edge function.
Fix (Sprint I): All 3 AI functions now receive locale and Gemini responds natively.
→ Always pass `navigator.language` to any AI edge function call.

---

## PWA / Push

### Push notifications scheduled with setTimeout — lost when tab closed
What: Reminders used `setTimeout` from AddTaskModal. If tab closed before trigger, notification never fired.
Root cause: setTimeout is client-only; no server-side persistence.
Fix (Sprint CE): Supabase pg_cron + scheduled-push edge function. Subscriptions stored in DB.
→ Never use setTimeout for user-facing reminders. Always use server-side scheduling.

### Service worker not updated after build (stale SW cache)
What: After deploying new version, some users still ran old SW code.
Root cause: SW versioning required manual precache manifest hash update.
Fix: vite-plugin-pwa with injectManifest handles this automatically — hash changes trigger SW update.
→ Don't manually manage SW version. Let vite-plugin-pwa handle it.

---

## Copy / UX

### AI-isms in user-facing text ("seamlessly integrates", "comprehensive")
What: Multiple copy audit passes found AI-generated marketing language throughout.
Root cause: AI wrote initial copy, nobody reviewed it with a human lens.
Fix (Sprint Copy Audit): humanizer skill run across all visible text. 25 anti-patterns documented in `.claude/skills/humanizer/SKILL.md`.
→ Run humanizer on any new user-facing string. Never ship AI copy unedited.

### Red used in validation error states
What: Early prototypes had red error messages. Research #8 shows red triggers RSD.
Root cause: Default browser/library styling.
Fix: All error states use amber/gold. "Never use red" is Rule 1 in guardrails.
