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
 * All functions fail silently — haptics are enhancement, never critical path.
 */

export function haptic(pattern: number | number[] = 150): void {
  try {
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

/** Achievement unlocked — celebration burst */
export const hapticWow = () => haptic([30, 30, 30, 30, 80])

// ── Attention ─────────────────────────────────────────────────────────────────

/** Gentle warning — avoid startle (no sharp spikes) */
export const hapticWarning = () => haptic([20, 40, 20, 40, 20])

/** Phase transition — focus phase change (struggle→release→flow) */
export const hapticPhase = () => haptic([8, 60, 8])

/** Session start — grounding pulse before focus */
export const hapticStart = () => haptic([40, 80, 20])

/** Session end — release signal */
export const hapticEnd = () => haptic([20, 30, 20, 30, 60])

// ── Breathwork sync ───────────────────────────────────────────────────────────

/**
 * Rhythmic breathe pulse — synced with visual breathwork animation.
 * Research #1: 0.2 BPM haptic cadence → somatosensory cortex activation.
 * Use: pulse on inhale peak + exhale peak (called from BreathworkRitual).
 */
export const hapticBreathe = () => haptic(15)

// ── Snoooze / park ────────────────────────────────────────────────────────────

/** Task parked to NEXT — gentle "sliding" feel */
export const hapticPark = () => haptic([10, 30, 10])

/** Task added to pool */
export const hapticAdd = () => haptic([8, 20, 15])
