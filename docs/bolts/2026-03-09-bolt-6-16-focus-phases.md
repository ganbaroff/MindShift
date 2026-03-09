# Bolt 6.16 — FocusScreen Three-Phase Behavior + 90min Preset + Interrupt Bookmark

- **Date:** 2026-03-09
- **Owner:** Claude Code via Yusif
- **Feature:** Focus Session — neuroscience-based phase visuals, 90-min deep work, interrupt parking
- **Sprint:** 2026-Q1-Sprint-01
- **Goal:** Timer visuals adapt to attention phases (struggle/release/flow), 90-min preset available, interrupt bookmark captures context for re-entry.

---

## Changes

### 1. Three-Phase Timer Behavior (Research #2: Neuroscience)

**Phase thresholds updated:**
- Struggle: 0–7 min (was 0–15) — large timer, indigo, pulsing glow
- Release: 7–15 min (was 15–20) — timer shrinks to 85%, teal, no pulse
- Flow: 15+ min (was 20+) — digits vanish, arc-only ambient, controls fade

**New constant:** `PHASE_STRUGGLE_MINUTES = 7`

**Visual transitions:**
- `getTimerSize(phase)` returns ARC_SIZE * {1.0, 0.85, 0.75} per phase
- ArcTimer animates size with 1.2s easeInOut transition (motion.button)
- Flow phase: `disableToggle=true` prevents tap-to-show digits
- Task title opacity: 50% → 30% in flow

### 2. 90-Minute Deep Work Preset

`TIMER_PRESETS = [5, 25, 52, 90]` — enables ultradian rhythm sessions.
Triggers mandatory recovery lock after completion (existing behavior via MAX_SESSION_MINUTES=90).

### 3. Interrupt Bookmark Modal

**New flow:** End session → Bookmark capture → "What were you working on?" → localStorage → End
**On next setup:** Anchor card shows last bookmark with "Continue task" + "Dismiss"

**localStorage key:** `ms_interrupt_bookmark`
**Schema:** `{ text, taskId, taskTitle, timestamp }`

### 4. ArcTimer Enhancements

- New `disableToggle` prop — suppresses click handler and "tap" hint
- `motion.button` wrapper — animates width/height transitions between phases
- Exported `ARC_SIZE` constant for phase scaling in FocusScreen

---

## Files Modified

| File | Changes |
|------|---------|
| `src/shared/lib/constants.ts` | Added `PHASE_STRUGGLE_MINUTES = 7`, added 90 to `TIMER_PRESETS` |
| `src/shared/lib/__tests__/constants.test.ts` | Added struggle threshold test, phase ordering test |
| `src/features/focus/ArcTimer.tsx` | Added `disableToggle` prop, `motion.button` animated wrapper, exported `ARC_SIZE` |
| `src/features/focus/FocusScreen.tsx` | Updated `getPhase()`, added phase-based timer sizing, flow digit hiding, bookmark-capture screen, setup anchor card, `ScreenState` extended |

---

## Acceptance Criteria

### AC1: Phase thresholds are 0-7 / 7-15 / 15+
**Test:** Constants test passes with `PHASE_STRUGGLE_MINUTES === 7`, `PHASE_FLOW_MINUTES === 15`
**Status:** ✅

### AC2: Timer visually changes per phase
**Test:** ArcTimer receives dynamic `size` prop, `disableToggle` in flow
**Status:** ✅ (build passes, verified by code review)

### AC3: 90-min preset visible in selector
**Test:** `TIMER_PRESETS.includes(90)`, build passes, FocusScreen maps over presets
**Status:** ✅

### AC4: Interrupt bookmark saves and restores
**Test:** bookmark-capture screen renders, localStorage read/write, anchor card in setup
**Status:** ✅ (build passes)

### AC5: Build + tests pass
**Test:** `npm run build` — 0 errors, `npx vitest run` — 78/78 pass
**Status:** ✅

### REQUIRED: Manual runtime check
1. Start 25-min session → observe struggle phase (0-7m): large indigo timer, pulse
2. Wait/skip to 7+ min → release phase: smaller teal timer, no pulse
3. Wait/skip to 15+ min → flow phase: digits gone, controls faded, ambient arc
4. Verify 90-min preset in duration selector
5. Start session → "End session" → bookmark modal → type text → "Save & Exit"
6. Return to setup → anchor card visible → "Continue task" or "Dismiss"

---

## Technical Notes

- `getTimerSize()` is a pure function outside the component — no re-render overhead
- Bookmark uses lazy `useState(() => loadBookmark())` — only reads localStorage once on mount
- ARC_SIZE exported from ArcTimer.tsx to avoid magic numbers in FocusScreen
- `disableToggle` prevents accidental digit reveal during flow state (UX: no distractions)
