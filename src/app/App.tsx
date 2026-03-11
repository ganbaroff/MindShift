import { lazy, Suspense, useEffect, useState, useMemo } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useStore } from '@/store'
import { supabase } from '@/shared/lib/supabase'
import { AppShell } from './AppShell'
import { LoadingScreen } from '@/shared/ui/LoadingScreen'
import { AuthGuard } from './AuthGuard'
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary'
// Utility helpers (tiny, eagerly loaded — used in visibilitychange handler)
import { writeLastActive, shouldShowContextRestore } from '@/features/tasks/contextRestoreUtils'
import { CookieBanner } from '@/shared/ui/CookieBanner'
import { RECOVERY_THRESHOLD_HOURS } from '@/shared/lib/constants'
import { useOfflineSync } from '@/shared/hooks/useOfflineSync'
import { logError } from '@/shared/lib/logger'
import { reminders } from '@/shared/lib/reminders'
import { computeBurnoutScore, deriveBehaviors } from '@/shared/lib/burnout'

// Key that AuthScreen writes before sending the magic link
const CONSENT_PENDING_KEY = 'ms_consent_pending'

// ── Lazy-loaded routes — each becomes a separate JS chunk ──────────────────────
const AuthScreen       = lazy(() => import('@/features/auth/AuthScreen'))
const OnboardingFlow   = lazy(() => import('@/features/onboarding/OnboardingFlow'))
const HomeScreen       = lazy(() => import('@/features/home/HomeScreen'))
const FocusScreen      = lazy(() => import('@/features/focus/FocusScreen'))
const TasksScreen      = lazy(() => import('@/features/tasks/TasksScreen'))
const AudioScreen      = lazy(() => import('@/features/audio/AudioScreen'))
const ProgressScreen   = lazy(() => import('@/features/progress/ProgressScreen'))
const CalendarScreen   = lazy(() => import('@/features/calendar/CalendarScreen'))
const SettingsScreen   = lazy(() => import('@/features/settings/SettingsScreen'))
const PrivacyPage      = lazy(() => import('@/features/legal/PrivacyPage'))
const TermsPage        = lazy(() => import('@/features/legal/TermsPage'))
const CookiePolicyPage = lazy(() => import('@/features/legal/CookiePolicyPage'))

// ── Conditional overlays — lazy chunks (shown in < 2% of sessions) ────────────
// RecoveryProtocol: only after 72h+ absence. ContextRestore: 30–72h absence.
// Lazy-loading saves ~5–8 KB from the main bundle for typical sessions.
const LazyRecoveryProtocol = lazy(() =>
  import('@/features/tasks/RecoveryProtocol').then(m => ({ default: m.RecoveryProtocol }))
)
const LazyContextRestore = lazy(() =>
  import('@/features/tasks/ContextRestore').then(m => ({ default: m.ContextRestore }))
)

