/**
 * useOverlayState — manages all full-screen overlay visibility in App.tsx
 *
 * Extracts: 4 useState flags, visibilitychange effect, 3 overlay trigger
 * effects (shutdown / monthly / weekly), and derived showRecovery /
 * flexPauseActive / flexPauseUntilLabel values.
 *
 * Priority order (mutually exclusive):
 *   RecoveryProtocol > ContextRestore > FirstFocusTutorial >
 *   ShutdownRitual > MonthlyReflection > WeeklyPlanning
 */

import { useState, useEffect, useMemo } from 'react'
import { useStore } from '@/store'
import { RECOVERY_THRESHOLD_HOURS } from '@/shared/lib/constants'
import { shouldShowContextRestore, writeLastActive } from '@/features/tasks/contextRestoreUtils'

/** Compute the ISO week key used by WeeklyPlanning. */
function getIsoWeekKey(now: Date): string {
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
  if (now.getDay() === 0) d.setUTCDate(d.getUTCDate() + 1) // Sunday → next week
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNum = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${d.getUTCFullYear()}-W${weekNum.toString().padStart(2, '0')}`
}

export interface OverlayState {
  // Derived
  showRecovery: boolean
  flexPauseActive: boolean
  flexPauseUntilLabel: string
  // Controlled
  showContextRestore: boolean
  showShutdown: boolean
  showMonthly: boolean
  showWeeklyPlan: boolean
  // Dismiss handlers
  dismissContextRestore: () => void
  dismissShutdown: () => void
  dismissMonthly: () => void
  dismissWeeklyPlan: () => void
}

export function useOverlayState(): OverlayState {
  const {
    recoveryShown, lastSessionAt,
    onboardingCompleted, completedTotal,
    shutdownShownDate, setShutdownShownDate,
    monthlyReflectionShownMonth, setMonthlyReflectionShownMonth,
    weeklyPlanShownWeek, setWeeklyPlanShownWeek,
    flexiblePauseUntil,
    nowPool,
  } = useStore()

  const [showContextRestore, setShowContextRestore] = useState(false)
  const [showShutdown, setShowShutdown] = useState(false)
  const [showMonthly, setShowMonthly] = useState(false)
  const [showWeeklyPlan, setShowWeeklyPlan] = useState(false)

  // ── ContextRestore: show when user returns from background with active tasks ──
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

  // ── ShutdownRitual: once per day after 9pm ────────────────────────────────────
  useEffect(() => {
    if (!onboardingCompleted) return
    const hour = new Date().getHours()
    if (hour < 21) return
    const today = new Date().toISOString().split('T')[0]
    if (shutdownShownDate === today) return
    const id = setTimeout(() => setShowShutdown(true), 1200)
    return () => clearTimeout(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboardingCompleted])

  // ── MonthlyReflection: first 5 days of each month, once per month ────────────
  useEffect(() => {
    if (!onboardingCompleted) return
    if (completedTotal < 3) return
    const now = new Date()
    if (now.getDate() > 5) return
    const currentMonth = now.toISOString().slice(0, 7)
    if (monthlyReflectionShownMonth === currentMonth) return
    const id = setTimeout(() => setShowMonthly(true), 2000)
    return () => clearTimeout(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboardingCompleted, completedTotal])

  // ── WeeklyPlanning: Sunday 18pm+ or Monday before noon, once per ISO week ────
  useEffect(() => {
    if (!onboardingCompleted) return
    if (completedTotal < 3) return
    const now = new Date()
    const day = now.getDay()
    const hour = now.getHours()
    if (!(day === 0 && hour >= 18) && !(day === 1 && hour < 12)) return
    if (weeklyPlanShownWeek === getIsoWeekKey(now)) return
    const id = setTimeout(() => setShowWeeklyPlan(true), 2500)
    return () => clearTimeout(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboardingCompleted])

  // ── Derived ───────────────────────────────────────────────────────────────────
  const showRecovery = (() => {
    if (recoveryShown || !lastSessionAt) return false
    return (Date.now() - new Date(lastSessionAt).getTime()) / 3_600_000 >= RECOVERY_THRESHOLD_HOURS
  })()

  const flexPauseActive = useMemo(() => {
    if (!flexiblePauseUntil) return false
    return new Date(flexiblePauseUntil) > new Date()
  }, [flexiblePauseUntil])

  const flexPauseUntilLabel = useMemo(() => {
    if (!flexiblePauseUntil) return ''
    return new Date(flexiblePauseUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }, [flexiblePauseUntil])

  // ── Dismiss handlers ──────────────────────────────────────────────────────────
  const dismissContextRestore = () => setShowContextRestore(false)

  const dismissShutdown = () => {
    setShowShutdown(false)
    setShutdownShownDate(new Date().toISOString().split('T')[0])
  }

  const dismissMonthly = () => {
    setShowMonthly(false)
    setMonthlyReflectionShownMonth(new Date().toISOString().slice(0, 7))
  }

  const dismissWeeklyPlan = () => {
    setShowWeeklyPlan(false)
    setWeeklyPlanShownWeek(getIsoWeekKey(new Date()))
  }

  return {
    showRecovery,
    flexPauseActive,
    flexPauseUntilLabel,
    showContextRestore,
    showShutdown,
    showMonthly,
    showWeeklyPlan,
    dismissContextRestore,
    dismissShutdown,
    dismissMonthly,
    dismissWeeklyPlan,
    // expose firstFocusTutorialCompleted via showContextRestore-adjacent check is in App.tsx
  }
}

/** Re-export the ISO week helper for App.tsx overlay JSX (onDismiss handler needs it) */
export { getIsoWeekKey }
