# MindShift Code Review
**Date:** 2026-03-09 | **Reviewer:** Claude (Engineering Skill) | **Scope:** Full codebase

---

## Summary

| Dimension | Rating | Notes |
|-----------|--------|-------|
| Security | ⭐⭐⭐⭐ 4/5 | Auth, CORS, rate limiting all solid. One `req.json()` hardening gap. |
| Performance | ⭐⭐⭐⭐ 4/5 | Good patterns. Store timer could cause wide re-renders. |
| Correctness | ⭐⭐⭐⭐ 4/5 | Well-handled edge cases. One localStorage corruption gap. |
| Maintainability | ⭐⭐⭐ 3.5/5 | store/index.ts is large; design tokens scattered (being addressed). |

**Overall: solid production-quality code. No critical vulnerabilities found.**

---

## Security (4/5 — Very Good)

### ✅ What's done right

- **CORS** (`_shared/cors.ts`): origin-allowlist approach, never reflects `*`. Regex validates ngrok subdomains for dev safety. The `corsHeaders` legacy export hardcodes a specific origin (not `*`) — acceptable.
- **Auth on every edge fn**: all Edge Functions call `supabase.auth.getUser()` before any work. JWT validated server-side by Supabase infrastructure.
- **Rate limiting**: DB-backed via atomic `increment_rate_limit` RPC — correct across Deno isolates, survives cold starts. Pro users bypass, free users capped.
- **Input size limits**: `MAX_TITLE_LEN = 500`, `MAX_DESC_LEN = 1000` in decompose-task — prevents payload bombing the AI prompt.
- **RLS**: Supabase row-level security assumed on all tables (enforced at DB layer, not just app).
- **No secrets in code**: env vars via `Deno.env.get()` — correct pattern.

### ⚠️ Issues Found

**[MEDIUM] `req.json()` not wrapped in try/catch — all edge functions**
Files: `decompose-task/index.ts:75`, `recovery-message/index.ts:73`, `gdpr-delete/index.ts:43`, `weekly-insight/index.ts:94`

```typescript
// Current — will throw 500 if client sends malformed JSON
const { taskTitle } = await req.json() as { taskTitle: string }

// Fix — return 400 Bad Request instead of unhandled 500
let body: { taskTitle?: string }
try {
  body = await req.json()
} catch {
  return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
    status: 400, headers: { ...cors, 'Content-Type': 'application/json' }
  })
}
```

**[LOW] Rate limiter "fails open" on DB error**
File: `_shared/rateLimit.ts:52`

This is a documented and intentional design choice (comment explains it). However, an attacker who can cause Supabase RPC to fail (e.g., connection exhaustion) could bypass rate limiting. Acceptable for current scale; revisit at higher traffic.

**[LOW] ngrok wildcard in CORS**
File: `_shared/cors.ts:17`

`isNgrokOrigin()` matches any `*.ngrok-free.dev`. Remove or gate behind `Deno.env.get('ENVIRONMENT') === 'development'` before production hardening.

**[INFO] `Authorization!` non-null assertion**
File: `decompose-task/index.ts:34`

```typescript
{ global: { headers: { Authorization: req.headers.get('Authorization')! } } }
```

If header is missing, Supabase will fail auth and return 401 — handled correctly. But the `!` assertion masks the missing header. Consider:
```typescript
const authHeader = req.headers.get('Authorization')
if (!authHeader) return new Response(JSON.stringify({ error: 'Missing authorization' }), { status: 401, ... })
```

---

## Performance (4/5 — Good)

### ✅ What's done right

- **Code splitting**: all screens lazy-loaded via `React.lazy()` in App.tsx
- **Selective subscriptions**: Zustand's `subscribeWithSelector` middleware — components only re-render on relevant slice changes
- **AudioWorklet**: brown noise runs in audio thread, never blocks main thread
- **Constant power crossfade**: avoids amplitude glitches between presets
- **BentoGrid**: dnd-kit with `@dnd-kit/sortable` — virtualization not needed at 5 widget scale
- **Confetti**: canvas-based, auto-cleans on `onComplete`

### ⚠️ Issues Found

**[LOW] Timer tick causes store-wide re-renders every second**
File: `src/store/index.ts:277`, `src/features/focus/FocusScreen.tsx:304`

```typescript
// tickTimer runs every second via setInterval
tickTimer: () => set((s) => {
  if (!s.timerRunning || s.timerSeconds <= 0) return s
  return { timerSeconds: s.timerSeconds - 1 }
})
```

Every component subscribed to any part of the store could re-render each second. `subscribeWithSelector` helps if components use `useStore(s => s.specificField)`, but BentoGrid/HomeScreen may subscribe broadly.

Fix: ensure FocusScreen and ArcTimer are the only components accessing `timerSeconds`. Other screens should not subscribe to the full store during a session.

**[LOW] `flushQueue` sequential async**
File: `src/shared/lib/offlineQueue.ts:107`

Queue items are flushed serially. Fine for correctness, but on reconnect after long offline period (many queued items), this could be slow.

Optional: `Promise.allSettled()` for parallel flush with error-per-item handling.

**[INFO] ArcTimer re-renders on every tick**
File: `src/features/focus/ArcTimer.tsx`

`progress` and `remainingSeconds` props change every second. The SVG `strokeDashoffset` transition via CSS handles this smoothly, but the React reconciler still runs. Low cost in practice; no action needed.

---

## Correctness (4/5 — Good)

### ✅ What's done right

