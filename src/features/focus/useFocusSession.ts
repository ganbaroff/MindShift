/**
 * useFocusSession — orchestrates focus session state
 *
 * Thin coordinator: delegates to four sub-hooks.
 *   useSessionTimer      ← interval mechanics, timing refs
 *   useSessionPhase      ← phase transitions + soft/hard-stop side-effects
 *   useSessionPersistence← DB writes (save, energy_after, autopsy, pending recovery)
 *   useParkThought       ← stray-thought capture during session
 *   useSessionEnd        ← post-session screens, recovery/buffer timers, XP/achievements
 *
 * FocusScreen is a thin orchestrator that renders UI from this hook's state.
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useStore } from '@/store'
import { useAudioEngine } from '@/shared/hooks/useAudioEngine'
import { useMotion } from '@/shared/hooks/useMotion'
import { hapticStart } from '@/shared/lib/haptic'
import { requestNotificationPermission } from '@/shared/lib/notify'
import { TIMER_PRESETS } from '@/shared/lib/constants'
import { logEvent } from '@/shared/lib/logger'
import { supabase } from '@/shared/lib/supabase'
import { sendFocusSession } from '@/shared/lib/volaura-bridge'
import i18n from '@/i18n'
import { ARC_SIZE } from './ArcTimer'
import { useSessionPhase } from './useSessionPhase'
import { useSessionTimer } from './useSessionTimer'
import { useSessionPersistence } from './useSessionPersistence'
import { useParkThought } from './useParkThought'
import { useSessionEnd } from './useSessionEnd'
import type { ScreenState } from './useSessionEnd'
import type { SessionPhase, AudioPreset, Task, EnergyLevel } from '@/types'

// Re-export ScreenState and getPhase so existing callers don't need to change imports
export type { ScreenState } from './useSessionEnd'
export { getPhase } from './useSessionPhase'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface InterruptBookmark {
  text: string
  taskId: string | null
  taskTitle: string | null
  timestamp: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

export const PHASE_LABELS: Partial<Record<SessionPhase, string>> = {
  struggle: 'Getting into it... 💪',
  release:  'Finding your flow... 🌊',
  recovery: 'Rest time. You did it! 🌟',
}

const BOOKMARK_KEY = 'ms_interrupt_bookmark'

function loadBookmark(): InterruptBookmark | null {
  try {
    const raw = localStorage.getItem(BOOKMARK_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveBookmark(bookmark: InterruptBookmark): void {
  try { localStorage.setItem(BOOKMARK_KEY, JSON.stringify(bookmark)) } catch { /* silent */ }
}

export function clearBookmark(): void {
  try { localStorage.removeItem(BOOKMARK_KEY) } catch { /* silent */ }
}

export function getSmartDuration(energy: EnergyLevel): number {
  if (energy <= 2) return 5
  if (energy === 3) return 25
  return 52
}

