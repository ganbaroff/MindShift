# ADR 0002 — State Management with Zustand

**Date:** 2026-03-11
**Status:** Accepted
**Author:** Claude (Sprint 6 audit)

---

## Context

MindShift is a React PWA with several independent state domains:

| Domain | Data shape | Update pattern |
|---|---|---|
| Tasks | `Task[]` | CRUD + optimistic updates |
| XP / gamification | `xp`, `level`, `streak` | Event-driven increments |
| Focus session | `phase`, `timer`, `screenState` | Tick-based, ephemeral |
| User preferences | `reducedStimulation`, `timerStyle`, `seenHints` | Infrequent, persisted |
| Auth | `user`, `session` | Supabase callback |

The codebase began with React `useState` / prop drilling for smaller screens and grew into a multi-screen PWA. As features were added (offline sync, XP, recovery protocol, context restore), sharing state across distant component trees became unwieldy.

### Options evaluated

1. **React Context + useReducer** — familiar pattern, no extra dependency
2. **Redux Toolkit** — battle-tested, rich DevTools, significant boilerplate
3. **Zustand** — minimal API, zero boilerplate, selectors via hooks, first-class TypeScript
4. **Jotai** — atomic model, excellent for derived state, unfamiliar to most contributors
5. **TanStack Query** — ideal for server state, not for UI / ephemeral session state

---

## Decision

Use **Zustand v5** for all client-side global state, organised into **slice files** that are composed into a single store:

```
src/store/
  index.ts              ← createStore() composition
  slices/
    tasksSlice.ts
    xpSlice.ts
    preferencesSlice.ts
    authSlice.ts
    focusSlice.ts        (session-lifetime state only)
```

Server state (Supabase reads/writes) lives outside Zustand in component-level `useEffect` + optimistic mutation helpers. TanStack Query may be adopted for read-heavy screens in a future sprint.

### Why Zustand over alternatives

| Criterion | Context + Reducer | Redux Toolkit | **Zustand** | Jotai |
|---|---|---|---|---|
| Bundle size | 0 KB | ~14 KB | ~3 KB | ~8 KB |
| TypeScript DX | Manual inference | Generated types | Excellent | Excellent |
| Selector memoisation | Manual | `createSelector` | `useStore(s => s.field)` | Derived atoms |
| Async actions | `useReducer` middleware | `createAsyncThunk` | Plain `async` in store | Async atoms |
| DevTools | None | Redux DevTools | Zustand devtools() | Jotai DevTools |
| Learning curve | Low | Medium | **Lowest** | Low |

Zustand's subscribe API also powers the offline queue (`useOfflineSync`) without coupling the queue to React's render cycle.

---

## Consequences

### Positive
- **No Provider wrapping**: store is imported directly; no `<Provider>` in `main.tsx`
- **Selector-level re-renders**: components subscribe only to the slices they read, avoiding over-rendering
- **Persist middleware**: `preferencesSlice` is persisted to `localStorage` via `persist()` — zero boilerplate
- **Testable**: slices are plain objects with functions; testing does not require React rendering

### Negative / Trade-offs
- **No time-travel debugging**: unlike Redux DevTools, Zustand's devtools are read-only snapshots
- **Slice coupling risk**: composing all slices into one store creates an implicit dependency surface; enforce slice independence via import rules
- **No built-in server state**: Supabase queries are not integrated; a future TanStack Query layer could handle caching and background refetch

---

## Alternatives Considered

| Alternative | Why rejected |
|---|---|
| Redux Toolkit | 14 KB overhead; boilerplate disproportionate to app scale |
| React Context | Context re-renders entire subtree; focus timer (250 ms ticks) would cause unacceptable re-renders |
| Jotai | Atomic model harder to onboard; fewer contributors familiar with it |
| TanStack Query | Excellent for server state but doesn't solve ephemeral UI / session state |

---

## Related Files

- `src/store/index.ts`
- `src/store/slices/tasksSlice.ts`
- `src/store/slices/preferencesSlice.ts`
- `src/store/slices/xpSlice.ts`
- `src/shared/hooks/useOfflineSync.ts`
