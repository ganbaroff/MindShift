# Common Tasks — AI Agent Playbook

> Step-by-step recipes for the most frequent tasks in MindFlow development.
> Reference this before writing code for any of the scenarios below.

---

## Task 1: Extract a Screen from the Monolith

**When:** Moving DumpScreen / TodayScreen / EveningScreen / SettingsScreen from `mindflow.jsx` to `src/features/<name>/`.

**Steps:**

1. Read `src/mindflow.jsx` and identify all code belonging to the screen:
   - The `function XxxScreen(...)` component
   - Any helper functions only used by this screen
   - Relevant section of the `T` translation object
2. Create `src/features/<name>/` with:
   - `index.jsx` (or `.tsx`) — the screen component
   - `<name>.api.js` — Supabase queries and AI calls specific to this feature
   - `spec.md` — copy the spec template, fill in what this feature does
   - `README.md` — one paragraph describing the feature
3. Update imports in `src/mindflow.jsx` (or `App.tsx` once extracted) to point to the new location.
4. Verify the screen renders identically before and after.
5. Do NOT remove the original code from `mindflow.jsx` until tests pass.
6. Write bolt log in `docs/bolts/`.

---

## Task 2: Add a New Translation String

**When:** Adding any user-visible text.

**Steps:**

1. Open `src/mindflow.jsx` (or `src/shared/i18n/translations.ts` once extracted).
2. Find the `T` object.
3. Add your key to ALL three languages: `en`, `ru`, `az`.
4. Use the key in your component via `const tx = T[lang] || T.en`.

---

## Task 3: Add a New Supabase Query

**When:** Reading or writing data.

**Steps:**

1. Add the function to `src/shared/services/supabase.ts` (create if not yet extracted).
2. Always include `user_id` scope.
3. Always handle `error`.
4. Use TypeScript types from `src/shared/types.ts` for return values.

---

## Task 4: Add an AI Feature

**When:** New AI call (new prompt, new use case).

**Steps:**

1. Add the function to `src/shared/services/claude.ts`.
2. The function signature: `async function myAiFeature(input, lang, persona): Promise<MyResult>`.
3. Prompt must include: target language, persona context (if relevant), output format spec (JSON schema or plain text).
4. Wrap `JSON.parse` in try/catch.
5. Set `AbortController` with 10s timeout.
6. Update freemium counter if this is a user-initiated AI action.

---

## Task 5: Gate a Feature Behind isPro

**When:** A feature should only be available to Pro subscribers.

**Steps:**

1. Receive `isPro: boolean` as a prop in the component.
2. If the user tries the action while not Pro: call `onShowPricing(reason)` instead of executing.
3. Do NOT hide UI elements — disable or show upgrade prompt inline.
4. Test both `isPro = true` and `isPro = false` paths.

---

## Task 6: Create a New Feature Spec (spec.md)

**When:** Starting any new feature bolt.

**Steps:**

1. Copy `src/features/dump/spec.md` as a template.
2. Fill in: Problem, Scope, Functional Requirements, Acceptance Criteria (Gherkin preferred), NFR.
3. Get spec reviewed (by Yusif or Perplexity research pass) BEFORE writing code.
4. Link the spec in the bolt log.
