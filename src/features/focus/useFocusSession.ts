/**
 * useFocusSession — Block 2a refactor
 *
 * Extracts ALL timer/session logic out of FocusScreen.tsx into a testable hook.
 * FocusScreen becomes a thin orchestrator that renders UI based on this hook's state.
 *
 * Responsibility boundary:
 *   useFocusSession  ← state, effects, event handlers, DB persistence
 *   FocusScreen      ← layout, screen routing, sub-component composition
 *   SessionControls  ← audio/stop/park UI (active session only)
 *   PostSessionFlow  ← nature-buffer + recovery-lock screens
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useStore } from '@/store'
import { useAudioEngine } from '@/shared/hooks/useAudioEngine'
import { useMotion } from '@/shared/hooks/useMotion'
import { supabase } from '@/shared/lib/supabase'
import { logError } from '@/shared/lib/logger'
import {
  notifyFocusEnd, notifyAchievement, requestNotificationPermission,
  pushFocusComplete, pushRecoveryEnd,
} from '@/shared/lib/notify'
import { hapticDone, hapticPhase, hapticStart } from '@/shared/lib/haptic'
import { getToneCopy } from '@/shared/lib/uiTone'
import { ACHIEVEMENT_DEFINITIONS } from '@/types'
import {
  TIMER_PRESETS,
  PHASE_STRUGGLE_MINUTES,
  PHASE_FLOW_MINUTES,
  MAX_SESSION_MINUTES,
  RECOVERY_LOCK_MINUTES,
  NATURE_BUFFER_SECONDS,
  SESSION_SOFT_STOP_MINUTES,
  SESSION_HARD_STOP_MINUTES,
} from '@/shared/lib/constants'
import { toast } from 'sonner'
import { ARC_SIZE } from './ArcTimer'
import type { SessionPhase, AudioPreset, Task, EnergyLevel } from '@/types'
import type { FocusSessionInsert } from '@/types/database'

// ── Types ─────────────────────────────────────────────────────────────────────

export type ScreenState =
  | 'setup'
  | 'session'
  | 'interrupt-confirm'
  | 'bookmark-capture'
  | 'recovery-lock'
  | 'nature-buffer'
  | 'hard-stop'

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

export function getPhase(elapsedMinutes: number): SessionPhase {
  if (elapsedMinutes < PHASE_STRUGGLE_MINUTES) return 'struggle'
  if (elapsedMinutes < PHASE_FLOW_MINUTES) return 'release'
  return 'flow'
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
    timerStyle, flexiblePauseUntil, setEnergyLevel,
    addTask, userId,
  } = useStore()

  const { shouldAnimate, t } = useMotion()
  const { play, stop: stopAudio, playAnchor, adaptToPhase, isPlaying, setVolume: setAudioVolume } = useAudioEngine()
  const [searchParams] = useSearchParams()

  // ── Smart defaults ──────────────────────────────────────────────────────────
  const smartDuration = useMemo(() => getSmartDuration(energyLevel), [energyLevel])
  const isQuickStart = searchParams.get('quick') === '1'

  // ── Setup state ─────────────────────────────────────────────────────────────
  const [selectedTask, setSelectedTask]         = useState<Task | null>(null)
  const [selectedDuration, setSelectedDuration] = useState(smartDuration)
  const [customDuration, setCustomDuration]     = useState('')
  const [showCustom, setShowCustom]             = useState(false)

  // ── Runtime state ───────────────────────────────────────────────────────────
  const [screen, setScreen]               = useState<ScreenState>('setup')
  const [remainingSeconds, setRemaining]  = useState(0)
  const [elapsedSeconds, setElapsed]      = useState(0)
  const [showDigits, setShowDigits]       = useState(false)
  const [recoverySeconds, setRecovery]    = useState(RECOVERY_LOCK_MINUTES * 60)
  const [bufferSeconds, setBufferSeconds] = useState(NATURE_BUFFER_SECONDS)
  const [postEnergyLogged, setPostEnergyLogged] = useState(false)

  // ── Refs ─────────────────────────────────────────────────────────────────────
  const startTimeRef        = useRef(0)
  const pausedMsRef         = useRef(0)
  const pauseStartRef       = useRef(0)
  const durationSecRef      = useRef(0)
  const intervalRef         = useRef<ReturnType<typeof setInterval> | null>(null)
  const recoveryIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const bufferIntervalRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const sessionSavedRef     = useRef(false)
  const quickStartedRef     = useRef(false)
  const softStopFiredRef    = useRef(false)
  const savedSessionIdRef   = useRef<string | null>(null)  // captures DB row id for energy_after UPDATE
  const lastPhaseRef        = useRef<SessionPhase>('idle')  // tracks phase for haptic on transition

  // ── Interrupt bookmark ──────────────────────────────────────────────────────
  const [bookmarkText, setBookmarkText] = useState('')
  const [savedBookmark] = useState<InterruptBookmark | null>(() => loadBookmark())

  // ── Park thought ─────────────────────────────────────────────────────────────
  const [parkOpen, setParkOpen] = useState(false)
  const [parkText, setParkText] = useState('')

  // Only 'task' type can have focus sessions — meetings/reminders/ideas are excluded
  const allTasks = [...nowPool, ...nextPool].filter(t => t.status === 'active' && t.taskType === 'task')

  // ── Cleanup on unmount ──────────────────────────────────────────────────────
  useEffect(() => () => {
    if (intervalRef.current)         clearInterval(intervalRef.current)
    if (recoveryIntervalRef.current) clearInterval(recoveryIntervalRef.current)
    if (bufferIntervalRef.current)   clearInterval(bufferIntervalRef.current)
  }, [])

  // ── Reset session ref on user change ─────────────────────────────────────
  // Prevents energy_after update from targeting a previous user's session row
  useEffect(() => {
    savedSessionIdRef.current = null
    sessionSavedRef.current = false
  }, [userId])

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
    const isFlexPauseActive = !!flexiblePauseUntil && new Date(flexiblePauseUntil) > new Date()
    if (isFlexPauseActive) return
    if (elapsedSeconds >= SESSION_SOFT_STOP_MINUTES * 60) {
      softStopFiredRef.current = true
      toast("You've been going for 90 minutes — wrap up when ready 🌿", { duration: 8_000 })
    }
  }, [elapsedSeconds, screen, flexiblePauseUntil])

  // ── Hard-stop half-sheet at 120 min ───────────────────────────────────────
  useEffect(() => {
    if (screen !== 'session') return
    const isFlexPauseActive = !!flexiblePauseUntil && new Date(flexiblePauseUntil) > new Date()
    if (isFlexPauseActive) return
    if (elapsedSeconds >= SESSION_HARD_STOP_MINUTES * 60) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      setScreen('hard-stop')
    }
  }, [elapsedSeconds, screen, flexiblePauseUntil])

  // ── Park thought handler ────────────────────────────────────────────────────
  const handleParkThought = useCallback(async () => {
    const text = parkText.trim()
    if (!text) return
    const task: Task = {
      id: crypto.randomUUID(),
      title: text,
      pool: 'someday',
      status: 'active',
      difficulty: 1,
      estimatedMinutes: 15,
      createdAt: new Date().toISOString(),
      completedAt: null,
      snoozeCount: 0,
      parentTaskId: null,
      position: 0,
      dueDate: null,
      dueTime: null,
      taskType: 'task',
      reminderSentAt: null,
      repeat: 'none',
    }
    addTask(task)
    if (userId) {
      try {
        await supabase.from('tasks').insert({
          id: task.id, user_id: userId, title: task.title,
          pool: task.pool, status: task.status, difficulty: task.difficulty,
          estimated_minutes: task.estimatedMinutes, parent_task_id: null, position: 0,
        } as never)
      } catch (err) {
        logError('FocusScreen.parkThought.insert', err, { taskId: task.id })
      }
    }
    setParkText('')
    setParkOpen(false)
  }, [parkText, addTask, userId])

  // ── Save session to DB ──────────────────────────────────────────────────────
  const saveSession = useCallback(async (elapsedMs: number, phaseReached: SessionPhase) => {
    if (sessionSavedRef.current || !activeSession || !userId) return
    sessionSavedRef.current = true
    try {
      const row: FocusSessionInsert = {
        task_id:       activeSession.taskId,
        user_id:       userId,
        started_at:    activeSession.startedAt,
        audio_preset:  activePreset,
        duration_ms:   elapsedMs,
        phase_reached: phaseReached === 'idle' ? null : phaseReached,
        // Capture current energy level as pre-session baseline (H-5 fix)
        energy_before: energyLevel ?? null,
      }
      const { data: saved } = await supabase
        .from('focus_sessions')
        .insert(row as never)
        .select('id')
        .single()
      savedSessionIdRef.current = (saved as { id?: string } | null)?.id ?? null
      updateLastSession()
    } catch (err) {
      logError('FocusScreen.handleSessionEnd.insert', err)
    }
  }, [activeSession, activePreset, updateLastSession, userId])

  // ── Nature buffer ────────────────────────────────────────────────────────────
  const startNatureBuffer = useCallback(() => {
    setBufferSeconds(NATURE_BUFFER_SECONDS)
    setScreen('nature-buffer')
    play('nature')
    setPreset('nature')

    bufferIntervalRef.current = setInterval(() => {
      setBufferSeconds(s => {
        if (s <= 1) {
          clearInterval(bufferIntervalRef.current!)
          stopAudio()
          setPreset(null)
          setScreen('setup')
          return 0
        }
        return s - 1
      })
    }, 1000)
  }, [play, stopAudio, setPreset])

  // ── Session end ──────────────────────────────────────────────────────────────
  const handleSessionEnd = useCallback((wasCompleted: boolean) => {
    if (intervalRef.current) clearInterval(intervalRef.current)

    const elapsedMs = Date.now() - startTimeRef.current - pausedMsRef.current
    const elapsedMin = Math.floor(elapsedMs / 60_000)
    void saveSession(elapsedMs, sessionPhase)

    if (elapsedMin >= 1) { notifyFocusEnd(elapsedMin); hapticDone() }
    if (elapsedMin >= 1) pushFocusComplete(elapsedMin)

    if (wasCompleted) {
      const toneCopy = getToneCopy(useStore.getState().uiTone)
      const tryUnlock = (key: string) => {
        if (!hasAchievement(key)) {
          unlockAchievement(key)
          const def = ACHIEVEMENT_DEFINITIONS.find(a => a.key === key)
          if (def) notifyAchievement(toneCopy.badgeUnlocked(def.name), def.emoji, def.description)
        }
      }
      if (durationSecRef.current >= 52 * 60) tryUnlock('flow_rider')
      if (sessionPhase === 'flow') tryUnlock('full_cycle')
      if (durationSecRef.current === 5 * 60)  tryUnlock('five_min_hero')
    }

    stopAudio()
    setPreset(null)
    endSession()

    const wasFull = wasCompleted && durationSecRef.current >= MAX_SESSION_MINUTES * 60
    if (wasFull) {
      setRecovery(RECOVERY_LOCK_MINUTES * 60)
      setScreen('recovery-lock')
      recoveryIntervalRef.current = setInterval(() => {
        setRecovery(s => {
          if (s <= 1) {
            clearInterval(recoveryIntervalRef.current!)
            pushRecoveryEnd()
            setScreen('setup')
            return 0
          }
          return s - 1
        })
      }, 1000)
    } else if (wasCompleted) {
      startNatureBuffer()
    } else {
      setScreen('setup')
    }
  }, [sessionPhase, saveSession, stopAudio, setPreset, endSession,
      hasAchievement, unlockAchievement, startNatureBuffer])

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
        if (remaining <= 0) handleSessionEnd(true)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [screen, handleSessionEnd, setPhase])

  // ── Interval runner ──────────────────────────────────────────────────────────
  const startInterval = useCallback(() => {
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

      if (remaining <= 0) handleSessionEnd(true)
    }, 250)
  }, [setPhase, handleSessionEnd])

  // ── Start ────────────────────────────────────────────────────────────────────
  const handleStart = useCallback((overrideDuration?: number) => {
    const duration = overrideDuration
      ?? (showCustom ? (parseInt(customDuration) || 25) : selectedDuration)
    const durationSec = duration * 60

    durationSecRef.current = durationSec
    startTimeRef.current   = Date.now()
    pausedMsRef.current    = 0
    sessionSavedRef.current  = false
    softStopFiredRef.current = false
    setPostEnergyLogged(false)

    void requestNotificationPermission()
    hapticStart() // grounding pulse before focus begins
    lastPhaseRef.current = 'struggle' // reset phase tracking
    startSession(selectedTask?.id ?? null, duration, focusAnchor ?? null)

    // Audio calls wrapped in try/catch — AudioContext can throw on iOS Safari
    // if the context is in a bad state. Session must start regardless.
    try { playAnchor() } catch { /* audio unavailable — session continues silently */ }
    if (focusAnchor) { try { play(focusAnchor) } catch { /* silent */ } }

    setRemaining(durationSec)
    setElapsed(0)
    setPhase('struggle')
    setShowDigits(false)
    setScreen('session')
    startInterval()
  }, [showCustom, customDuration, selectedDuration, selectedTask, focusAnchor,
      play, playAnchor, startSession, setPhase, startInterval])

  // ── Quick-start auto detection ──────────────────────────────────────────────
  useEffect(() => {
    if (isQuickStart && !quickStartedRef.current && screen === 'setup') {
      quickStartedRef.current = true
      handleStart(5)
    }
  }, [isQuickStart, screen, handleStart])

  // ── Stop → interrupt confirm ────────────────────────────────────────────────
  const handleStop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    pauseStartRef.current = Date.now()
    setScreen('interrupt-confirm')
  }, [])

  // ── Resume ──────────────────────────────────────────────────────────────────
  const handleResume = useCallback(() => {
    pausedMsRef.current += Date.now() - pauseStartRef.current
    setScreen('session')
    startInterval()
  }, [startInterval])

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
    handleSessionEnd(false)
  }, [bookmarkText, selectedTask, handleSessionEnd])

  const handleBookmarkSkip = useCallback(() => handleSessionEnd(false), [handleSessionEnd])

  // ── Skip nature buffer ──────────────────────────────────────────────────────
  const handleSkipBuffer = useCallback(() => {
    if (bufferIntervalRef.current) clearInterval(bufferIntervalRef.current)
    stopAudio()
    setPreset(null)
    setScreen('setup')
  }, [stopAudio, setPreset])

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

  // ── Bypass recovery lock ────────────────────────────────────────────────────
  const handleBypassRecovery = useCallback(() => {
    if (recoveryIntervalRef.current) clearInterval(recoveryIntervalRef.current)
    setScreen('setup')
  }, [])

  // ── Bypass hard-stop (hyperfocus) ───────────────────────────────────────────
  const handleBypassHardStop = useCallback(() => {
    setScreen('session')
    startInterval()
  }, [startInterval])

  // ── Energy delta ─────────────────────────────────────────────────────────────
  const handlePostEnergy = useCallback((level: EnergyLevel) => {
    setEnergyLevel(level)
    setPostEnergyLogged(true)
    // Persist post-session energy to the focus_sessions row that was just created
    // Guard: only update if we have a saved session ID and the user is still logged in
    if (savedSessionIdRef.current && userId && !userId.startsWith('guest_')) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      void (supabase.from('focus_sessions') as any)
        .update({ energy_after: level })
        .eq('id', savedSessionIdRef.current)
        .then(({ error }: { error: unknown }) => { if (error) logError('useFocusSession.energy_after.update', error) })
    }
  }, [setEnergyLevel, userId])

  // ── Derived ──────────────────────────────────────────────────────────────────
  const progress  = durationSecRef.current > 0 ? 1 - remainingSeconds / durationSecRef.current : 0
  const isFlow    = sessionPhase === 'flow'
  const elapsedMin = Math.floor(elapsedSeconds / 60)
  const timerSize = getTimerSize(sessionPhase)

  const energyLabel = useMemo(() => {
    if (energyLevel <= 2) return { text: 'Low energy — starting small 🌱', color: '#4ECDC4' }
    if (energyLevel === 3) return { text: 'Steady energy — classic focus 🎯', color: '#7B72FF' }
    return { text: 'High energy — deep work time 🚀', color: '#F59E0B' }
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
    recoverySeconds, bufferSeconds,
    postEnergyLogged,
    bookmarkText, setBookmarkText,
    // Park thought
    parkOpen, setParkOpen,
    parkText, setParkText,
    // Derived
    progress, isFlow, elapsedMin, timerSize, energyLabel,
    // Timer style from store (for ArcTimer prop)
    timerStyle,
    sessionPhase,
    // Handlers
    handleStart, handleStop, handleResume, handleConfirmStop,
    handleBookmarkSave, handleBookmarkSkip, handleSkipBuffer,
    handleAudioToggle, handleParkThought,
    handleSessionEnd, handleBypassRecovery, handleBypassHardStop,
    handlePostEnergy,
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
