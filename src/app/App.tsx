import { lazy, Suspense, useEffect, useMemo, useRef } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useStore } from '@/store'
import { supabase } from '@/shared/lib/supabase'
import { AppShell } from './AppShell'
import { LoadingScreen } from '@/shared/ui/LoadingScreen'
import { AuthGuard } from './AuthGuard'
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary'
import { useOverlayState } from '@/shared/hooks/useOverlayState'
import { CookieBanner } from '@/shared/ui/CookieBanner'
import { useOfflineSync } from '@/shared/hooks/useOfflineSync'
import { useTaskSync } from '@/shared/hooks/useTaskSync'
import { useSessionHistory } from '@/shared/hooks/useSessionHistory'
import { logError, logEvent } from '@/shared/lib/logger'
import { sendStreakUpdate, isVolauraConfigured } from '@/shared/lib/volaura-bridge'
import { reminders } from '@/shared/lib/reminders'
import { computeBurnoutScore, deriveBehaviors } from '@/shared/lib/burnout'
import { RECOVERY_THRESHOLD_HOURS } from '@/shared/lib/constants'
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
const LazyFirstFocusTutorial = lazy(() =>
  import('@/features/tutorial/FirstFocusTutorial')
)

export default function App() {
  const {
    setUser, updateLastSession,
    nowPool, nextPool, somedayPool,
    onboardingCompleted, setBurnoutScore, completedTotal, energyLevel,
    emotionalReactivity,
    setFlexiblePauseUntil,
    reducedStimulation, userTheme, firstFocusTutorialCompleted,
    setRecoveryShown,
    currentStreak, userId,
    _hasHydrated,
  } = useStore()

  const {
    showRecovery,
    flexPauseActive, flexPauseUntilLabel,
    showContextRestore, showShutdown, showMonthly, showWeeklyPlan,
    dismissContextRestore, dismissShutdown, dismissMonthly, dismissWeeklyPlan,
    wasRecentlyInRoom, lastRoomCode,
  } = useOverlayState()

  useEffect(() => {
    document.documentElement.setAttribute(
      'data-mode',
      reducedStimulation ? 'calm' : 'normal'
    )
  }, [reducedStimulation])

  // ── Apply theme to DOM ──────────────────────────────────────────────────────
  useEffect(() => {
    const resolved = userTheme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
      : userTheme
    document.documentElement.setAttribute('data-theme', resolved)
    // Sync browser chrome color with theme
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', resolved === 'light' ? '#F5F3EE' : '#0F1117')
  }, [userTheme])

  useEffect(() => {
    // authStateResolved prevents a race where getSession() returns null during
    // token refresh, briefly creating a guest, before onAuthStateChange fires
    // with the real user. We only create a guest after auth state is confirmed.
    let authStateResolved = false

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      authStateResolved = true
      if (session?.user) {
        localStorage.removeItem('ms_signed_out')
        setUser(session.user.id, session.user.email ?? '')

        // Sync subscription tier from DB so store reflects real state on any device
        void supabase
          .from('users')
          .select('subscription_tier, trial_ends_at')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            const row = data as { subscription_tier?: string; trial_ends_at?: string | null } | null
            if (row?.subscription_tier) {
              useStore.getState().setSubscription(
                row.subscription_tier as 'free' | 'pro_trial' | 'pro',
                row.trial_ends_at ?? null
              )
            }
          })

        // Guard: don't reset lastSessionAt when the recovery protocol should show.
        // RecoveryProtocol uses lastSessionAt to compute daysAbsent — calling
        // updateLastSession() here would zero out the 72h gap before the overlay renders.
        // updateLastSession() is called instead from the RecoveryProtocol onDismiss handler.
        const s = useStore.getState()
        const isLongAbsence = s.lastSessionAt && !s.recoveryShown &&
          (Date.now() - new Date(s.lastSessionAt).getTime()) / 3_600_000 >= RECOVERY_THRESHOLD_HOURS
        if (!isLongAbsence) updateLastSession()

        // Analytics: track return after 2+ day gap (below recovery threshold)
        if (s.lastSessionAt && !isLongAbsence) {
          const gapDays = (Date.now() - new Date(s.lastSessionAt).getTime()) / 86_400_000
          if (gapDays >= 2) logEvent('return_after_gap', { gap_days: Math.floor(gapDays) })
        }

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
      } else {
        // No session — create guest unless user explicitly signed out
        if (!localStorage.getItem('ms_signed_out')) {
          const guestId = localStorage.getItem('ms_guest_id') ?? `guest_${crypto.randomUUID()}`
          localStorage.setItem('ms_guest_id', guestId)
          setUser(guestId, '')
          updateLastSession()
        }
      }
    })

    // Fallback: if onAuthStateChange never fires (network issue, Supabase cold start),
    // create guest after a short delay so the app is usable offline.
    const fallbackTimer = setTimeout(() => {
      if (!authStateResolved && !localStorage.getItem('ms_signed_out')) {
        const guestId = localStorage.getItem('ms_guest_id') ?? `guest_${crypto.randomUUID()}`
        localStorage.setItem('ms_guest_id', guestId)
        setUser(guestId, '')
        updateLastSession()
      }
    }, 2000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(fallbackTimer)
    }
  }, [setUser, updateLastSession])

  useEffect(() => { reminders.restore() }, [])

  // ── Re-engagement signal — fires once per app-open after a ≥1-day gap ──────
  // Moved from TodayPage so direct-to-/focus and push-notification deep-link
  // users are counted correctly in Day-3/Day-7 retention cohorts.
  useEffect(() => {
    if (!_hasHydrated) return
    const { lastActiveDate, installDate } = useStore.getState()
    if (!lastActiveDate) return
    const gapDays = Math.floor((Date.now() - new Date(lastActiveDate).getTime()) / 86_400_000)
    if (gapDays < 1) return
    const daysSinceInstall = installDate
      ? Math.floor((Date.now() - new Date(installDate).getTime()) / 86_400_000)
      : undefined
    logEvent('user_returned', {
      gap_days: gapDays,
      day_of_week: new Date().getDay(),
      entry_route: window.location.pathname,
      ...(daysSinceInstall != null && { days_since_install: daysSinceInstall }),
    })
  }, [_hasHydrated])

  // Scalar summaries — limits burnout re-computation to actual data changes, not array identity churn
  const poolSnoozedCount = useMemo(
    () => [...nowPool, ...nextPool, ...somedayPool].reduce((acc, t) => acc + t.snoozeCount, 0),
    [nowPool, nextPool, somedayPool]
  )
  const poolActiveCount = useMemo(
    () => [...nowPool, ...nextPool, ...somedayPool].filter(t => t.status === 'active').length,
    [nowPool, nextPool, somedayPool]
  )

  useEffect(() => {
    const avgCompletedPerDay = completedTotal / 7
    const behaviors = deriveBehaviors({
      snoozedCount: poolSnoozedCount,
      activeCount: Math.max(poolActiveCount, 1),
      recentCompletedPerDay: avgCompletedPerDay * (energyLevel / 3),
      avgCompletedPerDay,
      recentSessionMinutes: 20 * (energyLevel / 3),
      avgSessionMinutes: 20,
      recentAvgEnergy: energyLevel,
    })
    const rawScore = computeBurnoutScore(behaviors)
    // High emotional reactivity = feel burnout sooner (1.2x multiplier, capped at 100)
    const adjustedScore = emotionalReactivity === 'high'
      ? Math.min(100, Math.round(rawScore * 1.2))
      : rawScore
    setBurnoutScore(adjustedScore)
  }, [completedTotal, energyLevel, poolSnoozedCount, poolActiveCount, setBurnoutScore, emotionalReactivity])

  // VOLAURA: broadcast streak update whenever streak changes (once per streak value per session)
  const lastSentStreakRef = useRef(0)
  useEffect(() => {
    if (!isVolauraConfigured()) return
    if (!userId || userId.startsWith('guest_')) return
    if (currentStreak < 2) return                    // invisible streaks < 2 → not worth sending
    if (currentStreak === lastSentStreakRef.current) return
    lastSentStreakRef.current = currentStreak
    void supabase.auth.getSession().then(({ data }) => {
      const token = data.session?.access_token
      if (token) void sendStreakUpdate(token, currentStreak)
    })
  }, [currentStreak, userId])

  useOfflineSync()
  useTaskSync()
  useSessionHistory()
  useCalendarSync()
  useInAppReview()

  // Block render until IDB hydration completes — prevents default-state flash
  // (e.g. onboardingCompleted: false briefly before persisted true loads from IDB)
  if (!_hasHydrated) return <LoadingScreen />

  return (
    <BrowserRouter>
      <Toaster
        theme="dark"
        position="bottom-center"
        visibleToasts={1}
        toastOptions={{
          style: {
            background: 'var(--color-surface-card)',
            border: '1px solid rgba(123,114,255,0.18)',
            color: 'var(--color-text-primary)',
            fontSize: '14px',
            borderRadius: '16px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
          },
          duration: 3000,
        }}
        offset="calc(72px + env(safe-area-inset-bottom, 0px))"
      />
      <ErrorBoundary>
        <Suspense fallback={<LoadingScreen />}>

          {showRecovery && (
            <Suspense fallback={null}>
              <LazyRecoveryProtocol onDismiss={() => { setRecoveryShown(); updateLastSession() }} />
            </Suspense>
          )}

          {!showRecovery && showContextRestore && (
            <Suspense fallback={null}>
              <LazyContextRestore
                onDismiss={dismissContextRestore}
                wasRecentlyInRoom={wasRecentlyInRoom}
                lastRoomCode={lastRoomCode}
              />
            </Suspense>
          )}

          {/* First-focus tutorial — shown once after onboarding, before rituals */}
          {!showRecovery && !showContextRestore && onboardingCompleted && !firstFocusTutorialCompleted && (
            <Suspense fallback={null}>
              <LazyFirstFocusTutorial />
            </Suspense>
          )}

          {/* Shutdown ritual — end-of-day wind-down (9pm+, once per day) */}
          {!showRecovery && !showContextRestore && firstFocusTutorialCompleted && showShutdown && (
            <Suspense fallback={null}>
              <LazyShutdownRitual onDismiss={dismissShutdown} />
            </Suspense>
          )}

          {/* Monthly reflection — first 5 days of new month, once per month */}
          {!showRecovery && !showContextRestore && firstFocusTutorialCompleted && !showShutdown && showMonthly && (
            <Suspense fallback={null}>
              <LazyMonthlyReflection onDismiss={dismissMonthly} />
            </Suspense>
          )}

          {/* Weekly planning — Sunday evening or Monday morning, once per ISO week */}
          {!showRecovery && !showContextRestore && firstFocusTutorialCompleted && !showShutdown && !showMonthly && showWeeklyPlan && (
            <Suspense fallback={null}>
              <LazyWeeklyPlanning onDismiss={dismissWeeklyPlan} />
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
              <p className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>
                🌙 Rest mode active until {flexPauseUntilLabel}
              </p>
              <button
                onClick={() => setFlexiblePauseUntil(null)}
                className="text-xs px-3 py-1 rounded-lg transition-all duration-200"
                style={{
                  background: 'rgba(123,114,255,0.15)',
                  border: '1px solid rgba(123,114,255,0.35)',
                  color: 'var(--color-primary)',
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
      <p className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>{label} had a hiccup</p>
      <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Don't worry — your data is safe.</p>
      <a href="/" className="px-5 py-2.5 rounded-xl text-sm font-semibold"
        style={{ background: 'rgba(123,114,255,0.15)', border: '1.5px solid var(--color-primary)', color: 'var(--color-primary)' }}>
        Go home
      </a>
    </div>
  )
}
