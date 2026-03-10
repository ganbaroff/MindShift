# MindShift Testing Strategy
**Date:** 2026-03-09 | **Current state:** 78 tests, 4 files | **Target:** 200+ tests, 15 files

---

## Current Coverage Assessment

### What's well covered ✅
- **Store business logic** (`store/__tests__/store.test.ts`) — 50+ tests
  - addTask, completeTask, snoozeTask, archiveAllOverdue, addXP
  - selectActiveTasks (ADHD 3-task limit), selectSessionProgress
  - isProActive + trial expiry logic
- **Utilities** (`shared/lib/__tests__/`)
  - `cn.ts` — classname merge utility
  - `constants.ts` — numeric constants are as documented
  - `offlineQueue.ts` — enqueue/dequeue/flush/migration

### Critical gaps ❌
- Zero component tests (React Testing Library)
- Zero Edge Function tests (Deno test runtime)
- Zero audio engine tests (Web Audio API mock)
- Zero hook tests (useAudioEngine, usePalette, useMotion)
- Zero Playwright E2E tests running (blocked by TD-001)

---

## Testing Pyramid for MindShift

```
         [E2E — Playwright]        6 spec files, ~40 scenarios
         7 flows, mobile viewport  Currently blocked by rollup/build issue (TD-001)

      [Integration — vitest]       New: 4 files, ~30 tests
      Store + Supabase mocks       Edge functions, offline queue + real store

   [Unit — vitest]                 Current: 78 tests
   Pure functions + components     Target: 150+ tests in 10 files
```

---

## Test Plan by Area

### 1. Store (existing — expand)
**File:** `src/store/__tests__/store.test.ts`
**Current:** 50 tests | **Target:** 70 tests

| Gap | Test to add |
|-----|-------------|
| `moveTask` behavior | moves task between any pools correctly |
| `setTasks` bulk replace | replaces existing tasks without duplication |
| `signOut` resets ALL slices | verify all 7 slices return to initial state |
| `startSession` + `endSession` | session lifecycle + phase starts at 'idle' |
| `tickTimer` | counts down correctly, stops at 0 |
| `unlockAchievement` deduplication | calling twice doesn't double-add |
| `completedTotal` persistence | value survives setState (Zustand persist integration) |
| `psychotype derivation` | all 4 combos of appMode × cognitiveMode |

---

### 2. XP Calculation (new — critical business logic)
**File:** `src/store/__tests__/xp.test.ts`
**Priority:** High — XP formula is core to the ADHD reward loop

```typescript
describe('XP formula', () => {
  it('base XP = 10 × difficulty × energyMultiplier', () => {
    // difficulty 1, energy 3 (neutral) → 10 × 1 × 1.0 = 10
    expect(calculateBaseXP(1, 3)).toBe(10)
    // difficulty 3, energy 3 → 10 × 3 × 1.0 = 30
    expect(calculateBaseXP(3, 3)).toBe(30)
  })

  it('low energy (1-2) gives 1.2× multiplier', () => {
    expect(calculateBaseXP(2, 1)).toBe(24) // 10×2×1.2
    expect(calculateBaseXP(2, 2)).toBe(24)
  })

  it('high energy (4-5) gives 0.8× multiplier', () => {
    expect(calculateBaseXP(2, 4)).toBe(16) // 10×2×0.8
    expect(calculateBaseXP(2, 5)).toBe(16)
  })

  it('VR bonus multipliers are 2.0, 1.5, or 1.0', () => {
    // Verify the VR schedule probabilities (statistical test)
    const samples = Array.from({ length: 10000 }, () => Math.random())
    const doubles = samples.filter(r => r < 0.08).length / 10000
    const halves  = samples.filter(r => r >= 0.08 && r < 0.25).length / 10000
    expect(doubles).toBeCloseTo(0.08, 1)
    expect(halves).toBeCloseTo(0.17, 1)
  })
})
```

---

### 3. Offline Queue (existing — extend)
**File:** `src/shared/lib/__tests__/offlineQueue.test.ts`
**Current:** ~15 tests | **Add:** 10 more

| Gap | Test to add |
|-----|-------------|
| Max queue size (50) enforces oldest-drop | enqueue 51 items → oldest removed |
| `migrateLegacyQueue` isolates other users | user-A items stay in user-B's migration |
| Corrupted JSON self-healing (fixed 2026-03-09) | corrupt key → getQueue returns [] AND clears key |
| `flushQueue` parallel partial failure | 2 succeed, 1 fails → only failed item stays |
| `onItemsDropped` fires after MAX_RETRIES | callback called with count after 5 failures |
| Empty flush is no-op | no Supabase calls when queue empty |

