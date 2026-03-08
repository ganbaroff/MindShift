# Bolt 5.2 — Focus Mode

**Date:** 2026-03-08
**Branch:** `claude/bolt-5-2`
**ADR:** 0018 — Focus Mode Architecture
**Build:** 158.03 kB gzip (+7.34 kB vs Bolt 5.1)
**Status:** ✅ Complete

---

## Goal

Implement ADHD-aware Focus Mode with:
- Visual Time Timer (SVG diminishing arc, clinical evidence)
- Pause/Resume (must-have per Forest anti-case study)
- Sprint presets: 5 / 25 / 45 / 90 min
- Persona Body Doubling (avatar works alongside during session)
- Focus Audio (pink/brown noise, Web Audio API)
- Sonic Anchor (Pavlovian conditioning tone at session start)
- Zero-distraction mode (BottomNav hidden during focus)
- Break screen on completion (dopamine celebration, not a new task)

---

## Acceptance Criteria

| AC | Description | Status |
|---|---|---|
| AC1 | FocusScreen renders as full-screen overlay (z-200) hiding BottomNav | ✅ |
| AC2 | Visual Time Timer: SVG arc diminishes from 100%→0%, no digits as primary | ✅ |
| AC3 | Sprint selector: 5/25/45/90 min; only active when idle/done | ✅ |
| AC4 | Pause/Resume — paused time accumulated accurately via Date.now() | ✅ |
| AC5 | Reset button — clears timer, stops audio, returns to idle | ✅ |
| AC6 | Sonic Anchor: 396 Hz triangle wave, 2s, plays at session start | ✅ |
| AC7 | Pink noise: Voss-McCartney algorithm, looped 2s buffer | ✅ |
| AC8 | Brown noise: Brownian integration, looped 2s buffer | ✅ |
| AC9 | 60 Hz HPF applied to all noise (LFN mitigation) | ✅ |
| AC10 | 500ms logarithmic fade on audio start/stop/mode change | ✅ |
| AC11 | Hard limiter: master GainNode ≤ 0.70 | ✅ |
| AC12 | Body Doubling: archetype avatar + archetype phrase at 5 milestones | ✅ |
| AC13 | Body Doubling: animated presence dot (pulse when running) | ✅ |
| AC14 | Break screen: celebration emoji + "take a breather" message | ✅ |
| AC15 | Focus launch button on TodayScreen (visible when tasks exist) | ✅ |
| AC16 | Keyboard: Space = pause/resume/start, Escape = close | ✅ |
| AC17 | Audio mode selector: pink/brown/off with visual feedback | ✅ |
| AC18 | Volume slider with live GainNode update (no stutter) | ✅ |
| AC19 | Focus Screen i18n: EN/RU/AZ | ✅ |
| AC20 | `npm run build` passes, 0 errors | ✅ |

---

## Files Created

| File | Description |
|---|---|
| `src/features/focus/index.jsx` | FocusScreen — full-screen focus mode overlay |
| `src/features/focus/useFocusTimer.js` | Hybrid Date.now()+rAF timer hook |
| `src/features/focus/useFocusAudio.js` | Web Audio API hook (pink/brown noise, sonic anchor) |
| `src/features/focus/FocusTimer.jsx` | SVG arc visual Time Timer component |
| `src/features/focus/BodyDoubling.jsx` | Persona body doubling presence component |
| `docs/bolts/adr/0018-focus-mode-architecture.md` | Architecture decision record |
| `docs/research/focus-audio-neuroscience.md` | Research reference (audio neuroscience) |
| `docs/research/neuroscience-adhd-flow-reference.md` | Research reference (flow/ADHD neuroscience) |
| `docs/research/competitive-market-analysis-2025.md` | Research reference (market analysis) |
| `docs/research/gamification-adhd-rpg-analysis.md` | Research reference (gamification/RPG) |

---

## Files Modified

| File | Change |
|---|---|
| `src/mindflow.jsx` | Import FocusScreen; `focusTask` state; hide BottomNav when active; `onStartFocus` prop to TodayScreen |
| `src/features/today/index.jsx` | Accept `onStartFocus` prop; "Focus Mode" launch button after TimelineView |
| `src/skeleton/design-system/global.css.js` | 4 new keyframe animations: `focusDoneRing`, `bodyDoublePulse`, `bodyDoubleBreath`, `focusSlideUp` |

---

## Architecture Notes

- **Entry:** `focusTask` state in `mindflow.jsx` — `null` = closed; `true` = open focus; `{task}` = task-focused
- **Timer:** `Date.now()` snapshots + `requestAnimationFrame` ticks. Pause accumulates `pausedMs`. No drift.
- **Audio:** `AudioContext` lazy-init on first user gesture. 2-sec looping `AudioBuffer` for noise. HPF at 60 Hz mandatory.
- **Body Doubling:** 5×4×3 phrase matrix (5 milestones × 4 archetypes × 3 languages). Zero API calls.
- **ADR 0017 hook preserved:** `data-buffer-slot="true"` on BufferBlock — future bolt can attach break audio here.

---

## Known Limitations (Post-MVP)

1. **Lo-Fi mode** — requires audio files (not generatable via Web Audio API). Post-MVP bolt.
2. **Binaural beats** — requires epilepsy disclaimer modal + stereo headphone check. Post-MVP.
3. **Nature sounds for breaks** — attach to `data-buffer-slot` DOM hook. Post-MVP.
4. **Burnout detection** — adaptive UI simplification based on behavioral signals. Post-MVP.

---

## Self-Assessment Score

**Bolt 5.2: 8.7 / 10**

Strengths:
- Neuroscience-driven decisions throughout (Time Timer, Sonic Anchor, HPF, logarithmic fade)
- Clean vertical slice, no cross-feature imports
- All 3 languages covered
- Audio architecture avoids bundle cost (zero assets, Web Audio API only)

Gaps vs ideal:
- No binaural beats (needs epilepsy disclaimer — correct decision to defer)
- No lo-fi mode (needs audio assets — correct to defer)
- Body Doubling phrases are minimal (could be richer in future iterations)
