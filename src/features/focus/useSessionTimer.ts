import { useState, useRef, useEffect, useCallback } from 'react'
import { hapticPhase } from '@/shared/lib/haptic'
import { getPhase } from './useSessionPhase'
import type { SessionPhase, ActiveSession } from '@/types'
import type { ScreenState } from './useFocusSession'

// ── Types ─────────────────────────────────────────────────────────────────────

interface UseSessionTimerOptions {
  screen: ScreenState
  sessionPhase: SessionPhase
  activeSession: ActiveSession | null
  setPhase: (p: SessionPhase) => void
  onTimerEnd: () => void    // called when remaining hits 0 → triggers handleSessionEnd
}

export interface UseSessionTimerReturn {
  remainingSeconds: number
  elapsedSeconds: number
  showDigits: boolean
  setShowDigits: React.Dispatch<React.SetStateAction<boolean>>
  setRemainingSeconds: React.Dispatch<React.SetStateAction<number>>
  setElapsedSeconds: React.Dispatch<React.SetStateAction<number>>
  startTimeRef: React.MutableRefObject<number>
  pausedMsRef: React.MutableRefObject<number>
  pauseStartRef: React.MutableRefObject<number>
  durationSecRef: React.MutableRefObject<number>
  intervalRef: React.MutableRefObject<ReturnType<typeof setInterval> | null>
  softStopFiredRef: React.MutableRefObject<boolean>
  savedSessionIdRef: React.MutableRefObject<string | null>
  sessionSavedRef: React.MutableRefObject<boolean>
  startInterval: () => void
  handleStop: () => void
  handleResume: () => void
  resetPhaseTracking: () => void
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useSessionTimer(options: UseSessionTimerOptions): UseSessionTimerReturn {
  const { screen, sessionPhase, activeSession, setPhase, onTimerEnd } = options

  // ── State ─────────────────────────────────────────────────────────────────
  const [remainingSeconds, setRemaining]  = useState(0)
  const [elapsedSeconds, setElapsed]      = useState(0)
  const [showDigits, setShowDigits]       = useState(false)

  // ── Refs ──────────────────────────────────────────────────────────────────
  const startTimeRef        = useRef(0)
  const pausedMsRef         = useRef(0)
  const pauseStartRef       = useRef(0)
  const durationSecRef      = useRef(0)
  const intervalRef         = useRef<ReturnType<typeof setInterval> | null>(null)
  const softStopFiredRef    = useRef(false)
  const savedSessionIdRef   = useRef<string | null>(null)  // captures DB row id for energy_after UPDATE
  const sessionSavedRef     = useRef(false)
  const lastPhaseRef        = useRef<SessionPhase>('idle')  // tracks phase for haptic on transition

  // ── Interval runner ──────────────────────────────────────────────────────────
  const startInterval = useCallback(() => {
    // BUG-D3: clear any orphaned interval before creating a new one —
    // rapid taps on "bypass hard-stop" could stack multiple intervals
    if (intervalRef.current) clearInterval(intervalRef.current)
    const durationSec = durationSecRef.current
    intervalRef.current = setInterval(() => {
      const netElapsedMs = Date.now() - startTimeRef.current - pausedMsRef.current
      const elapsed      = Math.floor(netElapsedMs / 1000)
      const remaining    = Math.max(0, durationSec - elapsed)

      setElapsed(elapsed)
      setRemaining(remaining)

      const newPhase = getPhase(elapsed / 60)
      if (newPhase !== lastPhaseRef.current) {
        lastPhaseRef.current = newPhase
        hapticPhase() // tactile feedback on phase transition
      }
      setPhase(newPhase)

      if (remaining <= 0) onTimerEnd()
    }, 250)
  }, [setPhase, onTimerEnd])

  // ── Stop (pause mechanics only — screen transition stays in useFocusSession) ──
  const handleStop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    pauseStartRef.current = Date.now()
  }, [])

  // ── Resume (accumulate pause time — screen transition stays in useFocusSession) ─
  const handleResume = useCallback(() => {
    pausedMsRef.current += Date.now() - pauseStartRef.current
    startInterval()
  }, [startInterval])

  // ── Reset phase tracking (called from handleStart in useFocusSession) ────────
  const resetPhaseTracking = useCallback(() => {
    lastPhaseRef.current = 'struggle'
  }, [])

  // ── Visibility change — correct timer on background return ─────────────────
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && screen === 'session' && startTimeRef.current > 0) {
        const netElapsedMs = Date.now() - startTimeRef.current - pausedMsRef.current
        const elapsed = Math.floor(netElapsedMs / 1000)
        const remaining = Math.max(0, durationSecRef.current - elapsed)
        setElapsed(elapsed)
        setRemaining(remaining)
        setPhase(getPhase(elapsed / 60))
        if (remaining <= 0) onTimerEnd()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [screen, onTimerEnd, setPhase])

  // ── beforeunload — persist in-progress session to localStorage ───────────────
  // If the tab is closed mid-session, Supabase insert never runs.
  // We save a snapshot so the next app load can detect and recover it.
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (screen === 'session' && activeSession && startTimeRef.current > 0 && !sessionSavedRef.current) {
        const elapsedMs = Date.now() - startTimeRef.current - pausedMsRef.current
        try {
          localStorage.setItem('ms_pending_session', JSON.stringify({
            taskId: activeSession.taskId,
            startedAt: activeSession.startedAt,
            elapsedMs,
            phase: sessionPhase,
          }))
        } catch { /* localStorage unavailable — silent */ }
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [screen, activeSession, sessionPhase])

  return {
    remainingSeconds,
    elapsedSeconds,
    showDigits,
    setShowDigits,
    setRemainingSeconds: setRemaining,
    setElapsedSeconds: setElapsed,
    startTimeRef,
    pausedMsRef,
    pauseStartRef,
    durationSecRef,
    intervalRef,
    softStopFiredRef,
    savedSessionIdRef,
    sessionSavedRef,
    startInterval,
    handleStop,
    handleResume,
    resetPhaseTracking,
  }
}