export default function App() {
  const {
    setUser, updateLastSession, lastSessionAt, recoveryShown, setRecoveryShown,
    nowPool, nextPool, somedayPool,
    onboardingCompleted, setBurnoutScore, completedTotal, energyLevel,
    flexiblePauseUntil, setFlexiblePauseUntil,
    reducedStimulation,
  } = useStore()
  const [showContextRestore, setShowContextRestore] = useState(false)

  // ── Calm mode: set data-mode attribute on <html> for CSS variable overrides ──
  // Components using CSS vars get theme switching instantly (no JS re-render).
  useEffect(() => {
    document.documentElement.setAttribute(
      'data-mode',
      reducedStimulation ? 'calm' : 'normal'
    )
  }, [reducedStimulation])

  // ── Auth listener ───────────────────────────────────────────────────────────
  useEffect(() => {
    // Guest mode: set a stable local ID so tasks, sessions, XP all persist across reloads
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        const guestId = localStorage.getItem('ms_guest_id') ?? `guest_${crypto.randomUUID()}`
        localStorage.setItem('ms_guest_id', guestId)
        setUser(guestId, '')
        updateLastSession()
      }
    })

    // Real session (Google OAuth, magic link) takes priority over guest
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user.id, session.user.email ?? '')
        updateLastSession()

        // ── Persist pending consent to Supabase ──────────────────────────────
        try {
          const raw = localStorage.getItem(CONSENT_PENDING_KEY)
          if (raw) {
            const consent = JSON.parse(raw) as {
              terms_accepted_at: string
              terms_version:     string
              age_confirmed:     boolean
            }
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
                  localStorage.removeItem(CONSENT_PENDING_KEY)
                }
              })
          }
        } catch {
          // localStorage or JSON parse failure — ignore
        }
      }
    })
    return () => subscription.unsubscribe()
  }, [setUser, updateLastSession])

  // ── "Where Was I?" context restoration ────────────────────────────────────
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

  // ── Reminders restore on mount ─────────────────────────────────────────────
  useEffect(() => {
    reminders.restore()
  }, [])

  // ── Burnout score computation — Block 2 ──────────────────────────────────
  useEffect(() => {
    const allTasks = [...nowPool, ...nextPool, ...somedayPool]
    const activeTasks = allTasks.filter(t => t.status === 'active')
    const snoozedCount = allTasks.reduce((acc, t) => acc + t.snoozeCount, 0)
    const avgCompletedPerDay = completedTotal / 7
    const recentAvgEnergy = energyLevel

    const behaviors = deriveBehaviors({
      snoozedCount,
      activeCount: Math.max(activeTasks.length, 1),
      recentCompletedPerDay: avgCompletedPerDay * (recentAvgEnergy / 3),
      avgCompletedPerDay,
      recentSessionMinutes: 20 * (recentAvgEnergy / 3),
      avgSessionMinutes: 20,
      recentAvgEnergy,
    })

    setBurnoutScore(computeBurnoutScore(behaviors))
  }, [completedTotal, energyLevel, nowPool, nextPool, somedayPool, setBurnoutScore])

  // ── Offline queue sync ──────────────────────────────────────────────────────
  useOfflineSync()

  // ── Recovery protocol detection ─────────────────────────────────────────────
  const showRecovery = (() => {
    if (recoveryShown || !lastSessionAt) return false
    const hoursSinceLast = (Date.now() - new Date(lastSessionAt).getTime()) / 3_600_000
    return hoursSinceLast >= RECOVERY_THRESHOLD_HOURS
  })()

  // ── Flexible Pause — Block 4b ───────────────────────────────────────────────
  const flexPauseActive = useMemo(() => {
    if (!flexiblePauseUntil) return false
    return new Date(flexiblePauseUntil) > new Date()
  }, [flexiblePauseUntil])

  const flexPauseUntilLabel = useMemo(() => {
    if (!flexiblePauseUntil) return ''
    const d = new Date(flexiblePauseUntil)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }, [flexiblePauseUntil])

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

          {/* ── Conditional overlays — lazy chunks, null fallback ─────────── */}
          {showRecovery && (
            <Suspense fallback={null}>
              <LazyRecoveryProtocol onDismiss={setRecoveryShown} />
            </Suspense>
          )}

          {!showRecovery && showContextRestore && (
            <Suspense fallback={null}>
              <LazyContextRestore onDismiss={() => setShowContextRestore(false)} />
            </Suspense>
          )}

          {/* Cookie notice — shown once on first visit, purely informational */}
          <CookieBanner />

          {/* Flexible Pause banner — Block 4b */}
          {flexPauseActive && (
            <div
              className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-2.5"
              style={{
                background: 'linear-gradient(90deg, rgba(123,114,255,0.18) 0%, rgba(78,205,196,0.10) 100%)',
                borderBottom: '1px solid rgba(123,114,255,0.25)',
                backdropFilter: 'blur(8px)',
              }}
              role="status"
              aria-label="Rest mode active"
            >
              <p className="text-xs font-medium" style={{ color: '#E8E8F0' }}>
                🌙 Rest mode active until {flexPauseUntilLabel}
              </p>
              <button
                onClick={() => setFlexiblePauseUntil(null)}
                className="text-xs px-3 py-1 rounded-lg transition-all duration-200"
                style={{
                  background: 'rgba(123,114,255,0.15)',
                  border: '1px solid rgba(123,114,255,0.35)',
                  color: '#7B72FF',
                }}
              >
                Wake up early
              </button>
            </div>
          )}

          <Routes>
            {/* Public routes — no auth required */}
            <Route path="/auth"          element={<AuthScreen />} />
            <Route path="/privacy"       element={<PrivacyPage />} />
            <Route path="/terms"         element={<TermsPage />} />
            <Route path="/cookie-policy" element={<CookiePolicyPage />} />

            <Route element={<AuthGuard />}>
              <Route path="/onboarding" element={<OnboardingFlow />} />

              <Route element={<AppShell />}>
                {/*
                  Per-route error boundaries: if one screen crashes, the rest of
                  the app stays functional (the BottomNav remains accessible).
                */}
                <Route index element={
                  <ErrorBoundary fallback={<RouteError label="Home" />}>
                    <HomeScreen />
                  </ErrorBoundary>
                } />
                <Route path="/focus" element={
                  <ErrorBoundary fallback={<RouteError label="Focus" />}>
                    <FocusScreen />
                  </ErrorBoundary>
                } />
                <Route path="/tasks" element={
                  <ErrorBoundary fallback={<RouteError label="Tasks" />}>
                    <TasksScreen />
                  </ErrorBoundary>
                } />
                <Route path="/audio" element={
                  <ErrorBoundary fallback={<RouteError label="Audio" />}>
                    <AudioScreen />
                  </ErrorBoundary>
                } />
                <Route path="/calendar" element={
                  <ErrorBoundary fallback={<RouteError label="Calendar" />}>
                    <CalendarScreen />
                  </ErrorBoundary>
                } />
                <Route path="/progress" element={
                  <ErrorBoundary fallback={<RouteError label="Progress" />}>
                    <ProgressScreen />
                  </ErrorBoundary>
                } />
                <Route path="/settings" element={
                  <ErrorBoundary fallback={<RouteError label="Settings" />}>
                    <SettingsScreen />
                  </ErrorBoundary>
                } />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  )
}

// ── Per-route fallback ─────────────────────────────────────────────────────────
function RouteError({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6 text-center">
      <p className="text-base font-semibold" style={{ color: '#E8E8F0' }}>
        {label} had a hiccup
      </p>
      <p className="text-sm" style={{ color: '#8B8BA7' }}>
        Don't worry — your data is safe. Try navigating away and back.
      </p>
      <a
        href="/"
        className="px-5 py-2.5 rounded-xl text-sm font-semibold"
        style={{ background: 'rgba(123,114,255,0.15)', border: '1.5px solid #7B72FF', color: '#7B72FF' }}
      >
        Go home
      </a>
    </div>
  )
}
