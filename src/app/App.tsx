import { lazy, Suspense, useEffect, useState, useMemo } from 'react'
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
import { reminders } from '@/shared/lib/reminders'
import { computeBurnoutScore, deriveBehaviors } from '@/shared/lib/burnout'

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
const CalendarScreen   = lazy(() => import('@/features/calendar/CalendarScreen'))
const SettingsScreen   = lazy(() => import('@/features/settings/SettingsScreen'))
const PrivacyPage      = lazy(() => import('@/features/legal/PrivacyPage'))
const TermsPage        = lazy(() => import('@/features/legal/TermsPage'))
const CookiePolicyPage = lazy(() => import('@/features/legal/CookiePolicyPage'))

export default function App() {
  const {
    setUser, updateLastSession, lastSessionAt, recoveryShown, setRecoveryShown,
    nowPool, nextPool, somedayPool,
    onboardingCompleted, setBurnoutScore, completedTotal, energyLevel,
    flexiblePauseUntil, setFlexiblePauseUntil,
  } = useStore()
  const [showContextRestore, setShowContextRestore] = useState(false)

  // ── Auth listener ───────────────────────────────────────────────────────────
  // Handles both Google OAuth (coming soon) and the legacy magic-link flow.
  // In bypass mode, this sets a persistent guest ID so all local features work.
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

  // ── Reminders restore on mount ─────────────────────────────────────────────
  // Re-arms all persisted reminders after page reload (timeouts are session-only).
  useEffect(() => {
    reminders.restore()
  }, [])

  // ── Burnout score computation — Block 2 ──────────────────────────────────
  // Runs on mount + when key signals change. Client-side only, no server call.
  useEffect(() => {
    const allTasks = [...nowPool, ...nextPool, ...somedayPool]
    const activeTasks = allTasks.filter(t => t.status === 'active')
    const snoozedCount = allTasks.reduce((acc, t) => acc + t.snoozeCount, 0)

    // Approximate daily completed count from lifetime total (no day breakdown in store)
    // Use completedTotal as a proxy: assume uniform distribution over 7 days
    const avgCompletedPerDay = completedTotal / 7

    // For recent vs avg, use a conservative proxy since we don't have time-series in store
    // When completedTotal is very low, assume no decay; when high, use energy as decay signal
    const recentAvgEnergy = energyLevel  // use current energy as proxy

    const behaviors = deriveBehaviors({
      snoozedCount,
      activeCount: Math.max(activeTasks.length, 1),
      recentCompletedPerDay: avgCompletedPerDay * (recentAvgEnergy / 3),
      avgCompletedPerDay,
      recentSessionMinutes: 20 * (recentAvgEnergy / 3),  // conservative proxy
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
  // Non-blocking rest-mode banner. Shown when user set a 24h pause in Settings.
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
          {showRecovery && (
            <RecoveryProtocol onDismiss={setRecoveryShown} />
          )}

          {/* "Where Was I?" — context restore after 30–72h absence, non-blocking */}
          {!showRecovery && showContextRestore && (
            <ContextRestore onDismiss={() => setShowContextRestore(false)} />
          )}

          {/* Cookie notice — shown once on first visit, purely informational */}
          <CookieBanner />

          {/* Flexible Pause banner — Block 4b: gentle rest-mode indicator, non-blocking */}
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
                <Route path="/calendar" element={<CalendarScreen />} />
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
