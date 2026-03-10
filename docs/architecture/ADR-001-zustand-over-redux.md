# ADR-001: Zustand over Redux for State Management

**Status:** Accepted
**Date:** 2026-03-09
**Deciders:** Yusif (sole owner)
**Context area:** Frontend architecture

---

## Context

MindShift needs a client-side state manager to coordinate:
- 6 feature slices: User, Task, Session, Audio, Progress, Preferences, Grid
- Cross-session persistence (localStorage, `persist` middleware)
- Derived selectors (nowPool, nextPool, achievements)
- Real-time updates from Supabase subscriptions

The state is moderately complex — roughly 40 keys across slices — but read/write patterns are simple (no complex event sourcing or saga-style side effects).

---

## Decision

Use **Zustand v5** as the single state manager with the `persist` middleware for selective localStorage persistence.

---

## Options Considered

### Option A: Redux Toolkit (RTK)
| Dimension | Assessment |
|-----------|------------|
| Complexity | High — slices, thunks, selectors, store config |
| Bundle size | ~50 kB (redux + rtk + redux-persist) |
| Scalability | Excellent — battle-tested at scale |
| Team familiarity | Medium — boilerplate-heavy |
| TypeScript | Good (with RTK) |
| DevTools | Excellent (Redux DevTools) |

**Pros:** Mature ecosystem, time-travel debugging, predictable patterns, large team knowledge base
**Cons:** Excessive boilerplate for a PWA of this scale; redux-persist is notoriously tricky; RTK adds ~30 kB to bundle; React DevTools integration is verbose

### Option B: Zustand v5 ✅ CHOSEN
| Dimension | Assessment |
|-----------|------------|
| Complexity | Low — flat object, `set()` mutations |
| Bundle size | ~3 kB |
| Scalability | Good for medium complexity |
| Team familiarity | High — close to vanilla JS |
| TypeScript | Excellent (first-class inference) |
| DevTools | Good (Zustand DevTools middleware) |

**Pros:** 15× smaller bundle; zero boilerplate; `persist` + `partialize` built-in; works with React 19 concurrent features; no provider wrapping needed
**Cons:** No time-travel debugging; less tooling for large teams; can encourage monolithic store if not disciplined

### Option C: React Context + useReducer
| Dimension | Assessment |
|-----------|------------|
| Complexity | Medium — custom persistence layer needed |
| Bundle size | Zero (built-in) |
| Scalability | Poor — re-render performance degrades with size |

**Pros:** Zero dependencies, framework-native
**Cons:** Context value changes re-render entire subtrees; implementing selectors correctly is complex; persistence is entirely manual

---

## Trade-off Analysis

The key trade-off is **bundle size + DX vs. tooling depth**. MindShift is a mobile-first PWA where the 98 kB gzip bundle target is a hard constraint. Redux Toolkit at full configuration would add ~30–50 kB and push the bundle past 130 kB — a meaningful regression on 3G connections.

The state complexity doesn't justify Redux's overhead. MindShift has no event sourcing requirements, no complex async sagas, and no multi-team coordination needs that Redux's strict conventions are designed to solve.

Zustand's `partialize` function provides exactly the selective persistence needed (not all state survives reload — e.g., `energyLevel` resets daily).

---

## Consequences

**Easier:**
- Adding new slices (2–5 lines each)
- Selective persistence via `partialize`
- Testing (store can be instantiated without providers)
- Bundle size stays under 100 kB gzip

**Harder:**
- Time-travel debugging (no built-in)
- Enforcing strict immutability (Zustand allows direct mutation patterns)
- Onboarding new developers unfamiliar with Zustand

**Revisit if:**
- Team size grows beyond 3–4 engineers (Redux's conventions scale better)
- Complex async coordination patterns emerge (sagas/epics)
- Store grows beyond ~80 keys

---

## Action Items
- [x] Implement 6-slice store in `src/store/index.ts`
- [x] Configure `persist` with `partialize` for selective persistence
- [x] Add `completedTotal` to `partialize` (bug fix: 2026-03-09)
- [ ] Consider splitting store into separate Zustand slices files if >80 keys (TD-007)