- **Timer cleanup**: `useEffect` return clears all 3 intervals (`intervalRef`, `recoveryIntervalRef`, `bufferIntervalRef`) on unmount
- **Session save guard**: `sessionSavedRef.current` prevents double-save on rapid unmount
- **VR XP**: probability ranges correct (0.08 = 8%, 0.08–0.25 = 17%, rest = 75%)
- **Consent persistence**: `pending_consent` in localStorage survives magic link redirect; restored in App.tsx
- **Archive function**: returns IDs for sync; called in RecoveryProtocol on mount
- **completedTotal**: now persisted (fixed 2026-03-09)

### ⚠️ Issues Found

**[MEDIUM] Corrupted localStorage queue not self-healing**
File: `src/shared/lib/offlineQueue.ts:36`

```typescript
function getQueue(userId?: string): QueueItem[] {
  try {
    const raw = localStorage.getItem(queueKey(userId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as QueueItem[]) : []  // ← if not array, returns []
  } catch {
    return []  // ← corrupted JSON returns [] but key is NOT cleared
  }
}
```

If the stored JSON is corrupted (e.g., partial write), every `getQueue` call returns `[]` but the corrupted key stays. `enqueue` then calls `saveQueue` which always overwrites — so it heals on next enqueue. However if nobody enqueues (user just opens app with old corrupted data), the corruption persists indefinitely.

Fix:
```typescript
} catch {
  localStorage.removeItem(queueKey(userId)) // Self-heal on corruption
  return []
}
```

**[LOW] `rateLimit.ts` null count comparison**
File: `_shared/rateLimit.ts:61`

```typescript
if ((count as number) > config.limitFree) {
```

If `increment_rate_limit` RPC returns `null` (e.g., function name typo in migration), `null > 20` is `false`, allowing the call. This is the intentional fail-open behaviour, but should be logged:

```typescript
if (count === null || count === undefined) {
  console.warn('[rateLimit] RPC returned null, failing open')
  return { allowed: true }
}
```

**[LOW] FocusScreen quick-start no duration guard**
File: `src/features/focus/FocusScreen.tsx:63` (getDefaultDuration)

`getDefaultDuration(energyLevel)` is only called in the `?quick=1` path. If `energyLevel` is somehow 0 (default before onboarding), it returns `52` (highest). Acceptable default, but worth noting.

**[INFO] `completeTask` 600ms delay race condition**
File: `src/features/tasks/TaskCard.tsx:103`

```typescript
setTimeout(() => {
  completeTask(task.id)
  onComplete?.()
}, 600)
```

If the user navigates away before 600ms, the component unmounts but the timeout still fires. `completeTask` modifies the Zustand store (outside React) — this is actually safe. `onComplete?.()` also works. No memory leak since no DOM refs involved.

---

## Maintainability (3.5/5 — Good, Improvable)

### ✅ What's done right

- **Constants file**: all magic numbers in `src/shared/lib/constants.ts` with research citations
- **Type safety**: strict TypeScript, no `any` types found
- **Research citations**: inline comments reference research paper numbers (Research #2, #3, #5, #7, #8) — excellent for ADHD domain knowledge transfer
- **Offline queue**: well-documented public API with JSDoc
- **Error boundary**: `ErrorBoundary` component exists
- **Logger utility**: `logError`/`logInfo` abstraction (Sentry-ready)

### ⚠️ Issues Found

**[MEDIUM] `store/index.ts` is 450+ lines — single file, 7 slices**

All state lives in one file. While functional, this makes it hard to:
- Find a specific slice quickly
- Add new slice without conflicts
- Test slices in isolation

Recommended pattern:
```
src/store/
  index.ts         (combine + persist setup — thin)
  slices/
    userSlice.ts
    taskSlice.ts
    sessionSlice.ts
    audioSlice.ts
    progressSlice.ts
    preferencesSlice.ts
    gridSlice.ts
```

**[LOW] Design tokens scattered across files (being addressed)**
- `src/shared/hooks/usePalette.ts` has hardcoded hex values
- `src/features/focus/ArcTimer.tsx` has `PHASE_COLORS` object with hex values
- `src/shared/ui/*.tsx` all have inline `style={{ color: '#8B8BA7' }}`
- Migration path: `src/shared/lib/tokens.ts` (created 2026-03-09) is the target

**[LOW] FocusScreen.tsx has 6-state machine in a single component (430+ lines)**

The 6-state machine (setup/session/interrupt/bookmark/recovery-lock/nature-buffer) is complex enough to warrant sub-components:
```
FocusScreen.tsx
  SetupView.tsx
  SessionView.tsx
  InterruptConfirmView.tsx
  BookmarkCaptureView.tsx
  RecoveryLockView.tsx
  NatureBufferView.tsx
```

**[INFO] Edge functions share no request parsing helper**

All 4 edge functions duplicate the `req.json()` pattern, auth check pattern, and response helper. A `_shared/request.ts` helper would DRY this:
```typescript
export async function parseBody<T>(req: Request, cors: Headers): Promise<T | Response>
export function jsonResponse(data: unknown, status: number, cors: Headers): Response
```

---

## Priority Fix List

| Priority | Issue | File | Effort |
|----------|-------|------|--------|
| 🔴 Medium | `req.json()` no try/catch → returns 500 on bad JSON | All edge functions | 30 min |
| 🔴 Medium | localStorage queue not self-healing on corruption | `offlineQueue.ts:36` | 5 min |
| 🟡 Low | ngrok CORS wildcard in production | `cors.ts:17` | 5 min |
| 🟡 Low | Missing auth header 401 before `!` assertion | Edge functions | 15 min |
| 🟡 Low | `rateLimit.ts` null count not logged | `rateLimit.ts:61` | 5 min |
| 🟢 Info | Split `store/index.ts` into slice files | `store/` | 2 hours |
| 🟢 Info | FocusScreen sub-components | `FocusScreen.tsx` | 3 hours |
| 🟢 Info | Edge function shared request helpers | `_shared/request.ts` | 1 hour |