---

### 4. usePalette hook (new)
**File:** `src/shared/hooks/__tests__/usePalette.test.ts`
**Priority:** Medium — calm mode color safety

```typescript
import { renderHook } from '@testing-library/react'
import { usePalette } from '../usePalette'

describe('usePalette', () => {
  it('returns full-saturation colors when cognitiveMode=overview', () => {
    // mock useStore to return overview mode
    const { result } = renderHook(() => usePalette(), { ... })
    expect(result.current.primary).toBe('#7B72FF')
  })

  it('returns desaturated colors in focused/calm mode', () => {
    // primary should be less saturated than #7B72FF
    const { result } = renderHook(() => usePalette(), { /* focused mode */ })
    expect(result.current.primary).not.toBe('#7B72FF')
  })

  it('never returns red (#FF*) for any color', () => {
    const palette = result.current
    Object.values(palette).forEach(color => {
      expect(color.toLowerCase()).not.toMatch(/^#[eE-fF]{2}0000/)
    })
  })
})
```

---

### 5. ArcTimer component (new)
**File:** `src/features/focus/__tests__/ArcTimer.test.tsx`
**Priority:** High — focus session core UX

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { ArcTimer } from '../ArcTimer'

describe('ArcTimer', () => {
  it('shows "tap" hint when digits are hidden', () => {
    render(<ArcTimer progress={0.5} remainingSeconds={300} phase="struggle"
      showDigits={false} onToggleDigits={vi.fn()} />)
    expect(screen.getByText('tap')).toBeInTheDocument()
  })

  it('shows formatted time when showDigits=true', () => {
    render(<ArcTimer progress={0.5} remainingSeconds={125} phase="struggle"
      showDigits={true} onToggleDigits={vi.fn()} />)
    expect(screen.getByText('2:05')).toBeInTheDocument()
  })

  it('disables tap in flow phase (disableToggle=true)', () => {
    const onToggle = vi.fn()
    render(<ArcTimer progress={0.8} remainingSeconds={600} phase="flow"
      showDigits={false} onToggleDigits={onToggle} disableToggle={true} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onToggle).not.toHaveBeenCalled()
  })

  it('calls onToggleDigits when tapped (non-flow phase)', () => {
    const onToggle = vi.fn()
    render(<ArcTimer progress={0.5} remainingSeconds={300} phase="struggle"
      showDigits={false} onToggleDigits={onToggle} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onToggle).toHaveBeenCalledOnce()
  })

  it('has aria-label describing current state', () => {
    render(<ArcTimer progress={0.5} remainingSeconds={300} phase="struggle"
      showDigits={false} onToggleDigits={vi.fn()} />)
    expect(screen.getByRole('button')).toHaveAccessibleName(/show remaining time/i)
  })
})
```

---

### 6. TaskCard component (new)
**File:** `src/features/tasks/__tests__/TaskCard.test.tsx`
**Priority:** High — most-used component

| Test | Assertion |
|------|-----------|
| Renders task title | `getByText(task.title)` |
| Shows difficulty dots | 3 dots, correct filled count |
| Shows carry-over badge after 24h | `getByText('carry-over')` |
| Complete button disabled after click | `disabled=true` after click |
| Park button only shows for NOW pool | hidden for next/someday |
| Complete calls `onComplete` after 600ms | `vi.useFakeTimers()`, advance 600ms |
| XP toast fires (smoke) | `notifyXP` mock called |

---

### 7. Edge Functions (new — Deno test runtime)
**File:** `supabase/functions/decompose-task/__tests__/index.test.ts`
**Priority:** High — AI integration + rate limiting

```typescript
// Deno test
import { assertEquals } from 'https://deno.land/std/assert/mod.ts'

Deno.test('decompose-task returns 401 without auth', async () => {
  const req = new Request('http://localhost/decompose-task', {
    method: 'POST',
    body: JSON.stringify({ taskTitle: 'Test task' }),
  })
  const res = await handler(req)
  assertEquals(res.status, 401)
})

Deno.test('decompose-task returns 400 on malformed JSON', async () => {
  const req = new Request('http://localhost/decompose-task', {
    method: 'POST',
    headers: { Authorization: 'Bearer mock-jwt' },
    body: 'not-json',
  })
  const res = await handler(req)
  assertEquals(res.status, 400)
})

