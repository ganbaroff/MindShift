/**
 * audioGain.ts — Volume mapping + constant-power crossfade curves
 *
 * Logarithmic gain mapping keeps perceived loudness perceptually linear.
 * Constant-power fade curves prevent "dip" when crossfading correlated noise.
 */

// ── Logarithmic volume mapping ────────────────────────────────────────────────

export const LOG_GAIN_MIN = 0.001  // 0% volume → ~40 dBA (nearly inaudible)
export const LOG_GAIN_MAX = 0.10   // 100% volume → ~70 dBA (safe all-day maximum)

/**
 * Maps normalized 0–1 UI slider value to a logarithmic gain.
 * Perceptually linear: each step feels equal in loudness.
 *   volume=0.00 → gain=0.001 (~silent)
 *   volume=0.47 → gain≈0.009 (default, ~50 dBA)
 *   volume=0.80 → gain≈0.040 (warning threshold)
 *   volume=1.00 → gain=0.100 (hard ceiling, ~70 dBA)
 */
export function volumeToGain(volume: number): number {
  const v = Math.max(0, Math.min(1, volume))
  return LOG_GAIN_MIN * Math.pow(LOG_GAIN_MAX / LOG_GAIN_MIN, v)
}

// ── Constant power crossfade curves ──────────────────────────────────────────

export const FADE_STEPS = 64

/** Sine curve 0→1: used for fade-in. Prevents "dip" on correlated-noise crossfades. */
export const FADE_IN_CURVE: Float32Array = (() => {
  const arr = new Float32Array(FADE_STEPS)
  for (let i = 0; i < FADE_STEPS; i++) {
    arr[i] = Math.sin((i / (FADE_STEPS - 1)) * Math.PI / 2)
  }
  return arr
})()

/** Cosine curve 1→0: used for fade-out. Mirror of fade-in for constant power. */
export const FADE_OUT_CURVE: Float32Array = (() => {
  const arr = new Float32Array(FADE_STEPS)
  for (let i = 0; i < FADE_STEPS; i++) {
    arr[i] = Math.cos((i / (FADE_STEPS - 1)) * Math.PI / 2)
  }
  return arr
})()
