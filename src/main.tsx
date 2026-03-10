import * as Sentry from '@sentry/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './app/App'
import { logError } from '@/shared/lib/logger'

// ── Sentry init — must run before createRoot() ────────────────────────────────
// Captures React render errors, lazy-chunk failures, and unhandled rejections.
// No-op when VITE_SENTRY_DSN is not set (local dev without DSN, unit tests).
// Privacy: email stripped in beforeSend; no session replay.
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,       // 10% of transactions — low overhead
    replaysSessionSampleRate: 0, // no session replay (privacy-first)
    replaysOnErrorSampleRate: 0,
    beforeSend(event) {
      // Strip email PII before transmission (GDPR)
      if (event.user) delete event.user.email
      return event
    },
  })
}

// ── Vercel Analytics — GDPR-compliant, no cookies, 50k events/month free ─────
// Loaded dynamically so the app still works during local dev before npm install.
// Inject once; collects page views + custom events via `track()` from anywhere.
// TODO: run `npm install` after pulling — @vercel/analytics and web-vitals will resolve.
import('@vercel/analytics').then(({ inject }) => {
  inject({ mode: import.meta.env.PROD ? 'production' : 'development' })
}).catch(() => { /* not yet installed — no-op */ })

// ── Core Web Vitals — reported to Sentry as measurements ─────────────────────
// CLS, FCP, INP, LCP, TTFB: tracks rendering performance in real user sessions.
import('web-vitals').then(({ onCLS, onFCP, onINP, onLCP, onTTFB }) => {
  const report = (metric: { name: string; value: number }) => {
    if (SENTRY_DSN) {
      Sentry.setMeasurement(metric.name, metric.value, metric.name === 'CLS' ? '' : 'millisecond')
    }
    if (import.meta.env.DEV) console.debug(`[web-vitals] ${metric.name}: ${metric.value}`)
  }
  onCLS(report); onFCP(report); onINP(report); onLCP(report); onTTFB(report)
}).catch(() => { /* not yet installed — no-op */ })

// ── TanStack Query client ─────────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
})

// ── Global error handlers — capture what React's ErrorBoundary misses ─────────
// Unhandled promise rejections: offline Supabase writes, audio API, SW messages
window.addEventListener('unhandledrejection', (event) => {
  logError('window.unhandledrejection', event.reason, { type: 'unhandledrejection' })
  // NOTE: do NOT preventDefault() — DevTools still surfaces these in dev
})
// Synchronous JS errors outside React tree (e.g. SW registration failures)
window.addEventListener('error', (event) => {
  if (event.error) {
    logError('window.error', event.error, { type: 'globalError', filename: event.filename })
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      {/* <Toaster> lives in App.tsx — single instance only */}
    </QueryClientProvider>
  </StrictMode>,
)