export function getTimerSize(phase: SessionPhase): number {
  switch (phase) {
    case 'struggle': return ARC_SIZE
    case 'release':  return Math.round(ARC_SIZE * 0.85)
    case 'flow':     return Math.round(ARC_SIZE * 0.75)
    default:         return ARC_SIZE
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useFocusSession() {
  const {
    nowPool, nextPool,
    activeSession, sessionPhase, energyLevel,
    startSession, endSession, setPhase, updateLastSession,
    hasAchievement, unlockAchievement,
    focusAnchor, activePreset, setPreset, audioVolume, setVolume: setStoreVolume,
    timerStyle, setEnergyLevel,
    addTask, userId,
  } = useStore()

  const { shouldAnimate, t } = useMotion()
  const { play, stop: stopAudio, playAnchor, adaptToPhase, isPlaying, setVolume: setAudioVolume } = useAudioEngine()
  const [searchParams] = useSearchParams()

  // ── Smart defaults ──────────────────────────────────────────────────────────
  const smartDuration = useMemo(() => getSmartDuration(energyLevel), [energyLevel])
  const isQuickStart  = searchParams.get('quick') === '1'

  // ── Setup state ─────────────────────────────────────────────────────────────
  const [selectedTask, setSelectedTask]         = useState<Task | null>(null)
  const [selectedDuration, setSelectedDuration] = useState(smartDuration)
  const [customDuration, setCustomDuration]     = useState('')
  const [showCustom, setShowCustom]             = useState(false)

  // ── Runtime state ───────────────────────────────────────────────────────────
  const [screen, setScreen]             = useState<ScreenState>('setup')
  const [postEnergyLogged, setPostEnergyLogged] = useState(false)

  // ── Misc refs ────────────────────────────────────────────────────────────────
  const quickStartedRef = useRef(false)
  const energyBeforeRef = useRef<EnergyLevel | null>(null)

  // ── Timer sub-hook ───────────────────────────────────────────────────────────
  const timer = useSessionTimer({
    screen, sessionPhase, activeSession,
    setPhase: (p) => setPhase(p),
    onTimerEnd: () => sessionEnd.handleSessionEnd(true),
  })
  const {
    remainingSeconds, elapsedSeconds, showDigits, setShowDigits,
    setRemainingSeconds, setElapsedSeconds,
    startTimeRef, pausedMsRef, durationSecRef,
    intervalRef, softStopFiredRef, savedSessionIdRef, sessionSavedRef,
    startInterval, handleStop: timerStop, handleResume: timerResume,
    resetPhaseTracking,
  } = timer

  // ── Phase sub-hook ───────────────────────────────────────────────────────────
  useSessionPhase({
    screen, sessionPhase, elapsedSeconds,
    softStopFiredRef, intervalRef,
    stopAudio, setPreset, setScreen,
    adaptToPhase,
  })

  // ── Persistence sub-hook ────────────────────────────────────────────────────
  const { saveSession, handlePostEnergy: _handlePostEnergy, handleAutopsyPick } = useSessionPersistence({
    activeSession, userId, activePreset, energyLevel,
    updateLastSession, setEnergyLevel,
    savedSessionIdRef, sessionSavedRef,
  })

  // ── Park-thought sub-hook ───────────────────────────────────────────────────
  const park = useParkThought({ addTask, userId })

  // ── Session-end sub-hook ────────────────────────────────────────────────────
  const sessionEnd = useSessionEnd({
    sessionPhase, activePreset, isPlaying, energyBeforeRef,
    intervalRef, startTimeRef, pausedMsRef, durationSecRef,
    saveSession, stopAudio, setPreset, endSession,
    hasAchievement, unlockAchievement, play, setScreen,
  })
  const { pendingSessionRef } = sessionEnd

  // ── Interrupt bookmark ──────────────────────────────────────────────────────
  const [bookmarkText, setBookmarkText]         = useState('')
  const [savedBookmark]                         = useState<InterruptBookmark | null>(() => loadBookmark())

  // Only 'task' type entries can have focus sessions
  const allTasks = [...nowPool, ...nextPool].filter(t => t.status === 'active' && t.taskType === 'task')

  // ── Cleanup on unmount ──────────────────────────────────────────────────────
  useEffect(() => () => {
    if (intervalRef.current)                           clearInterval(intervalRef.current)
    if (sessionEnd.recoveryIntervalRef.current)        clearInterval(sessionEnd.recoveryIntervalRef.current)
    if (sessionEnd.bufferIntervalRef.current)          clearInterval(sessionEnd.bufferIntervalRef.current)
  }, [])

  // ── Reset session ref when user changes ────────────────────────────────────
  useEffect(() => {
    savedSessionIdRef.current = null
    sessionSavedRef.current = false
  }, [userId])

  // ── handlePostEnergy wrapper: also flips postEnergyLogged ──────────────────
  const handlePostEnergy = useCallback((level: EnergyLevel) => {
    _handlePostEnergy(level)
    setPostEnergyLogged(true)
    logEvent('energy_logged', { level })
    // Deferred VOLAURA session event — now we have the real post-session energy_after
    const pending = pendingSessionRef.current
    if (pending) {
      pendingSessionRef.current = null
      void supabase.auth.getSession().then(({ data }) => {
        const token = data.session?.access_token
        if (token) void sendFocusSession(token, { ...pending, energyAfter: level })
      })
    }
  }, [_handlePostEnergy, pendingSessionRef])

  // ── Start ────────────────────────────────────────────────────────────────────
  const handleStart = useCallback((overrideDuration?: number) => {
    const duration = overrideDuration
      ?? (showCustom ? (parseInt(customDuration) || 25) : selectedDuration)
    const durationSec = duration * 60

    durationSecRef.current    = durationSec
    startTimeRef.current      = Date.now()
    pausedMsRef.current       = 0
    sessionSavedRef.current   = false
    softStopFiredRef.current  = false
    energyBeforeRef.current   = energyLevel
    setPostEnergyLogged(false)

    logEvent('session_started', { duration_min: duration, has_task: selectedTask ? 1 : 0 })
    void requestNotificationPermission()
    hapticStart()
    resetPhaseTracking()
    startSession(selectedTask?.id ?? null, duration, focusAnchor ?? null)

    try { playAnchor() } catch { /* sonic anchor unavailable */ }
    // Auto-start ambient audio: use focusAnchor if set, else activePreset, else brown noise
    try { play(focusAnchor ?? activePreset ?? 'brown') } catch { /* audio unavailable — session continues silently */ }

    setRemainingSeconds(durationSec)
    setElapsedSeconds(0)
    setPhase('struggle')
    setShowDigits(false)
    setScreen('session')
    startInterval()
  }, [showCustom, customDuration, selectedDuration, selectedTask, focusAnchor, activePreset,
      play, playAnchor, startSession, setPhase, startInterval, resetPhaseTracking])

  // ── Quick-start auto detection ──────────────────────────────────────────────
  useEffect(() => {
    if (isQuickStart && !quickStartedRef.current && screen === 'setup') {
      quickStartedRef.current = true
      handleStart(5)
    }
  }, [isQuickStart, screen, handleStart])

  // ── Stop → interrupt confirm ────────────────────────────────────────────────
  const handleStop = useCallback(() => {
    timerStop()
    setScreen('interrupt-confirm')
  }, [timerStop])

  // ── Resume ──────────────────────────────────────────────────────────────────
  const handleResume = useCallback(() => {
    timerResume()
    setScreen('session')
  }, [timerResume])

  // ── Confirm end → bookmark capture ─────────────────────────────────────────
  const handleConfirmStop = useCallback(() => {
    setBookmarkText('')
    setScreen('bookmark-capture')
  }, [])

  // ── Save bookmark and end session ───────────────────────────────────────────
  const handleBookmarkSave = useCallback(() => {
    const text = bookmarkText.trim()
    if (text) {
      saveBookmark({
        text,
        taskId: selectedTask?.id ?? null,
        taskTitle: selectedTask?.title ?? null,
        timestamp: new Date().toISOString(),
      })
    }
    sessionEnd.handleSessionEnd(false)
  }, [bookmarkText, selectedTask, sessionEnd])

  const handleBookmarkSkip = useCallback(() => sessionEnd.handleSessionEnd(false), [sessionEnd])

  // ── Audio toggle ─────────────────────────────────────────────────────────────
  const handleAudioToggle = useCallback(() => {
    if (isPlaying) {
      stopAudio()
    } else {
      const preset: AudioPreset = (focusAnchor ?? activePreset ?? 'brown')
      play(preset)
      setPreset(preset)
    }
  }, [isPlaying, focusAnchor, activePreset, play, stopAudio, setPreset])

  // ── Bypass hard-stop (hyperfocus) ───────────────────────────────────────────
  const handleBypassHardStop = useCallback(() => {
    setScreen('session')
    startInterval()
  }, [startInterval])

  // ── Derived ──────────────────────────────────────────────────────────────────
  const progress   = durationSecRef.current > 0 ? 1 - remainingSeconds / durationSecRef.current : 0
  const isFlow     = sessionPhase === 'flow'
  const elapsedMin = Math.floor(elapsedSeconds / 60)
  const timerSize  = getTimerSize(sessionPhase)

  const energyLabel = useMemo(() => {
    if (energyLevel <= 2) return { text: i18n.t('focus.lowEnergy'),    color: '#4ECDC4' }
    if (energyLevel === 3) return { text: i18n.t('focus.steadyEnergy'), color: '#7B72FF' }
    return                        { text: i18n.t('focus.highEnergy'),   color: '#F59E0B' }
  }, [energyLevel])

  return {
    // Screen FSM
    screen, setScreen,
    // Setup
    selectedTask, setSelectedTask,
    selectedDuration, setSelectedDuration,
    customDuration, setCustomDuration,
    showCustom, setShowCustom,
    smartDuration, allTasks, savedBookmark,
    // Runtime
    elapsedSeconds, remainingSeconds,
    showDigits, setShowDigits,
    recoverySeconds: sessionEnd.recoverySeconds,
    bufferSeconds:   sessionEnd.bufferSeconds,
    postEnergyLogged,
    bookmarkText, setBookmarkText,
    // Park thought
    parkOpen: park.parkOpen, setParkOpen: park.setParkOpen,
    parkText: park.parkText, setParkText: park.setParkText,
    parkedThoughtsCount: park.parkedCount,
    // Derived
    progress, isFlow, elapsedMin, timerSize, energyLabel,
    timerStyle, sessionPhase,
    // Handlers
    handleStart, handleStop, handleResume, handleConfirmStop,
    handleBookmarkSave, handleBookmarkSkip,
    handleSkipBuffer:      sessionEnd.handleSkipBuffer,
    handleBypassRecovery:  sessionEnd.handleBypassRecovery,
    handleBypassHardStop,
    handleAudioToggle,
    handleParkThought:     park.handleParkThought,
    handleSessionEnd:      sessionEnd.handleSessionEnd,
    handlePostEnergy,
    handleAutopsyPick,
    startInterval, intervalRef,
    // Audio
    isPlaying, audioVolume,
    handleVolumeChange: (v: number) => { setStoreVolume(v); setAudioVolume(v) },
    // Motion
    shouldAnimate, t,
    // TIMER_PRESETS re-exported for setup screen
    TIMER_PRESETS,
    // Focus anchor for sound indicator
    focusAnchor,
  }
}
