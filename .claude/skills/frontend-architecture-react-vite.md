# Skill: frontend-architecture-react-vite

> Read this file before writing any React component, adding hooks, touching `vite.config.js`,
> or restructuring imports. Rules here prevent the codebase from regressing back to a
> God-Component.

---

## Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| UI framework | React | 18.x |
| Build tool | Vite | 5.x |
| Language | JavaScript (JSX) | ES2022+ |
| Styling | Inline styles (CSS-in-JS pattern) | — |
| Backend | Supabase | JS SDK v2 |
| AI | Claude API (Anthropic) | — |
| Deploy | Vercel | — |

**TypeScript migration path:** New files may be written as `.tsx` / `.ts` if the author
also converts all imports that file touches. Do not mix `.js` + `.ts` in the same feature
directory. Full TS migration is planned as a dedicated bolt.

---

## The God-Component Rule

`src/mindflow.jsx` was historically a 2 914-line monolith. After Bolt 1.7, it is an
**App shell** (<600 lines). The rule:

> **Any logic that is not screen-routing, top-level state, or provider setup must live
> outside `mindflow.jsx`.**

If a PR makes `mindflow.jsx` grow past 600 lines, the reviewer must reject it and ask
for extraction into a feature or shared module.

---

## Component Authoring Rules

### Prefer Named Exports

```jsx
// ✅ correct
export function DumpScreen({ thoughts, onAdd }) { … }

// ❌ avoid (makes tree-shaking and code search harder)
export default function DumpScreen() { … }
```

### Memoisation

Only memoise when profiling shows a problem or when the component renders a large list.
Premature memo wrapping adds noise without benefit.

```jsx
// ✅ large list item — memo pays off
const ThoughtCard = memo(function ThoughtCard({ thought, onArchive }) { … });

// ✅ stable callback passed as a prop to a memoised child
const handleArchive = useCallback((id) => archiveThought(id), [archiveThought]);

// ✅ expensive derived data
const todayTasks = useMemo(() =>
  thoughts.filter(t => t.type === "task" && isToday(t.createdAt)),
  [thoughts]
);
```

### Hook Rules

- Keep custom hooks in the feature directory (`features/<name>/use<Name>.js`) unless
  needed by ≥ 2 features — then promote to `shared/lib/`.
- Each hook has a single responsibility; compose simple hooks into complex ones.
- Never call hooks conditionally or inside loops.

---

## State Management

| Scope | Mechanism |
|-------|-----------|
| Local UI state | `useState` in the component |
| Derived / filtered data | `useMemo` |
| Cross-screen app state | Props + callbacks via `mindflow.jsx` |
| Server state | Fetched in `useEffect`, stored in `useState` |
| Real-time updates | Supabase Realtime subscription in `useEffect` |
| Global singleton (auth, db) | Module-level variables in `shared/services/` |

**Avoid Redux / Zustand / Context for now.** The app's state surface is small enough for
prop drilling + `useCallback`. Re-evaluate at > 5 active features.

---

## Styling Pattern

All components use **inline styles** with the `C` token object:

```jsx
import { C } from "../../skeleton/design-system/tokens.js";

<div style={{
  background: C.surface,
  border: `1px solid ${C.border}`,
  borderRadius: 16,
  padding: "12px 16px",
}}>
```

Rules:
- **Never** hardcode color hex values in component files — always use `C.<token>`
- **Never** use CSS class names (no `className="card"`) unless migrating to Tailwind
- Use the spacing scale: `4 · 8 · 12 · 16 · 20 · 24 · 32 · 48` px
- Use the radius scale: `8 · 12 · 16 · 24 · 9999` px
- Keyframe animations live in `skeleton/design-system/global.css.js` — reference by name

---

## Vite Configuration

```js
// vite.config.js — never add plugins without checking bundle impact
export default {
  plugins: [react()],
  // keep the build lean — no unnecessary polyfills
};
```

- `.jsx` extension is **required** for files containing JSX (Vite's React plugin uses
  extension sniffing)
- `.js` files must not contain JSX syntax
- All environment variables must be prefixed `VITE_` to be accessible client-side
- Never commit `.env` — use `.env.example` for documentation

---

## Lazy Loading

Heavy screens should be lazy-loaded to keep the initial bundle small:

```jsx
const EveningScreen = lazy(() => import("./features/evening/index.jsx"));

// In App():
<Suspense fallback={<FullScreenLoader />}>
  {screen === "evening" && <EveningScreen … />}
</Suspense>
```

Priority for lazy-loading: `EveningScreen` → `PricingScreen` → settings panels.

---

## Error Boundaries

Wrap every screen in `ErrorBoundary`:

```jsx
import { ErrorBoundary } from "./skeleton/ErrorBoundary.jsx";

<ErrorBoundary>
  <DumpScreen … />
</ErrorBoundary>
```

`ErrorBoundary` catches render errors, logs via `logError`, and shows a fallback UI.
Never swallow errors silently.

---

## Mobile / PWA Checklist

Before shipping any UI change:

- [ ] Touch targets ≥ 44×44 px
- [ ] Bottom content not obscured by the BottomNav (add `paddingBottom: 80`)
- [ ] Safe area respected: `paddingBottom: "env(safe-area-inset-bottom, 0px)"`
- [ ] No horizontal scroll on 375 px viewport
- [ ] `prefers-reduced-motion` respected (global CSS already handles keyframes)
- [ ] Color contrast ≥ 4.5:1 (use `C` tokens — they were chosen to pass WCAG AA)
- [ ] All interactive elements have `aria-label` or visible text label
- [ ] Loading state shown for every async operation (use `Spinner` from `primitives.jsx`)

---

## Import Order Convention

```jsx
// 1. React core
import { useState, useEffect, useCallback, useMemo, memo } from "react";

// 2. Skeleton (tokens, global)
import { C } from "../../skeleton/design-system/tokens.js";

// 3. Shared services
import { getSupabase } from "../../shared/services/supabase.js";
import { callClaude }  from "../../shared/services/claude.js";

// 4. Shared lib (pure)
import { logError }    from "../../shared/lib/logError.js";
import { isToday }     from "../../shared/lib/date.js";

// 5. Shared i18n + UI
import { T }           from "../../shared/i18n/translations.js";
import { Spinner, Card } from "../../shared/ui/primitives.jsx";
import { Icon }        from "../../shared/ui/icons.jsx";

// 6. Feature-local modules (same directory)
import { useThoughts } from "./useThoughts.js";
```
