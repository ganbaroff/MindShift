# MindFlow — Coding Standards

> These rules apply to ALL code written by AI agents. No exceptions.

---

## 1. File Placement

| What | Where |
|---|---|
| New feature code | `src/features/<feature>/` only |
| Shared utilities (no React) | `src/shared/lib/` |
| Supabase queries | `src/shared/services/supabase.ts` |
| AI calls | `src/shared/services/claude.ts` |
| Reusable React components | `src/shared/ui/` |
| Custom hooks | `src/shared/hooks/` |
| Design tokens, colours | `src/skeleton/design-system/` |
| Auth, security logic | `src/skeleton/security/` |

**Never add new code to `src/mindflow.jsx`.** Only remove from it (migrate to the structure above).

---

## 2. React Patterns

```jsx
// Named exports only (no default exports in feature files)
export function DumpScreen({ thoughts, onProcess, lang }) { … }

// Memoize expensive list renders
const MemoThoughtCard = memo(function ThoughtCard({ thought }) { … });

// useCallback for handlers passed to children
const handleArchive = useCallback((id) => { … }, [deps]);

// useMemo for derived/filtered data
const todayTasks = useMemo(() => thoughts.filter(t => t.isToday), [thoughts]);
```

---

## 3. Design Tokens

Always use the `C` object for colours. Never use raw hex values in new code.

```jsx
// ✅ correct
style={{ background: C.surface, color: C.text }}

// ❌ wrong
style={{ background: '#1a1a1a', color: '#f0f0f0' }}
```

Import `C` from `src/skeleton/design-system/tokens.ts` once extracted (currently defined at top of `mindflow.jsx`).

---

## 4. Translations

All user-visible strings must go through the `T` object (or `tx` variable in components).

```jsx
// ✅ correct
const tx = T[lang] || T.en;
return <div>{tx.dumpPlaceholder}</div>;

// ❌ wrong — hardcoded string
return <div>What's on your mind?</div>;
```

Languages: `en`, `ru`, `az`. All three must have entries for any new string.

---

## 5. Supabase

- Always check for error in Supabase responses. Never silently ignore.
- Always scope queries by `user_id` (RLS enforces this, but be explicit).
- Use `upsert` with `onConflict: 'uid'` for thoughts (idempotent sync).

```ts
const { data, error } = await supabase
  .from('thoughts')
  .select('uid, type, priority, tags, is_today, created_at')
  .eq('user_id', userId)
  .eq('is_archived', false)
  .order('created_at', { ascending: false })
  .limit(100);

if (error) throw error;
```

---

## 6. AI Calls

- All AI calls go through `callClaude()` in `src/shared/services/claude.ts`.
- Prompts must specify the output language explicitly (`Respond in ${langName}`).
- Always wrap `JSON.parse()` in try/catch — AI can return malformed JSON.
- 10-second timeout via `AbortController` is mandatory.

---

## 7. Error States

Every async operation must have: loading state, error state, and success state. No silent failures.

```jsx
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

try {
  setLoading(true);
  const result = await someAsyncOp();
  // handle success
} catch (e) {
  setError(e.message);
} finally {
  setLoading(false);
}
```

---

## 8. Mobile / Touch

- Touch targets ≥ 44×44px (WCAG)
- Safe area padding: `env(safe-area-inset-bottom)` on bottom elements
- Font size ≥ 14px (16px preferred for body)
- No `user-scalable=no` workarounds — already set in index.html

---

## 9. Feature Flags

Incomplete features must be behind a flag. Define in `src/skeleton/platform/flags.ts`:

```ts
export const FLAGS = {
  rpg: false,         // Sprint 5
  geminiParse: false, // Sprint 3
} as const;
```

Never ship half-built UI without a flag.

---

## 10. Commits

Each bolt = 1–3 commits maximum. Message format:

```
feat(dump): extract DumpScreen to src/features/dump/

- Moved DumpScreen component and parseDump logic
- Wired up via new shared/services/claude.ts
- Bolt: 2026-03-XX-XXX
```
