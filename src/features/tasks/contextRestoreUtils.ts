/**
 * contextRestoreUtils — thin helpers for the "Where Was I?" feature.
 *
 * Extracted to their own module so App.tsx can import them eagerly
 * (they're called in a visibilitychange handler on every page)
 * while the ContextRestore *component* stays in a lazy chunk.
 */

const LAST_ACTIVE_KEY = 'ms_last_active'
const CONTEXT_RESTORE_MIN_MS = 30 * 60 * 1000        // 30 min
const CONTEXT_RESTORE_MAX_MS = 72 * 60 * 60 * 1000   // 72 h (above = RecoveryProtocol)

export function writeLastActive(): void {
  try { localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now())) } catch { /* ignore */ }
}

export function shouldShowContextRestore(): boolean {
  try {
    const raw = localStorage.getItem(LAST_ACTIVE_KEY)
    if (!raw) return false
    const elapsed = Date.now() - Number(raw)
    return elapsed >= CONTEXT_RESTORE_MIN_MS && elapsed < CONTEXT_RESTORE_MAX_MS
  } catch {
    return false
  }
}
