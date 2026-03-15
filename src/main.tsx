import * as Sentry from '@sentry/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './app/App'
import { logError } from '@/shared/lib/logger'

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined

const initSentry = () => {
  if (!SENTRY_DSN) return
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    beforeSend(event) {
      if (event.user) delete event.user.email
      return event
    },
  })
}

if (typeof requestIdleCallback !== 'undefined') {
  requestIdleCallback(initSentry, { timeout: 2_000 })
} else {
  setTimeout(initSentry, 0)
}

import('@vercel/analytics').then(({ inject }) => {
  inject({ mode: import.meta.env.PROD ? 'production' : 'development' })
}).catch(() => { /* not installed — no-op */ })

import('web-vitals').then(({ onCLS, onFCP, onINP, onLCP, onTTFB }) => {
  const report = (metric: { name: string; value: number }) => {
    if (SENTRY_DSN) {
      Sentry.setMeasurement(metric.name, metric.value, metric.name === 'CLS' ? '' : 'millisecond')
    }
    if (import.meta.env.DEV) console.debug(`[web-vitals] ${metric.name}: ${metric.value}`)
  }
  onCLS(report); onFCP(report); onINP(report); onLCP(report); onTTFB(report)
}).catch(() => { /* not installed — no-op */ })

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
})

window.addEventListener('unhandledrejection', (event) => {
  logError('window.unhandledrejection', event.reason, { type: 'unhandledrejection' })
})
window.addEventListener('error', (event) => {
  if (event.error) {
    logError('window.error', event.error, { type: 'globalError', filename: event.filename })
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
