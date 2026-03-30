/**
 * audioWorklet.ts — AudioWorklet loader with singleton promise cache.
 *
 * Guarantees the brown-noise worklet module is loaded exactly once per
 * AudioContext lifetime. Concurrent callers await the same promise.
 */

let workletLoaded = false
let workletLoadPromise: Promise<void> | null = null

export async function ensureWorklet(ctx: AudioContext): Promise<void> {
  if (workletLoaded) return
  if (!workletLoadPromise) {
    workletLoadPromise = ctx.audioWorklet
      .addModule('/audio-worklets/brown-noise-processor.js')
      .then(() => { workletLoaded = true })
      .catch(() => {
        workletLoadPromise = null
        throw new Error('AudioWorklet load failed — using buffer fallback')
      })
  }
  return workletLoadPromise
}
