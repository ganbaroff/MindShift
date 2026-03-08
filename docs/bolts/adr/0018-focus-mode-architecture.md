# ADR 0018 — Focus Mode Architecture

**Date:** 2026-03-08
**Bolt:** 5.2
**Status:** Accepted
**Authors:** AI (Claude Sonnet 4.6)

---

## Context

MindFocus needs a Focus Mode to support deep work sessions. Research references:
- `docs/research/neuroscience-adhd-flow-reference.md` — Flow state 4 phases, Time Timer clinical data, 23-min interruption cost (UC Irvine)
- `docs/research/focus-audio-neuroscience.md` — Color noise hierarchy, Sonic Anchor (Pavlovian conditioning), 500ms logarithmic fade, 65 dB hard limiter
- `docs/research/competitive-market-analysis-2025.md` — Forest (pause must-be), Kano Model (pause = must-be without which users abandon)

Key requirements from ADHD research:
1. **Visual Time Timer** — diminishing arc, not digits (Gunther et al. 2019, p=0.019)
2. **Pause is a feature** — no shame, not hidden (hyperfocus has natural pauses)
3. **Zero distraction** — hide BottomNav, no toasts, no badges during session
4. **Sonic Anchor** — 2-sec 396 Hz tone at session start (Pavlovian conditioning after 10-15 sessions)
5. **Body Doubling** — persona "works alongside" (Focusmate research: +32% task completion)
6. **Proteus Effect** — archetype avatar during work primes user behavior

---

## Decision

### 1. Full-screen overlay (z-index 200), not a new nav tab

**Alternatives considered:**
- New BottomNav tab (5th tab, "Focus")
- Standalone route/screen
- Full-screen overlay rendered from `mindflow.jsx`

**Choice: Full-screen overlay**

Rationale:
- Skeleton rule: no changes to `skeleton/BottomNav.jsx` without dedicated ADR
- Overlay is semantically correct (modal-like focus session that returns to previous state)
- BottomNav is conditionally hidden via `!focusTask` check in mindflow.jsx (minimal change)
- FocusScreen renders at z-index 200 (above BottomNav z-100)

**Entry points:**
- "Focus Mode" button in TodayScreen (below TimelineView, visible when tasks exist)
- `onStartFocus(task | null)` prop → `setFocusTask(task || true)` in mindflow.jsx
- `focusTask === null` = not active; `focusTask === true` = open session; `focusTask = task` = focused on specific task

### 2. Hybrid timer: `Date.now()` + `requestAnimationFrame`, NOT `setInterval`

**Alternatives:**
- `setInterval(fn, 1000)` — drifts over time (loses seconds when tab hidden, device sleeps)
- `setInterval` + `visibilitychange` reconcile — complex, still inaccurate
- `Date.now()` timestamps + `rAF` — accurate, browser-native, no drift

**Choice: `Date.now()` hybrid**

```
elapsed = Date.now() - startTime - pausedMs
remaining = max(0, totalMs - elapsed)
progress = max(0, min(1, remaining / totalMs))
```

