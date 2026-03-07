/**
 * shared/lib/logger.js
 * Centralised error logging — INVARIANT 7 (coding-standards §7).
 *
 * Every async operation must have a loading state, error state, and success
 * state. No silent failures. All errors flow through logError() so a future
 * observability hook (Sentry, PostHog, custom analytics) can be wired in a
 * single place.
 *
 * Bolt 1.4: introduced 2026-03-07.
 */

/**
 * Log a caught error with structured context.
 *
 * @param {string} context  - Human-readable location (e.g. "DumpScreen.handleSubmit")
 * @param {unknown} error   - The caught value (Error instance or primitive)
 * @param {object} [meta]   - Optional key/value bag (userId, screen, etc.)
 */
export function logError(context, error, meta = {}) {
  const message = error instanceof Error ? error.message : String(error);
  const stack    = error instanceof Error ? error.stack  : undefined;

  // Structured console output — easy to grep, easy to extend.
  console.error(`[MindFlow] ${context}:`, message, { ...meta, stack });

  // ─── Future hook ──────────────────────────────────────────────────────────
  // Replace the block below with your observability service when ready:
  //
  // if (typeof window.__mf_reportError === "function") {
  //   window.__mf_reportError({ context, message, stack, meta });
  // }
  // ─────────────────────────────────────────────────────────────────────────
}
