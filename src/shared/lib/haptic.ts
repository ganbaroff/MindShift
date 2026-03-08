// ── Haptic feedback (mobile PWA) ──────────────────────────────────────────────
// Wraps navigator.vibrate — fails silently on desktop / unsupported browsers.

export function haptic(pattern: number | number[] = 150): void {
  try {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern)
    }
  } catch { /* non-critical */ }
}

/** Short confirmation tap */
export const hapticTap   = () => haptic(80)

/** Medium success feedback */
export const hapticDone  = () => haptic([80, 40, 120])

/** Achievement unlock — longer pattern */
export const hapticWow   = () => haptic([100, 50, 100, 50, 200])