Benefits:
- Accurate across tab switches (rAF pauses in background, but `Date.now()` doesn't)
- When tab is brought back to foreground, first rAF tick computes correct elapsed
- Pause: snapshot `pauseTime = Date.now()`; resume: `pausedMs += Date.now() - pauseTime`

### 3. Web Audio API for noise generation

**Alternatives:**
- Audio files (MP3/OGG) — requires bundled assets, no dynamic control
- External library — bundle bloat, offline dependency
- Web Audio API — zero bundle cost (browser built-in), real-time control

**Choice: Web Audio API**

Pink noise: Voss-McCartney 6-generator algorithm pre-computed into 2-sec looping `AudioBuffer`.
Brown noise: Cumulative integration of white noise (1/f² spectrum).
Both: 60 Hz high-pass filter (mandatory per LFN research, SMD=−0.37).

**AudioContext lifecycle:** lazy-init on first user interaction (browser autoplay policy). `AudioContext` created once, kept alive for session duration, closed on unmount.

**Hard limiter:** master `GainNode` capped at 0.70 (≈ safe SPL, avoids >85 dB damage zone).

**Fades:** `exponentialRampToValueAtTime` — 500ms duration, logarithmic curve (prevents cortisol spike from abrupt transitions). Cannot ramp to 0 (log −∞); uses 0.0001 as floor.

### 4. Sonic Anchor: 396 Hz triangle oscillator, 2 seconds

396 Hz triangle wave — calming, focus-associated. Triangle = softer overtone profile than sine (which sounds clinical) or sawtooth (too harsh). Fade in 100ms, hold 1.6s, fade out 300ms.

This tone plays at the exact moment the user taps "Start Focus". After 10-15 sessions, the tone alone triggers reflexive DMN (Default Mode Network) suppression (Pavlovian conditioning).

### 5. Body Doubling: Persona presence, not AI messages

**Alternatives:**
- Real-time AI-generated encouragement (expensive, needs API)
- Pre-scripted archetype phrases at milestones (chosen)
- No body doubling

**Choice: Pre-scripted archetype phrases**

5 phrases per archetype per language (EN/RU/AZ) at session milestones:
- `start` (session begins)
- `quarter` (25% elapsed)
- `half` (50% elapsed)
- `stretch` (75% elapsed)
- `done` (session complete)

Zero API calls. Zero latency. Aligns with Proteus Effect (user's archetype identity primed).

Presence indicator: animated dot (pulse when running, dim when idle/paused).

### 6. FocusScreen vertical slice: `features/focus/`

Follows existing architecture (ADR vertical slices). All focus-specific code lives in `features/focus/`:
- `index.jsx` — FocusScreen component
- `useFocusTimer.js` — timer hook
- `useFocusAudio.js` — audio hook
- `FocusTimer.jsx` — SVG arc visual component
- `BodyDoubling.jsx` — persona presence component

Features NEVER import from each other.

---

## Consequences

### Positive
- Focus Mode implemented with zero additional bundle cost (Web Audio API is browser-native)
- ADHD-safe: pause = feature, no shame, no countdown pressure
- Sonic Anchor creates Pavlovian conditioning over time (genuine behavioral tool)
- Proteus Effect activated via archetype presence during work
- Visual Time Timer (not digits) matches clinical evidence for ADHD time blindness

### Negative / Trade-offs
- Audio requires user gesture to start (browser autoplay policy) — acceptable; user must tap "Start Focus"
- Pink/brown noise is algorithmically generated, not Lo-Fi music — Lo-Fi requires audio files (post-MVP bolt)
- Binaural beats excluded from MVP — requires epilepsy disclaimer, stereo headphone enforcement (post-MVP)
- No nature sounds for break periods (post-MVP)

### Future bolts
- **Binaural beats** preset (Beta/Alpha/Theta) with epilepsy disclaimer modal
- **Lo-Fi audio** mode (audio files: lo-fi playlist)
- **Nature sounds** during BufferBlock breaks (ART theory)
- **Break audio** triggered by `data-buffer-slot="true"` hook (Bolt 5.1 TimelineView)

---

## Sprint checklist verification

| Requirement | Status |
|---|---|
| Visual Time Timer (SVG arc, not digits) | ✅ FocusTimer.jsx |
| Pause button | ✅ useFocusTimer pause/resume |
| Sprint selector: 5/25/45/90 min | ✅ SPRINT_OPTIONS |
| Persona Body Doubling | ✅ BodyDoubling.jsx |
| Focus Audio (pink + brown noise) | ✅ useFocusAudio.js |
| Sonic Anchor (2s tone on start) | ✅ playAnchor() |
| 500ms logarithmic fade | ✅ exponentialRampToValueAtTime |
| Hard limiter (safe listening) | ✅ HARD_LIMIT = 0.70 |
| Zero-distraction mode | ✅ BottomNav hidden, full-screen overlay |
| Break reminder on completion | ✅ showBreak screen |
| Completion animation (dopamine) | ✅ 🎉 celebration screen |
| No red colors | ✅ archetype color used throughout |
| No countdown timers | ✅ progress arc shows time remaining visually |
| Keyboard shortcuts (Space/Esc) | ✅ useEffect keydown handler |
