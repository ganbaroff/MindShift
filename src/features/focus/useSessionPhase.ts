import { useEffect } from 'react'
import {
  PHASE_STRUGGLE_MINUTES,
  PHASE_FLOW_MINUTES,
  SESSION_SOFT_STOP_MINUTES,
  SESSION_HARD_STOP_MINUTES,
} from '@/shared/lib/constants'
import { toast } from 'sonner'
import i18n from '@/i18n'
import type { SessionPhase, AudioPreset } from '@/types'
import type { ScreenState } from './useFocusSession'
import { useStore } from '@/store'

// ── Pure function ─────────────────────────────────────────────────────────────

export function getPhase(elapsedMinutes: number): SessionPhase {
  if (elapsedMinutes < PHASE_STRUGGLE_MINUTES) return 'struggle'
  if (elapsedMinutes < PHASE_FLOW_MINUTES) return 'release'
  return 'flow'
}

// ── Hook ──────────────────────────────────────────────────────────────────────

interface UseSessionPhaseOptions {
  screen: ScreenState
  sessionPhase: SessionPhase
  elapsedSeconds: number
  softStopFiredRef: React.MutableRefObject<boolean>
  intervalRef: React.MutableRefObject<ReturnType<typeof setInterval> | null>
  stopAudio: () => void
  setPreset: (p: AudioPreset | null) => void
  setScreen: (s: ScreenState) => void
  adaptToPhase: (phase: 'struggle' | 'release' | 'flow') => void
}

export function useSessionPhase(options: UseSessionPhaseOptions): void {
  const {
    screen, sessionPhase, elapsedSeconds,
    softStopFiredRef, intervalRef,
    stopAudio, setPreset, setScreen, adaptToPhase,
  } = options

  const { flexiblePauseUntil } = useStore()

  // ── Phase-adaptive audio volume ────────────────────────────────────────────
  // Research #1: sound adapts to cognitive phase — full masking in struggle,
  // quiet ambient in flow to avoid disrupting hyperfocus state.
  useEffect(() => {
    if (screen !== 'session') return
    if (sessionPhase === 'struggle' || sessionPhase === 'release' || sessionPhase === 'flow') {
      adaptToPhase(sessionPhase)
    }
  }, [sessionPhase, screen, adaptToPhase])

  // ── Soft-stop toast at 90 min ──────────────────────────────────────────────
  useEffect(() => {
    if (screen !== 'session') return
    if (softStopFiredRef.current) return
    // BUG-D2: guard against firing simultaneously with hard-stop effect when
    // app returns from background after 120+ min (both effects see screen==='session'
    // in the same render cycle before setScreen('hard-stop') takes effect)
    if (elapsedSeconds >= SESSION_HARD_STOP_MINUTES * 60) return
    const isFlexPauseActive = !!flexiblePauseUntil && new Date(flexiblePauseUntil) > new Date()
    if (isFlexPauseActive) return
    if (elapsedSeconds >= SESSION_SOFT_STOP_MINUTES * 60) {
      softStopFiredRef.current = true
      toast(i18n.t('focus.softStopToast'), { duration: 8_000 })
    }
  }, [elapsedSeconds, screen, flexiblePauseUntil, softStopFiredRef])

  // ── Hard-stop half-sheet at 120 min ───────────────────────────────────────
  useEffect(() => {
    if (screen !== 'session') return
    const isFlexPauseActive = !!flexiblePauseUntil && new Date(flexiblePauseUntil) > new Date()
    if (isFlexPauseActive) return
    if (elapsedSeconds >= SESSION_HARD_STOP_MINUTES * 60) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      stopAudio()    // BUG-D1: audio was continuing to play on hard-stop screen
      setPreset(null)
      setScreen('hard-stop')
    }
  }, [elapsedSeconds, screen, flexiblePauseUntil, stopAudio, setPreset, setScreen, intervalRef])
}
