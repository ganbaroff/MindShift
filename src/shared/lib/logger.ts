/**
 * Centralized logger — no silent failures (INVARIANT 7).
 *
 * Architecture:
 *   logError → console.error (always) + Sentry.captureException (if init'd)
 *   logInfo  → console.info  (dev)    + Sentry breadcrumb (prod w/ Sentry)
 *   logEvent → Plausible custom event (prod, privacy-first, no PII)
 *
 * Sentry.init() is called in main.tsx BEFORE rendering — this file only
 * uses the already-initialized Sentry client. Sentry.captureException is
 * a safe no-op when Sentry has not been initialized (no VITE_SENTRY_DSN).
 */

import * as Sentry from '@sentry/react'

interface ErrorMeta { [key: string]: unknown }

/**
 * Log a caught error with structured context.
 * INVARIANT 7: every catch block must call this — no silent failures.
 *
 * @param context  Dot-path location: "FeatureName.handlerName"
 * @param error    The caught value (Error instance or primitive)
 * @param meta     Optional key/value bag — NEVER include PII (email, name, etc.)
 */
export function logError(context: string, error: unknown, meta: ErrorMeta = {}): void {
  const message = error instanceof Error ? error.message : String(error)
  const stack   = error instanceof Error ? error.stack   : undefined

  console.error(`[MindShift] ${context}:`, message, { ...meta, stack })

  // Sentry.captureException is a safe no-op if Sentry.init() was not called
  Sentry.withScope((scope) => {
    scope.setTag('context', context)
    scope.setExtras(meta)
    scope.setLevel('error')
    Sentry.captureException(error instanceof Error ? error : new Error(message))
  })
}

/**
 * Log an informational event.
 * Dev: console.info. Prod + Sentry: breadcrumb for error correlation.
 * Safe to call frequently — negligible cost without Sentry.
 */
export function logInfo(context: string, data: ErrorMeta = {}): void {
  if (import.meta.env.DEV) {
    console.info(`[MindShift] ${context}`, data)
  }

  Sentry.addBreadcrumb({ category: context, data, level: 'info' })
}

/**
 * Track a Plausible custom event — privacy-first, aggregate only, no PII.
 * No-ops if Plausible script is not loaded.
 *
 * @param name   e.g. "task_completed", "focus_session_started", "audio_preset_changed"
 * @param props  Non-PII dimensions only: preset name, duration bucket, etc.
 */
export function logEvent(name: string, props?: Record<string, string | number>): void {
  try {
    type PlausibleFn = (event: string, options?: { props?: Record<string, string | number> }) => void
    const w = window as Window & { plausible?: PlausibleFn }
    w.plausible?.(name, { props })
  } catch {
    // Analytics failures never bubble to the user
  }
}
