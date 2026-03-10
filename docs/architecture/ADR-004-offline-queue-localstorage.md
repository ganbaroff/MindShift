# ADR-004: Offline Queue via localStorage (vs. IndexedDB / Service Worker Sync)

**Status:** Accepted
**Date:** 2026-03-09
**Deciders:** Yusif (sole owner)
**Context area:** Offline support / data persistence

---

## Context

MindShift is a PWA targeting users who may use the app in intermittent network conditions (commuting, low-signal areas). When Supabase writes fail, the user's task data must not be lost — the local Zustand store updates optimistically, but the DB sync must retry when the network returns.

The app needs a lightweight retry queue for failed Supabase inserts/upserts. Requirements:
- Store failed writes across page refreshes
- Retry on network return (`window online` event) and app foregrounding (`visibilitychange`)
- Per-user namespace (different users on same device must not mix queues)
- Max 5 retries per item before dropping (with user notification)
- Max 50 items (prevent localStorage bloat)

---

## Decision

Implement a **localStorage-based offline queue** (`src/shared/lib/offlineQueue.ts`) with JSON serialization, per-user key namespacing, and exponential-style retry (attempt counter).

---

## Options Considered

### Option A: localStorage queue ✅ CHOSEN
| Dimension | Assessment |
|-----------|------------|
| Implementation complexity | Low (~200 lines) |
| Storage limit | 5–10 MB (sufficient for 50 task rows) |
| Synchronous access | Yes (no async needed) |
| Browser support | Universal |
| Structured data | Via JSON.parse/stringify |

**Pros:** Simple, synchronous, universally supported; per-user namespacing via key prefix; self-healing on corrupted JSON (clears bad key, starts fresh); no dependency on IDBFactory
**Cons:** 5–10 MB storage limit; synchronous writes can block main thread for large payloads; storage quota errors possible on low-storage devices

### Option B: IndexedDB (via idb-keyval)
| Dimension | Assessment |
|-----------|------------|
| Implementation complexity | Medium |
| Storage limit | Large (50% of available disk) |
| Synchronous access | No — all async |
| Browser support | Universal (with polyfill) |

**Pros:** Much larger storage limit; async (non-blocking); transactional
**Cons:** Async API complicates the flush logic; `idb-keyval` adds a dependency; the larger storage limit is unnecessary (task rows are tiny: ~200 bytes each × 50 max = 10 kB); adds complexity for marginal benefit

### Option C: Background Sync API (Service Worker)
| Dimension | Assessment |
|-----------|------------|
| Implementation complexity | High |
| Reliability | Excellent — OS-managed retry |
| Browser support | Chrome/Edge only (not Safari) |

**Pros:** OS-managed retry even when app is closed; most reliable
**Cons:** Safari/Firefox do not support Background Sync API; requires service worker coordination; debugging is very difficult; overkill for the scale (50 task rows at 200 bytes = 10 kB)

### Option D: Optimistic UI only (no retry queue)
**Pros:** Zero complexity
**Cons:** Silent data loss on network failure; unacceptable for a productivity app

---

## Trade-off Analysis

The data being queued is extremely small. Task rows are ~200–400 bytes each, and the MAX_QUEUE_SIZE cap of 50 means the worst-case queue is ~20 kB — well within localStorage's limit and perfectly serializable as JSON.

The synchronous nature of localStorage is actually a feature here: `enqueue()` is called inside a `catch` block after an async Supabase call fails. The synchronous write ensures the item is persisted before the `catch` block exits, with no risk of the queue write itself failing silently.

Background Sync would be the gold standard for reliability, but its absence from Safari (which represents ~30% of mobile traffic, especially iOS) makes it a non-starter as the *only* solution. It could be added as a progressive enhancement later.

---

## Consequences

**Easier:**
- Predictable behavior across all browsers (including Safari iOS)
- Simple debugging (queue is inspectable in DevTools → Application → localStorage)
- Zero additional dependencies
- `migrateLegacyQueue()` handles devices that have pre-namespacing queue items

**Harder:**
- Cannot retry while app is closed (only retries on reopen)
- localStorage quota errors on very low-storage devices (gracefully handled by try/catch)

**Revisit if:**
- Background Sync API gains Safari support (add as progressive enhancement)
- Queue items grow significantly larger (e.g., storing full session audio metadata)
- Multiple simultaneous `flushQueue()` calls could race (current implementation: fine at the single-user level, but needs mutex if called from service worker and main thread simultaneously)

---

## Action Items
- [x] Implement `enqueue()`, `queueSize()`, `flushQueue()` in `offlineQueue.ts`
- [x] Self-heal on corrupted JSON (2026-03-09 fix)
- [x] Per-user key namespacing (`ms_offline_queue_{userId}`)
- [x] `migrateLegacyQueue()` for backward compatibility
- [x] Unit tests: `offlineQueue.test.ts`
- [x] `setOnItemsDropped()` callback for user notification on MAX_RETRIES exceeded
- [ ] Wire `flushQueue()` to `window online` event in App.tsx
- [ ] Consider adding Background Sync as a progressive enhancement for Chrome/Edge users
