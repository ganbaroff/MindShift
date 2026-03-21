import { lazy, Suspense, useEffect, useState, useMemo } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useStore } from '@/store'
import { supabase } from '@/shared/lib/supabase'
import { AppShell } from './AppShell'
import { LoadingScreen } from '@/shared/ui/LoadingScreen'
import { AuthGuard } from './AuthGuard'
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary'
import { writeLastActive, shouldShowContextRestore } from '@/features/tasks/contextRestoreUtils'
import { CookieBanner } from '@/shared/ui/CookieBanner'
import { RECOVERY_THRESHOLD_HOURS } from '@/shared/lib/constants'
import { useOfflineSync } from '@/shared/hooks/useOfflineSync'
import { useTaskSync } from '@/shared/hooks/useTaskSync'
import { useSessionHistory } from '@/shared/hooks/useSessionHistory'
import { logError } from '@/shared/lib/logger'
import { reminders } from '@/shared/lib/reminders'
import { computeBurnoutScore, deriveBehaviors } from '@/shared/lib/burnout'
import { useCalendarSync } from '@/shared/hooks/useCalendarSync'
import { useInAppReview } from '@/shared/hooks/useInAppReview'

const CONSENT_PENDING_KEY = 'ms_consent_pending'

// ── Lazy routes — Lovable redesign pages ───────────────────────────────────────
const PreviewScreen    = lazy(() => import('@/features/preview/PreviewScreen'))
const AuthScreen       = lazy(() => import('@/features/auth/AuthScreen'))
const OnboardingPage   = lazy(() => import('@/features/onboarding/OnboardingPage'))
const HomePage         = lazy(() => import('@/features/home/HomePage'))
const FocusPage        = lazy(() => import('@/features/focus/FocusScreen'))
const TasksPage        = lazy(() => import('@/features/tasks/TasksPage'))
const ProgressPage     = lazy(() => import('@/features/progress/ProgressPage'))
const SettingsPage     = lazy(() => import('@/features/settings/SettingsPage'))
const DueDateScreen    = lazy(() => import('@/features/calendar/DueDateScreen'))
const HistoryPage      = lazy(() => import('@/features/history/HistoryPage'))
const TodayPage        = lazy(() => import('@/features/today/TodayPage'))
const PrivacyPage      = lazy(() => import('@/features/legal/PrivacyPage'))
const TermsPage        = lazy(() => import('@/features/legal/TermsPage'))
const CookiePolicyPage = lazy(() => import('@/features/legal/CookiePolicyPage'))

const LazyRecoveryProtocol = lazy(() =>
  import('@/features/tasks/RecoveryProtocol').then(m => ({ default: m.RecoveryProtocol }))
)
const LazyContextRestore = lazy(() =>
  import('@/features/tasks/ContextRestore').then(m => ({ default: m.ContextRestore }))
)
const LazyShutdownRitual = lazy(() =>
  import('@/features/focus/ShutdownRitual').then(m => ({ default: m.ShutdownRitual }))
)
const LazyMonthlyReflection = lazy(() =>
  import('@/features/focus/MonthlyReflection').then(m => ({ default: m.MonthlyReflection }))
)
const LazyWeeklyPlanning = lazy(() =>
  import('@/features/focus/WeeklyPlanning').then(m => ({ default: m.WeeklyPlanning }))
)

