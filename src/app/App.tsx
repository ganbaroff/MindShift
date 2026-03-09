import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useStore } from '@/store'
import { supabase } from '@/shared/lib/supabase'
import { AppShell } from './AppShell'
import { LoadingScreen } from '@/shared/ui/LoadingScreen'
import { AuthGuard } from './AuthGuard'
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary'
import { RecoveryProtocol } from '@/features/tasks/RecoveryProtocol'
import { ContextRestore, writeLastActive, shouldShowContextRestore } from '@/features/tasks/ContextRestore'
import { CookieBanner } from '@/shared/ui/CookieBanner'
import { RECOVERY_THRESHOLD_HOURS } from '@/shared/lib/constants'
import { useOfflineSync } from '@/shared/hooks/useOfflineSync'
import { logError } from '@/shared/lib/logger'

// Key that AuthScreen writes before sending the magic link
const CONSENT_PENDING_KEY = 'ms_consent_pending'

// Lazy-loaded routes for code splitting
const AuthScreen       = lazy(() => import('@/features/auth/AuthScreen'))
const OnboardingFlow   = lazy(() => import('@/features/onboarding/OnboardingFlow'))
const HomeScreen       = lazy(() => import('@/features/home/HomeScreen'))
const FocusScreen      = lazy(() => import('@/features/focus/FocusScreen'))
const TasksScreen      = lazy(() => import('@/features/tasks/TasksScreen'))
const AudioScreen      = lazy(() => import('@/features/audio/AudioScreen'))
const ProgressScreen   = lazy(() => import('@/features/progress/ProgressScreen'))
const SettingsScreen   = lazy(() => import('@/features/settings/SettingsScreen'))
const PrivacyPage      = lazy(() => import('@/features/legal/PrivacyPage'))
const TermsPage        = lazy(() => import('@/features/legal/TermsPage'))
const CookiePolicyPage = lazy(() => import('@/features/legal/CookiePolicyPage'))

export default function App() {
  const { setUser, updateLastSession, lastSessionAt, recoveryShown, setRecoveryShown, nowPool, onboardingCompleted } = useStore()
  const [showContextRestore, setShowContextRestore] = useState(false)

  // ── Auth listener ───────────────────────────────────────────────────────────
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user.id, session.user.email ?? '')
        updateLastSession()

        // ── Persist pending consent to Supabase ──────────────────────────────
        // AuthScreen stores consent in localStorage before sending the magic link.
        // We pick it up here after the user clicks the link and is authenticated.
        try {
          const raw = localStorage.getItem(CONSENT_PENDING_KEY)
          if (raw) {
            const consent = JSON.parse(raw) as {
              terms_accepted_at: string
              terms_version:     string
              age_confirmed:     boolean
            }
            // Fire-and-forget upsert — non-critical path, failing open
            // `as never` matches the existing codebase pattern for Supabase payloads
            // (columns added in migration 005, types updated in database.ts)
            supabase
              .from('users')
              .update({
                terms_accepted_at: consent.terms_accepted_at,
                terms_version:     consent.terms_version,
                age_confirmed:     consent.age_confirmed,
              } as never)
              .eq('id', session.user.id)
              .then(({ error }) => {
                if (error) {
                  logError('App.consentPersist', new Error(error.message))
                } else {
                  // Clean up only after successful write
                  localStorage.removeItem(CONSENT_PENDING_KEY)
                }
              })
          }
        } catch {
          // localStorage or JSON parse failure — ignore, not critical
        }
      }
    })
    return () => subscription.unsubscribe()
  }, [setUser, updateLastSession])

  // ── "Where Was I?" context restoration ────────────────────────────────────
  // Write timestamp when page becomes hidden; check on show (return from background).
  // Only shown when user has onboarded + has active NOW tasks + returned after 30–72h absence.
  useEffect(() => {
    const hasActiveTasks = nowPool.some(t => t.status === 'active')

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        writeLastActive()
      } else if (document.visibilityState === 'visible') {
        if (onboardingCompleted && hasActiveTasks && shouldShowContextRestore()) {
          setShowContextRestore(true)
        }
        writeLastActive()
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [nowPool, onboardingCompleted])

  // ── Offline queue sync ──────────────────────────────────────────────────────
  useOfflineSync()

  // ── Recovery protocol detection ─────────────────────────────────────────────
  const showRecovery = (() => {
    if (recoveryShown || !lastSessionAt) return false
    const hoursSinceLast = (Date.now() - new Date(lastSessionAt).getTime()) / 3_600_000
    return hoursSinceLast >= RECOVERY_THRESHOLD_HOURS
  })()

  return (
    <BrowserRouter>
      <Toaster
        theme="dark"
        position="top-center"
        toastOptions={{
          style: {
            background: '#1E2136',
            border:     '1px solid rgba(255,255,255,0.06)',
            color:      '#E8E8F0',
            fontSize:   '14px',
          },
        }}
        offset={16}
      />
      <ErrorBoundary>
        <Suspense fallback={<LoadingScreen />}>
          {showRecovery && (
            <RecoveryProtocol onDismiss={setRecoveryShown} />
          )}

          {/* "Where Was I?" — context restore after 30–72h absence, non-blocking */}
          {!showRecovery && showContextRestore && (
            <ContextRestore onDismiss={() => setShowContextRestore(false)} />
          )}

          {/* Cookie notice — shown once on first visit, purely informational */}
          <CookieBanner />

          <Routes>
            {/* Public routes — no auth required */}
            <Route path="/auth"          element={<AuthScreen />} />
            <Route path="/privacy"       element={<PrivacyPage />} />
            <Route path="/terms"         element={<TermsPage />} />
            <Route path="/cookie-policy" element={<CookiePolicyPage />} />

            <Route element={<AuthGuard />}>
              {/* /onboarding — optional deep-setup, accessible from Settings */}
              <Route path="/onboarding" element={<OnboardingFlow />} />

              <Route element={<AppShell />}>
                {/*
                  Progressive disclosure: HomeScreen is ALWAYS the entry point.
                  New users see a QuickSetupCard embedded in HomeScreen —
                  no forced tutorial redirect (per ADHD UX research: progressive
                  disclosure beats wizard flows for neurodivergent users).
                */}
                <Route index          element={<HomeScreen />} />
                <Route path="/focus"    element={<FocusScreen />} />
                <Route path="/tasks"    element={<TasksScreen />} />
                <Route path="/audio"    element={<AudioScreen />} />
                <Route path="/progress" element={<ProgressScreen />} />
                <Route path="/settings" element={<SettingsScreen />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  )
}
