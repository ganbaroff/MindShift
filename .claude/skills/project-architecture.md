# Skill: project-architecture

> Read this file whenever you create a new file, move existing code, add a directory, or
> make any structural change to the repository. Rules here are **hard constraints** —
> violations require an ADR to override.

---

## Directory Map

```
src/
├── mindflow.jsx              ← App shell ONLY (App function + providers). < 600 lines always.
├── main.jsx                  ← ReactDOM.createRoot entry — do not touch.
│
├── skeleton/                 ← Human-owned chrome (ADR + dedicated bolt to change)
│   ├── ErrorBoundary.jsx
│   ├── BottomNav.jsx
│   └── design-system/
│       ├── tokens.js         ← Single source of truth for C, P_COLOR
│       └── global.css.js     ← Keyframes + CSS resets injected via <style>
│
├── shared/                   ← Zero-feature utilities (no business logic)
│   ├── lib/                  ← Pure functions, no React, no side-effects
│   │   ├── persona.js
│   │   ├── freemium.js
│   │   ├── thought-types.js
│   │   ├── export.js
│   │   ├── greeting.js
│   │   ├── notifications.js
│   │   ├── notif-schedule.js
│   │   ├── date.js
│   │   ├── id.js
│   │   └── streak.js
│   ├── services/             ← Stateful singletons (Supabase, Claude API)
│   │   ├── supabase.js
│   │   └── claude.js
│   ├── i18n/
│   │   └── translations.js   ← T (all strings), LANGS (language list)
│   └── ui/                   ← Generic, reusable React atoms (no feature imports)
│       ├── icons.jsx
│       ├── primitives.jsx    ← Spinner, Card, Toggle, Sheet, …
│       └── ProBanner.jsx     ← Freemium gate + PricingScreen
│
├── features/                 ← One directory per vertical slice
│   ├── onboarding/
│   │   └── index.jsx         ← LangPickScreen, WelcomeScreen
│   ├── auth/
│   │   └── index.jsx         ← AuthScreen
│   ├── dump/                 ← Brain Dump screen (DumpScreen)
│   │   └── index.jsx
│   ├── today/                ← Today screen (TodayScreen)
│   │   └── index.jsx
│   ├── evening/              ← Evening review (EveningScreen)
│   │   └── index.jsx
│   └── settings/             ← Settings + sub-panels
│       ├── index.jsx
│       ├── ExportPanel.jsx
│       ├── NotifPanel.jsx
│       └── NotionPanel.jsx
│
docs/
└── adr/                      ← Architecture Decision Records (ADR-NNNN-*.md)

.claude/
├── skills/                   ← This directory — skill files loaded by Claude Code
└── worktrees/                ← Git worktrees (auto-managed, never edit manually)
```

---

## Strict Boundary Rules

### 1. Vertical Slices — Features NEVER import from each other

```
✅  features/dump/index.jsx  →  shared/services/supabase.js
✅  features/dump/index.jsx  →  shared/lib/thought-types.js
✅  features/dump/index.jsx  →  shared/ui/primitives.jsx
✅  features/dump/index.jsx  →  skeleton/design-system/tokens.js

❌  features/dump/index.jsx  →  features/today/index.jsx
❌  features/dump/index.jsx  →  features/settings/index.jsx
```

If two features need to share state, put it in `shared/` or lift into `mindflow.jsx` as a
prop/callback.

### 2. Skeleton — Requires ADR + Dedicated Bolt

The `skeleton/` directory is the human-owned chrome. Changes there are high-risk (every
screen uses BottomNav, tokens, global CSS). Before modifying any skeleton file:

1. Write an ADR in `docs/adr/`
2. Open a dedicated bolt (not bundled with feature work)
3. `npm run build` must pass before committing

### 3. `shared/lib/` — Pure Functions Only

Files under `shared/lib/` must:
- Export only pure functions or plain constants
- Import zero React (`useState`, JSX, etc.)
- Produce zero side-effects (no `localStorage`, no `fetch`, no timers)
- Be testable with plain `node` (no jsdom needed)

### 4. `shared/services/` — Singletons, Lazy-Init

- `supabase.js` owns the Supabase client — all features call `getSupabase()` / `waitForSupabase()`
- `claude.js` owns the Claude API client — all AI calls go through it
- Features never call `fetch('/api')` or `new SupabaseClient()` directly

### 5. `mindflow.jsx` — Shell Only

`mindflow.jsx` must stay under **600 lines**. It may contain:
- State for `screen`, `lang`, `user`, `thoughts`, `persona`
- The `App()` render function with screen switching
- Top-level `useEffect` hooks for auth and data loading

If you need to add logic to `mindflow.jsx` that would push it over 600 lines, extract it
into a feature or shared module first.

---

## File Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| React component file | PascalCase + `.jsx` | `DumpScreen.jsx`, `ProBanner.jsx` |
| Pure utility | camelCase + `.js` | `persona.js`, `freemium.js` |
| i18n / constants | camelCase + `.js` | `translations.js`, `tokens.js` |
| Feature index | `index.jsx` always | `features/dump/index.jsx` |
| Skill file | kebab-case + `.md` | `project-architecture.md` |
| ADR | `ADR-NNNN-slug.md` | `ADR-0007-bolt-2-1-persona.md` |

---

## How to Add a New Feature (Checklist)

- [ ] Create `src/features/<name>/index.jsx`
- [ ] Export the screen component as a named export
- [ ] Add `import` in `mindflow.jsx` (top of file)
- [ ] Add the screen to the `switch (screen)` block in `App()`
- [ ] Add route to `BottomNav` items (if tab-navigable) via an ADR
- [ ] Add i18n strings to `shared/i18n/translations.js` (EN/RU/AZ)
- [ ] Add freemium gate via `<ProBanner>` if Pro-only
- [ ] `npm run build` passes
- [ ] Log the bolt in the commit message with `Bolt X.Y: …`

---

## Bolt Workflow

Every non-trivial change is a **bolt** — a named, scoped unit of work.

```
Bolt N.M: <verb> <what>          ← commit subject line
```

Execution order within a bolt:

1. Read relevant skill files
2. Write / edit source files
3. `npm run build` — fix any errors before proceeding
4. Verify in browser / `npm run dev` if UI changed
5. Commit with bolt identifier in the message

Never bundle skeleton changes with feature changes in the same bolt.
