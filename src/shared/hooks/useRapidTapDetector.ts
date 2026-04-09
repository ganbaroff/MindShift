/**
 * useRapidTapDetector — Easter egg trigger hook
 *
 * Returns an `onTap` handler to attach to any button.
 * Fires `onTriggered` when the user taps ≥ threshold times
 * within windowMs milliseconds.
 *
 * Cooldown: once triggered, the detector is silent for cooldownMs (default 30s).
 * Reset: tap sequence resets if the gap between taps exceeds windowMs.
 */

import { useRef, useCallback } from 'react'

interface UseRapidTapDetectorOptions {
  threshold?: number   // default 7
  windowMs?: number    // default 3000
  cooldownMs?: number  // default 30000
  onTriggered: () => void
}

export function useRapidTapDetector({
  threshold = 7,
  windowMs = 3000,
  cooldownMs = 30_000,
  onTriggered,
}: UseRapidTapDetectorOptions) {
  const taps = useRef<number[]>([])
  const lastTriggered = useRef<number>(0)

  const onTap = useCallback(() => {
    const now = Date.now()

    // Still in cooldown — ignore
    if (now - lastTriggered.current < cooldownMs) return

    // Prune taps older than the window
    taps.current = taps.current.filter(t => now - t < windowMs)
    taps.current.push(now)

    if (taps.current.length >= threshold) {
      taps.current = []
      lastTriggered.current = now
      onTriggered()
    }
  }, [threshold, windowMs, cooldownMs, onTriggered])

  return { onTap }
}
