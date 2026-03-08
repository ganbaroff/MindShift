import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './app/App'
import { logError } from '@/shared/lib/logger'

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
