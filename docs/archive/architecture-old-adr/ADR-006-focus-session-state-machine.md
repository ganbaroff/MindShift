# ADR-006: 6-State Machine for Focus Session Screen

**Status:** Accepted
**Date:** 2026-03-09
**Deciders:** Yusif (sole owner)
**Context area:** Focus session UX / frontend state design

---

## Context

The Focus Screen manages a complex multi-phase user experience:
1. Users set up a session (task selection, duration, audio)
2. The timer runs through 3 phases (struggle → release → flow)
3. Users can interrupt mid-session (with a "park the thought" bookmark)
4. After completion, a mandatory 2-minute nature buffer separates sessions
5. After the buffer, a 10-minute recovery lock prevents immediate re-session

This creates 6 distinct screen states with different UI, timers, and side effects. An ad-hoc approach (many boolean flags) would be error-prone and hard to reason about.

---

## Decision

Implement the Focus Screen as an explicit **finite state machine (FSM)** with 6 named states, managed via a `useState<ScreenState>` discriminant and explicit transition functions.

**States:**
```
setup → session → interrupt-confirm → bookmark-capture → nature-buffer → recovery-lock → setup
                                    ↗
                         (resume from interrupt)
```

State type:
```typescript
type ScreenState = 'setup' | 'session' | 'interrupt-confirm' | 'bookmark-capture' | 'recovery-lock' | 'nature-buffer'
```

---

## Options Considered

### Option A: Boolean flag soup
```typescript
const [isRunning, setRunning] = useState(false)
const [isInterrupted, setInterrupted] = useState(false)
const [isRecovery, setRecovery] = useState(false)
// ... etc.
```
**Pros:** Familiar to junior developers
**Cons:** 2^6 = 64 possible flag combinations, most of which are invalid. Bugs arise when transitions leave flags in inconsistent states. Impossible to reason about what state is "current" at a glance.

### Option B: Explicit FSM (string discriminant) ✅ CHOSEN
```typescript
type ScreenState = 'setup' | 'session' | 'interrupt-confirm' | 'bookmark-capture' | 'recovery-lock' | 'nature-buffer'
const [screen, setScreen] = useState<ScreenState>('setup')
```
**Pros:** Exactly 6 valid states; TypeScript exhaustive checks on switches; transitions are named functions (`handleStop`, `handleResume`, `handleConfirmStop`); UI rendering is a pure function of `screen` value
**Cons:** Slightly more upfront design thinking required

### Option C: XState state machine library
**Pros:** Visual tooling, formal guard conditions, event-driven transitions
**Cons:** ~25 kB bundle addition; overkill for 6 states; XState's learning curve is significant; the state machine isn't complex enough to need formal event systems

---

## Trade-off Analysis

The explicit string FSM is the sweet spot between formalism and simplicity. It gives all the reasoning benefits of a state machine (impossible states become impossible to represent in TypeScript) without XState's bundle cost and learning curve.

The `ScreenState` type exhaustively covers all valid states. When rendering:
```typescript
if (screen === 'nature-buffer') { return <NatureBufferUI /> }
if (screen === 'recovery-lock') { return <RecoveryLockUI /> }
// ... etc.
```

This pattern makes it impossible to accidentally render two incompatible UI states simultaneously (a common bug with boolean flags).

### Session Phase Sub-machine

Within the `'session'` state, there's a nested 3-phase progression:

```
struggle (0–7min) → release (7–15min) → flow (15+min)
```

This is managed as a separate Zustand slice (`sessionPhase`) rather than another `ScreenState` variant, because the phase is:
- Needed across components (ArcTimer reads it)
- Derived from `elapsedSeconds` (not a user action)
- Persistent in the store (for recovery detection)

---

## Consequences

**Easier:**
- Adding new states (e.g., a `'paused'` state if pause is added) is explicit and isolated
- TypeScript catches any unhandled state in switch/if chains
- Testing: each state renders specific UI, testable in isolation
- Debugging: current state is a single readable string

**Harder:**
- More code per state transition (explicit named functions vs. `setFlag(true)`)
- The `interrupt-confirm → bookmark-capture` path could be merged, but keeping them separate improves the UX flow (two distinct mental steps: "do I want to stop?" vs. "what was I thinking?")

**Revisit if:**
- More than ~10 states are needed (XState becomes worth it)
- Cross-session state (e.g., paused sessions surviving page refresh) is needed — would require persisting `ScreenState` + timer refs

---

## Action Items
- [x] Implement 6-state machine in `FocusScreen.tsx`
- [x] Transition functions: `handleStart`, `handleStop`, `handleResume`, `handleConfirmStop`, `handleBookmarkSave`, `handleBookmarkSkip`, `handleSkipBuffer`
- [x] `startNatureBuffer()` callback in session end handler
- [x] `recovery-lock` 10-minute countdown
- [ ] Consider extracting state machine logic to a custom `useFocusSession()` hook (tech debt TD-008 — FocusScreen.tsx is 600+ lines)
