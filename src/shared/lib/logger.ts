/**
 * Centralized error logging — no silent failures.
 *
 * Every caught error flows through logError() so a future
 * observability hook (Sentry, PostHog) can be wired in one place.
 *
 * Ported from MindFlow logger.js → adapted for MindShift TypeScript.
 */

interface ErrorMeta {
  [key: string]: unknown
}

/**
 * Log a caught error with structured context.
 *
 * @param context  Human-readable location (e.g. "FocusScreen.handleSessionEnd")
 * @param error    The caught value (Error instance or primitive)
 * @param meta     Optional key/value bag (userId, screen, etc.)
 */
export function logError(context: string, error: unknown, meta: ErrorMeta = {}): void {
  const message = error instanceof Error ? error.message : String(error)
  const stack   = error instanceof Error ? error.stack   : undefined

  // Structured console output — easy to grep, easy to extend
  console.error(`[MindShift] ${context}:`, message, { ...meta, stack })

  // ── Future observability hook ───────────────────────────────────────────
  // Wire Sentry, PostHog, or custom analytics here:
  //
  // if (typeof window !== 'undefined' && (window as any).__ms_reportError) {
  //   (window as any).__ms_reportError({ context, message, stack, meta })
  // }
  // ──────────────────────────────────────────────────────────────────────
}

/**
 * Log an informational event (non-error).
 * Used for tracking significant user actions for analytics.
 */
export function logInfo(context: string, data: ErrorMeta = {}): void {
  if (import.meta.env.DEV) {
    console.info(`[MindShift] ${context}`, data)
  }
}
