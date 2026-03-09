/**
 * Centralized logger — no silent failures (INVARIANT 7).
 *
 * Architecture:
 *   logError → console.error (always) + Sentry.captureException (if DSN set)
 *   logInfo  → console.info  (dev)    + Sentry breadcrumb (prod w/ Sentry)
 *   logEvent → Plausible custom event (prod, privacy-first, no PII)
 *
 * Sentry is opt-in: set VITE_SENTRY_DSN in .env.local to enable.
 * Without it the app works identically — console only, zero external requests.
 */

import * as Sentry from '@sentry/react'

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,       // 10% of transactions — low overhead
    replaysSessionSampleRate: 0, // no session replay (privacy-first)
    replaysOnErrorSampleRate: 0,
    beforeSend(event) {
      // Strip PII before transmission
      if (event.user) delete event.user.email
      return event
    },
  })
}

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

  if (SENTRY_DSN) {
    Sentry.withScope((scope) => {
      scope.setTag('context', context)
      scope.setExtras(meta)
      scope.setLevel('error')
      Sentry.captureException(error instanceof Error ? error : new Error(message))
    })
  }
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

  if (SENTRY_DSN) {
    Sentry.addBreadcrumb({ category: context, data, level: 'info' })
  }
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
