import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useStore } from '@/store'
import { supabase } from '@/shared/lib/supabase'
import { AppShell } from './AppShell'
import { LoadingScreen } from '@/shared/ui/LoadingScreen'
import { AuthGuard } from './AuthGuard'
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary'
import { RecoveryProtocol } from '@/features/tasks/RecoveryProtocol'
import { RECOVERY_THRESHOLD_HOURS } from '@/shared/lib/constants'

// Lazy-loaded routes for code splitting
const AuthScreen       = lazy(() => import('@/features/auth/AuthScreen'))
const OnboardingFlow   = lazy(() => import('@/features/onboarding/OnboardingFlow'))
const HomeScreen       = lazy(() => import('@/features/home/HomeScreen'))
const FocusScreen      = lazy(() => import('@/features/focus/FocusScreen'))
const TasksScreen      = lazy(() => import('@/features/tasks/TasksScreen'))
const AudioScreen      = lazy(() => import('@/features/audio/AudioScreen'))
const ProgressScreen   = lazy(() => import('@/features/progress/ProgressScreen'))
const SettingsScreen   = lazy(() => import('@/features/settings/SettingsScreen'))

export default function App() {
  const { setUser, updateLastSession, lastSessionAt, recoveryShown, setRecoveryShown, onboardingCompleted } = useStore()

  // ── Auth listener ───────────────────────────────────────────────────────────
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user.id, session.user.email ?? '')
        updateLastSession()
      }
    })
    return () => subscription.unsubscribe()
  }, [setUser, updateLastSession])

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
            background: '#1A1D2E',
            border: '1px solid #2D3150',
            color: '#E8E8F0',
            fontSize: '14px',
          },
        }}
        offset={16}
      />
      <ErrorBoundary>
        <Suspense fallback={<LoadingScreen />}>
          {showRecovery && (
            <RecoveryProtocol onDismiss={setRecoveryShown} />
          )}
          <Routes>
            <Route path="/auth" element={<AuthScreen />} />
            <Route element={<AuthGuard />}>
              <Route path="/onboarding" element={<OnboardingFlow />} />
              <Route element={<AppShell />}>
                <Route index element={
                  onboardingCompleted
                    ? <HomeScreen />
                    : <Navigate to="/onboarding" replace />
                } />
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