export default function App() {
  const {
    setUser, updateLastSession, lastSessionAt, recoveryShown, setRecoveryShown,
    nowPool, nextPool, somedayPool,
    onboardingCompleted, setBurnoutScore, completedTotal, energyLevel,
    flexiblePauseUntil, setFlexiblePauseUntil,
    reducedStimulation,
    shutdownShownDate, setShutdownShownDate,
    monthlyReflectionShownMonth, setMonthlyReflectionShownMonth,
    weeklyPlanShownWeek, setWeeklyPlanShownWeek,
  } = useStore()
  const [showContextRestore, setShowContextRestore] = useState(false)
  const [showShutdown, setShowShutdown] = useState(false)
  const [showMonthly, setShowMonthly] = useState(false)
  const [showWeeklyPlan, setShowWeeklyPlan] = useState(false)

  useEffect(() => {
    document.documentElement.setAttribute(
      'data-mode',
      reducedStimulation ? 'calm' : 'normal'
    )
  }, [reducedStimulation])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        // If user explicitly signed out, don't auto-create guest — let them stay on /auth
        if (localStorage.getItem('ms_signed_out')) return
        const guestId = localStorage.getItem('ms_guest_id') ?? `guest_${crypto.randomUUID()}`
        localStorage.setItem('ms_guest_id', guestId)
        setUser(guestId, '')
        updateLastSession()
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        localStorage.removeItem('ms_signed_out')
        setUser(session.user.id, session.user.email ?? '')
        updateLastSession()

        // ── Google Calendar: store provider tokens on OAuth callback ──────────
        // Only store tokens + enable sync when returning from calendar-scope auth
        // (Settings toggle sets this flag before redirect)
        if (session.provider_token && localStorage.getItem('ms_calendar_pending')) {
          localStorage.removeItem('ms_calendar_pending')
          try {
            await supabase.functions.invoke('gcal-store-token', {
              body: {
                providerToken: session.provider_token,
                providerRefreshToken: session.provider_refresh_token ?? null,
                expiresIn: 3600, // Google tokens last 1 hour
              },
            })
            useStore.getState().setCalendarSyncEnabled(true)
          } catch (err) {
            logError('App.gcalTokenStore', err instanceof Error ? err : new Error(String(err)))
          }
        }

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
                if (error) logError('App.consentPersist', new Error(error.message))
                else localStorage.removeItem(CONSENT_PENDING_KEY)
              })
          }
        } catch { /* localStorage or JSON parse failure */ }
      }
    })
    return () => subscription.unsubscribe()
  }, [setUser, updateLastSession])

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

  useEffect(() => { reminders.restore() }, [])

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
    const rawScore = computeBurnoutScore(behaviors)
    // High emotional reactivity = feel burnout sooner (1.2x multiplier, capped at 100)
    const emotionalReactivity = useStore.getState().emotionalReactivity
    const adjustedScore = emotionalReactivity === 'high'
      ? Math.min(100, Math.round(rawScore * 1.2))
      : rawScore
    setBurnoutScore(adjustedScore)
  }, [completedTotal, energyLevel, nowPool, nextPool, somedayPool, setBurnoutScore])

  // Shutdown ritual — triggers once per day after 9pm when onboarding done
  useEffect(() => {
    if (!onboardingCompleted) return
    const hour = new Date().getHours()
    if (hour < 21) return
    const today = new Date().toISOString().split('T')[0]
    if (shutdownShownDate === today) return
    // Small delay so the main UI renders first
    const t = setTimeout(() => setShowShutdown(true), 1200)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboardingCompleted])

  // Monthly reflection — first 5 days of each new month, once per month
  useEffect(() => {
    if (!onboardingCompleted) return
    const now = new Date()
    const currentDay = now.getDate()
    const currentMonth = now.toISOString().slice(0, 7) // 'YYYY-MM'
    if (currentDay > 5) return
    if (monthlyReflectionShownMonth === currentMonth) return
    const t = setTimeout(() => setShowMonthly(true), 2000)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboardingCompleted])

  // Weekly planning ritual — Sunday 18pm+ or Monday before noon, once per ISO week
  useEffect(() => {
    if (!onboardingCompleted) return
    const now = new Date()
    const day = now.getDay()   // 0=Sun, 1=Mon
    const hour = now.getHours()
    const isSundayEvening = day === 0 && hour >= 18
    const isMondayMorning  = day === 1 && hour < 12
    if (!isSundayEvening && !isMondayMorning) return
    // ISO week key: YYYY-Www  (ISO week starts Mon — for Sunday use next week's key)
    const isoWeek = (() => {
      const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
      // For Sunday, advance 1 day so we get the upcoming week's key
      if (now.getDay() === 0) d.setUTCDate(d.getUTCDate() + 1)
      const dayNum = d.getUTCDay() || 7
      d.setUTCDate(d.getUTCDate() + 4 - dayNum)
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
      const weekNum = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
      return `${d.getUTCFullYear()}-W${weekNum.toString().padStart(2, '0')}`
    })()
    if (weeklyPlanShownWeek === isoWeek) return
    const timer = setTimeout(() => setShowWeeklyPlan(true), 2500)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboardingCompleted])

  useOfflineSync()
  useTaskSync()
  useSessionHistory()
  useCalendarSync()
  useInAppReview()

  const showRecovery = (() => {
    if (recoveryShown || !lastSessionAt) return false
    const hoursSinceLast = (Date.now() - new Date(lastSessionAt).getTime()) / 3_600_000
    return hoursSinceLast >= RECOVERY_THRESHOLD_HOURS
  })()

  const flexPauseActive = useMemo(() => {
    if (!flexiblePauseUntil) return false
    return new Date(flexiblePauseUntil) > new Date()
  }, [flexiblePauseUntil])

  const flexPauseUntilLabel = useMemo(() => {
    if (!flexiblePauseUntil) return ''
    return new Date(flexiblePauseUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }, [flexiblePauseUntil])

  return (
    <BrowserRouter>
      <Toaster
        theme="dark"
        position="top-center"
        toastOptions={{
          style: {
            background: '#1E2136',
            border: '1px solid rgba(255,255,255,0.06)',
            color: '#E8E8F0',
            fontSize: '14px',
          },
        }}
        offset={16}
      />
      <ErrorBoundary>
        <Suspense fallback={<LoadingScreen />}>

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

          {/* Shutdown ritual — end-of-day wind-down (9pm+, once per day) */}
          {!showRecovery && !showContextRestore && showShutdown && (
            <Suspense fallback={null}>
              <LazyShutdownRitual onDismiss={() => {
                setShowShutdown(false)
                const today = new Date().toISOString().split('T')[0]
                setShutdownShownDate(today)
              }} />
            </Suspense>
          )}

          {/* Monthly reflection — first 5 days of new month, once per month */}
          {!showRecovery && !showContextRestore && !showShutdown && showMonthly && (
            <Suspense fallback={null}>
              <LazyMonthlyReflection onDismiss={() => {
                setShowMonthly(false)
                const currentMonth = new Date().toISOString().slice(0, 7)
                setMonthlyReflectionShownMonth(currentMonth)
              }} />
            </Suspense>
          )}

          {/* Weekly planning — Sunday evening or Monday morning, once per ISO week */}
          {!showRecovery && !showContextRestore && !showShutdown && !showMonthly && showWeeklyPlan && (
            <Suspense fallback={null}>
              <LazyWeeklyPlanning onDismiss={() => {
                setShowWeeklyPlan(false)
                // Compute the same ISO week key as the trigger useEffect
                const now = new Date()
                const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
                if (now.getDay() === 0) d.setUTCDate(d.getUTCDate() + 1)
                const dayNum = d.getUTCDay() || 7
                d.setUTCDate(d.getUTCDate() + 4 - dayNum)
                const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
                const weekNum = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
                setWeeklyPlanShownWeek(`${d.getUTCFullYear()}-W${weekNum.toString().padStart(2, '0')}`)
              }} />
            </Suspense>
          )}

          <CookieBanner />

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
            <Route path="/preview"       element={<PreviewScreen />} />
            <Route path="/auth"          element={<AuthScreen />} />
            <Route path="/privacy"       element={<PrivacyPage />} />
            <Route path="/terms"         element={<TermsPage />} />
            <Route path="/cookie-policy" element={<CookiePolicyPage />} />

            <Route element={<AuthGuard />}>
              <Route path="/onboarding" element={<OnboardingPage />} />

              <Route element={<AppShell />}>
                <Route index element={<Navigate to="/today" replace />} />
                <Route path="/today" element={
                  <ErrorBoundary fallback={<RouteError label="Today" />}>
                    <TodayPage />
                  </ErrorBoundary>
                } />
                <Route path="/home" element={
                  <ErrorBoundary fallback={<RouteError label="Home" />}>
                    <HomePage />
                  </ErrorBoundary>
                } />
                <Route path="/focus" element={
                  <ErrorBoundary fallback={<RouteError label="Focus" />}>
                    <FocusPage />
                  </ErrorBoundary>
                } />
                <Route path="/tasks" element={
                  <ErrorBoundary fallback={<RouteError label="Tasks" />}>
                    <TasksPage />
                  </ErrorBoundary>
                } />
                <Route path="/calendar" element={
                  <ErrorBoundary fallback={<RouteError label="Upcoming" />}>
                    <DueDateScreen />
                  </ErrorBoundary>
                } />
                <Route path="/progress" element={
                  <ErrorBoundary fallback={<RouteError label="Progress" />}>
                    <ProgressPage />
                  </ErrorBoundary>
                } />
                <Route path="/settings" element={
                  <ErrorBoundary fallback={<RouteError label="Settings" />}>
                    <SettingsPage />
                  </ErrorBoundary>
                } />
                <Route path="/history" element={
                  <ErrorBoundary fallback={<RouteError label="History" />}>
                    <HistoryPage />
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

function RouteError({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6 text-center">
      <p className="text-base font-semibold" style={{ color: '#E8E8F0' }}>{label} had a hiccup</p>
      <p className="text-sm" style={{ color: '#8B8BA7' }}>Don't worry — your data is safe.</p>
      <a href="/" className="px-5 py-2.5 rounded-xl text-sm font-semibold"
        style={{ background: 'rgba(123,114,255,0.15)', border: '1.5px solid #7B72FF', color: '#7B72FF' }}>
        Go home
      </a>
    </div>
  )
}
