/**
 * Haptic feedback engine — ADHD-safe vibration patterns
 *
 * Research #1 (Sensory UX): Haptic feedback activates somatosensory cortex
 * (Cz, C3, C4), anchoring focus without overloading visual/auditory channels.
 *
 * Pattern design principles:
 *  - Short, low-frequency patterns: avoid startle response (cortisol spike)
 *  - Rhythmic breathe pattern: 0.2 BPM cadence for somatosensory focus anchoring
 *  - iOS: navigator.vibrate() silently does nothing (WebKit blocks it)
 *  - Android Chrome/Edge: full support after user gesture
 *
 * Gated by `hapticsEnabled` in the store — users can disable via Settings.
 * All functions fail silently — haptics are enhancement, never critical path.
 */

// Avoid circular dependency (store → taskSlice → notify → haptic → store) by
// letting the store register itself here rather than importing it directly.
type HapticsGetter = () => boolean
let _hapticsEnabled: HapticsGetter = () => true
export function _registerHapticsGetter(fn: HapticsGetter) { _hapticsEnabled = fn }

export function haptic(pattern: number | number[] = 150): void {
  try {
    if (!_hapticsEnabled()) return
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern)
    }
  } catch { /* non-critical */ }
}

// ── Confirmations ─────────────────────────────────────────────────────────────

/** Micro tap — button press, toggle */
export const hapticTap = () => haptic(10)

/** Task completed — satisfying double pulse */
export const hapticDone = () => haptic([15, 50, 25])

/** Achievement unlocked — celebration burst
 * Gaps widened to 60-70ms: LRA actuator needs ≥50ms to decay between pulses.
 * Sub-50ms gaps fuse into a single jarring buzz (unpleasant for ADHD). */
export const hapticWow = () => haptic([25, 60, 25, 70, 80])

// ── Attention ─────────────────────────────────────────────────────────────────

/** Gentle warning — avoid startle (no sharp spikes) */
export const hapticWarning = () => haptic([20, 40, 20, 40, 20])

/** Phase transition — focus phase change (struggle→release→flow) */
export const hapticPhase = () => haptic([8, 60, 8])

/** Session start — grounding pulse before focus.
 * Reduced initial burst 40→30ms: prevents startle reflex on LRA.
 * Longer silence (80→100ms) increases anticipation/grounding feel. */
export const hapticStart = () => haptic([30, 100, 20])

/** Session end — release signal.
 * Gaps widened to 60ms: 30ms was below LRA decay threshold. */
export const hapticEnd = () => haptic([18, 60, 18, 60, 60])

// ── Breathwork sync ───────────────────────────────────────────────────────────

/**
 * Rhythmic breathe pulse — synced with visual breathwork animation.
 * Research #1: 0.2 BPM haptic cadence → somatosensory cortex activation.
 * Use: pulse on inhale peak + exhale peak (called from BreathworkRitual).
 */
export const hapticBreathe = () => haptic(15)

// ── Snoooze / park ────────────────────────────────────────────────────────────

/** Task parked to NEXT — gentle "sliding" feel.
 * Gap 30→50ms: minimum for distinct pulse perception on LRA. */
export const hapticPark = () => haptic([8, 50, 8])

/** Task added to pool.
 * Gap 20→50ms: was below LRA decay threshold, pulses were fusing. */
export const hapticAdd = () => haptic([8, 50, 12])

/** Failed action / soft error — intentionally lighter than warning.
 * NEVER use OS error/reject haptic for ADHD users: those patterns are
 * designed to be aversive and trigger shame pathways. This is informational. */
export const hapticError = () => haptic([10, 20, 10])
