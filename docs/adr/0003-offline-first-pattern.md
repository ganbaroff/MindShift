# ADR 0003 — Offline-First Pattern with Optimistic Mutations

**Date:** 2026-03-11
**Status:** Accepted
**Author:** Claude (Sprint 6 audit)

---

## Context

MindShift is a PWA targeting ADHD users who may have inconsistent network connectivity. The app's core loop — capturing tasks, completing them, logging energy — must not fail silently or block the user when offline.

Key UX constraint from ADHD research: **any latency or failure feedback during a task interaction breaks focus**. A 3-second spinner while completing a task causes more harm than completing the task optimistically and syncing later.

### Current pain points

1. Task mutations (create / complete / snooze) were originally `await supabase.from(...).upsert(...)` — a blocked write that failed visibly offline
2. Energy check-ins had no offline fallback — tapping an energy option silently dropped the event
3. The offline queue had no retry mechanism — un-sent events were lost on page close

---

## Decision

Adopt an **optimistic-first, queue-backed** offline pattern for all user mutations:

```
User action
    │
    ▼
1. Immediate Zustand update (UI reflects change instantly)
    │
    ▼
2. Enqueue to offlineQueue (localStorage-backed ring buffer)
    │
    ▼
3. Attempt Supabase write
    │
    ├─ Online  → write succeeds → dequeue
    └─ Offline → write fails   → remain in queue
                                      │
                                      ▼
                            4. useOfflineSync flushes on reconnect
```

### Implementation details

**`offlineQueue.ts`** — bounded FIFO ring buffer (max 200 events):
```ts
export function enqueue(event: QueuedEvent): void
export function flush(): QueuedEvent[]
export function peek(): QueuedEvent[]
```

**`useOfflineSync.ts`** — Zustand subscription + `navigator.onLine` / `online` event listener:
```ts
// Flushes queue in order when network returns
navigator.addEventListener('online', async () => {
  const pending = peek()
  for (const event of pending) {
    await retryEvent(event)
  }
})
```

**Conflict resolution** — last-write-wins per `(user_id, task_id)` for task mutations. Energy events are append-only; no conflict possible.

**Failure modes handled:**
- Network offline: event stays queued; user sees no error
- Supabase 5xx: event re-queued with exponential backoff (1s, 2s, 4s, max 16s)
- Auth expired: event dropped after 3 retries; user is redirected to sign-in
- Queue overflow (200 events): oldest events evicted; toast: "Some offline changes may be lost"

---

## Consequences

### Positive
- **Zero blocking on task interactions**: completing or snooping a task is instant from the user's perspective
- **No data loss on transient outages**: queue survives page refreshes (localStorage) and flushes automatically
- **Focus-friendly**: no error modals or spinners during normal usage
- **Simple**: no third-party sync library needed at current scale

### Negative / Trade-offs
- **Stale reads**: if another device updates a task while this device is offline, local state is stale until next Supabase Realtime sync. Acceptable for single-device primary use pattern
- **Queue ordering**: the ring buffer preserves insertion order, but server-side `updated_at` timestamps determine final state. Out-of-order arrival is rare but possible
- **localStorage quota**: 200-event cap prevents quota exhaustion; events beyond the cap are silently dropped with a toast warning

---

## Alternatives Considered

| Alternative | Why rejected |
|---|---|
| Block UI on network failure | Unacceptable for ADHD users; interrupts flow |
| PouchDB / CouchDB sync | Overkill for MVP; adds ~40 KB and a full sync protocol |
| TanStack Query `useMutation` optimistic | Good alternative; deferred in favour of keeping the store as single source of truth |
| Service Worker Background Sync API | Limited browser support (not Safari as of 2025); falls back to `online` event anyway |

---

## Related Files

- `src/shared/lib/offlineQueue.ts`
- `src/shared/hooks/useOfflineSync.ts`
- `src/store/slices/tasksSlice.ts` — optimistic update helpers