Deno.test('decompose-task returns 400 on empty title', async () => { ... })
Deno.test('decompose-task enforces MAX_TITLE_LEN', async () => { ... })
Deno.test('rate limit returns 429 after limit exceeded', async () => { ... })
Deno.test('CORS preflight returns 200 with correct headers', async () => { ... })
```

**All 5 edge functions need similar test suites.**

---

### 8. Auth flow (new — integration)
**File:** `src/features/auth/__tests__/AuthScreen.test.tsx`

| Test | Assertion |
|------|-----------|
| CTA disabled until consent checked | button `disabled` initially |
| CTA enables after consent | after checkbox click, button enabled |
| Email input validation | empty/invalid → no Supabase call |
| Step 2 shown after valid submit | "Check your inbox" appears |
| "Use a different email" returns to step 1 | step 1 renders |
| `pending_consent` written to localStorage on submit | `localStorage.getItem('pending_consent')` set |

---

### 9. Recovery Protocol (new — critical ADHD UX)
**File:** `src/features/tasks/__tests__/RecoveryProtocol.test.tsx`

| Test | Assertion |
|------|-----------|
| `archiveAllOverdue` called on mount | mocked, verify call |
| Shows welcome message from edge function | mock edge fn, text appears |
| Micro-win chips render | 3 chips visible |
| Skip dismisses overlay | `onDismiss` called |
| Decompose chip expands to subtasks | mock API, subtasks appear |

---

### 10. E2E Tests (Playwright — resume after TD-001)
**Files:** `e2e/*.spec.ts` (6 files already exist)

Verify these scenarios run cleanly once rollup is fixed:

| File | Priority Scenarios |
|------|--------------------|
| `auth.spec.ts` | Magic link flow, consent persistence |
| `onboarding.spec.ts` | All 3 steps, sample task seeding |
| `tasks.spec.ts` | Add task, complete, park, pool limits |
| `focus.spec.ts` | Start session, phase transitions, interrupt |
| `settings.spec.ts` | Mode changes, sign out, GDPR |

Add new scenario:
- **Mobile viewport test** (375×812 — iPhone 14): verify no content hidden behind BottomNav
- **Offline mode test**: disconnect network, add task, reconnect, verify flush

---

## Coverage Targets

| Area | Current | Target | Priority |
|------|---------|--------|----------|
| Store logic | ~95% | 95%+ | ✅ Maintain |
| Utilities (cn, queue, constants) | ~90% | 90%+ | ✅ Maintain |
| Hooks (usePalette, useMotion) | 0% | 80% | 🔴 High |
| Components (React) | 0% | 70% | 🔴 High |
| Edge Functions | 0% | 85% | 🔴 High |
| E2E flows | Blocked | 7/7 flows | 🟠 After TD-001 |

---

## New Test Files to Create

```
src/
  store/__tests__/
    xp.test.ts              (XP formula + VR schedule)
  shared/hooks/__tests__/
    usePalette.test.ts      (calm mode colors)
    useMotion.test.ts       (reduced-motion detection)
  shared/lib/__tests__/
    offlineQueue.test.ts    (extend existing)
  features/focus/__tests__/
    ArcTimer.test.tsx       (timer component)
    FocusScreen.test.tsx    (state machine smoke tests)
  features/tasks/__tests__/
    TaskCard.test.tsx       (most-used component)
    RecoveryProtocol.test.tsx  (critical ADHD UX)
  features/auth/__tests__/
    AuthScreen.test.tsx     (consent + 2-step flow)
supabase/functions/
  decompose-task/__tests__/index.test.ts
  recovery-message/__tests__/index.test.ts
  gdpr-delete/__tests__/index.test.ts
```

---

## vitest Config Additions Needed

```typescript
// vitest.config.ts additions
export default defineConfig({
  test: {
    environment: 'jsdom',  // for React component tests
    globals: true,
    setupFiles: ['./src/test-setup.ts'],  // mock Web Audio API, localStorage
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      thresholds: {
        statements: 75,
        branches: 70,
        functions: 75,
        lines: 75,
      }
    }
  }
})
```

```typescript
// src/test-setup.ts
import '@testing-library/jest-dom'

// Mock Web Audio API (not available in jsdom)
global.AudioContext = vi.fn(() => ({
  createGain: vi.fn(() => ({ connect: vi.fn(), gain: { value: 0 } })),
  createBiquadFilter: vi.fn(() => ({ connect: vi.fn() })),
  destination: {},
  resume: vi.fn().mockResolvedValue(undefined),
  state: 'running',
})) as unknown as typeof AudioContext

// Mock AudioWorklet
global.AudioWorklet = vi.fn() as unknown as typeof AudioWorklet
```
