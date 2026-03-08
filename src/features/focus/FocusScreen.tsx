import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useStore } from '@/store'
import { ArcTimer } from './ArcTimer'
import { useAudioEngine } from '@/shared/hooks/useAudioEngine'
import { supabase } from '@/shared/lib/supabase'
import { notifyFocusEnd, notifyAchievement } from '@/shared/lib/notify'
import { hapticDone } from '@/shared/lib/haptic'
import { ACHIEVEMENT_DEFINITIONS } from '@/types'
import {
  TIMER_PRESETS,
  PHASE_RELEASE_MINUTES,
  MAX_SESSION_MINUTES,
  RECOVERY_LOCK_MINUTES,
  NATURE_BUFFER_SECONDS,
} from '@/shared/lib/constants'
import type { SessionPhase, AudioPreset, Task, EnergyLevel } from '@/types'
import type { FocusSessionInsert } from '@/types/database'

// ── Phase helpers ──────────────────────────────────────────────────────────────

const PHASE_LABELS: Partial<Record<SessionPhase, string>> = {
  struggle: 'Getting into it... 💪',
  release:  'Finding your flow... 🌊',
  recovery: 'Rest time. You did it! 🌟',
}

function getPhase(elapsedMinutes: number): SessionPhase {
  if (elapsedMinutes < PHASE_RELEASE_MINUTES) return 'struggle'
  if (elapsedMinutes < PHASE_RELEASE_MINUTES + 5) return 'release'   // 5-min transition window
  return 'flow'
}

/** Smart default duration based on energy — less energy = shorter session */
function getSmartDuration(energy: EnergyLevel): number {
  if (energy <= 2) return 5     // low battery → just 5 minutes
  if (energy === 3) return 25   // medium → classic pomodoro
  return 52                     // high energy → deep work
}

// ── Screen states ──────────────────────────────────────────────────────────────

type ScreenState = 'setup' | 'session' | 'interrupt-confirm' | 'recovery-lock' | 'nature-buffer'

// ── Component ──────────────────────────────────────────────────────────────────

export default function FocusScreen() {
  const {
    nowPool, nextPool,
    activeSession, sessionPhase, energyLevel,
    startSession, endSession, setPhase, updateLastSession,
    hasAchievement, unlockAchievement,
    focusAnchor, activePreset, setPreset,
  } = useStore()

  const reducedMotion = useReducedMotion()
  const { play, stop: stopAudio, isPlaying } = useAudioEngine()
  const [searchParams] = useSearchParams()

  // ── Smart defaults ─────────────────────────────────────────────────────────
  const smartDuration = useMemo(() => getSmartDuration(energyLevel), [energyLevel])
  const isQuickStart = searchParams.get('quick') === '1'

  // ── Setup state ──────────────────────────────────────────────────────────────
  const [selectedTask, setSelectedTask]       = useState<Task | null>(null)
  const [selectedDuration, setSelectedDuration] = useState(smartDuration)
  const [customDuration, setCustomDuration]   = useState('')
  const [showCustom, setShowCustom]           = useState(false)

  // ── Runtime state ────────────────────────────────────────────────────────────
  const [screen, setScreen]               = useState<ScreenState>('setup')
  const [remainingSeconds, setRemaining]  = useState(0)
  const [elapsedSeconds, setElapsed]      = useState(0)
  const [showDigits, setShowDigits]       = useState(false)
  const [recoverySeconds, setRecovery]    = useState(RECOVERY_LOCK_MINUTES * 60)
  const [bufferSeconds, setBufferSeconds] = useState(NATURE_BUFFER_SECONDS)

  // ── Refs (timer) ─────────────────────────────────────────────────────────────
  const startTimeRef        = useRef(0)          // epoch ms of session start
  const pausedMsRef         = useRef(0)          // total paused milliseconds
  const pauseStartRef       = useRef(0)          // epoch ms when current pause started
  const durationSecRef      = useRef(0)          // session duration in seconds
  const intervalRef         = useRef<ReturnType<typeof setInterval> | null>(null)
  const recoveryIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const bufferIntervalRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const sessionSavedRef     = useRef(false)
  const quickStartedRef     = useRef(false)

  // ── "Park the thought" quick-capture ──────────────────────────────────────
  const [parkOpen, setParkOpen] = useState(false)
  const [parkText, setParkText] = useState('')
  const { addTask, userId } = useStore()

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
    }
    addTask(task)
    if (userId) {
      try {
        await supabase.from('tasks').insert({
          id: task.id, user_id: userId, title: task.title,
          pool: task.pool, status: task.status, difficulty: task.difficulty,
          estimated_minutes: task.estimatedMinutes, parent_task_id: null, position: 0,
        } as never)
      } catch { /* non-blocking */ }
    }
    setParkText('')
    setParkOpen(false)
  }, [parkText, addTask, userId])

  const allTasks = [...nowPool, ...nextPool].filter(t => t.status === 'active')

  // Cleanup on unmount
  useEffect(() => () => {
    if (intervalRef.current)         clearInterval(intervalRef.current)
    if (recoveryIntervalRef.current) clearInterval(recoveryIntervalRef.current)
    if (bufferIntervalRef.current)   clearInterval(bufferIntervalRef.current)
  }, [])

  // ── Save session to DB (non-blocking) ────────────────────────────────────────
  const saveSession = useCallback(async (
    elapsedMs: number,
    phaseReached: SessionPhase,
  ) => {
    if (sessionSavedRef.current || !activeSession) return
    sessionSavedRef.current = true
    try {
      const row: FocusSessionInsert = {
        task_id:       activeSession.taskId,
        user_id:       '',  // filled by RLS / trigger
        started_at:    activeSession.startedAt,
        audio_preset:  activePreset,
        duration_ms:   elapsedMs,
        phase_reached: phaseReached === 'idle' ? null : phaseReached,
        energy_before: null,
      }
      await supabase.from('focus_sessions').insert(row as never)
      updateLastSession()
    } catch { /* non-critical — offline or unauthenticated */ }
  }, [activeSession, activePreset, updateLastSession])

  // ── Start nature buffer ─────────────────────────────────────────────────────
  const startNatureBuffer = useCallback(() => {
    setBufferSeconds(NATURE_BUFFER_SECONDS)
    setScreen('nature-buffer')
    // Play nature audio during buffer
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

  // ── Session end handler ───────────────────────────────────────────────────────
  const handleSessionEnd = useCallback((wasCompleted: boolean) => {
    if (intervalRef.current) clearInterval(intervalRef.current)

    const elapsedMs = Date.now() - startTimeRef.current - pausedMsRef.current
    const elapsedMin = Math.floor(elapsedMs / 60_000)
    void saveSession(elapsedMs, sessionPhase)

    // Toast + haptic
    if (elapsedMin >= 1) {
      notifyFocusEnd(elapsedMin)
      hapticDone()
    }

    // Achievements
    if (wasCompleted) {
      const tryUnlock = (key: string) => {
        if (!hasAchievement(key)) {
          unlockAchievement(key)
          const def = ACHIEVEMENT_DEFINITIONS.find(a => a.key === key)
          if (def) notifyAchievement(def.name, def.emoji, def.description)
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
      // Mandatory 10-min recovery lock after 90-min session
      setRecovery(RECOVERY_LOCK_MINUTES * 60)
      setScreen('recovery-lock')
      recoveryIntervalRef.current = setInterval(() => {
        setRecovery(s => {
          if (s <= 1) {
            clearInterval(recoveryIntervalRef.current!)
            setScreen('setup')
            return 0
          }
          return s - 1
        })
      }, 1000)
    } else if (wasCompleted) {
      // Nature buffer between sessions
      startNatureBuffer()
    } else {
      setScreen('setup')
    }
  }, [sessionPhase, saveSession, stopAudio, setPreset, endSession,
      hasAchievement, unlockAchievement, startNatureBuffer])

  // ── visibilitychange: correct timer when returning from background ──────
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

  // ── Interval runner (shared between start & resume) ───────────────────────────
  const startInterval = useCallback(() => {
    const durationSec = durationSecRef.current
    intervalRef.current = setInterval(() => {
      const netElapsedMs = Date.now() - startTimeRef.current - pausedMsRef.current
      const elapsed      = Math.floor(netElapsedMs / 1000)
      const remaining    = Math.max(0, durationSec - elapsed)

      setElapsed(elapsed)
      setRemaining(remaining)
      setPhase(getPhase(elapsed / 60))

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
    sessionSavedRef.current = false

    startSession(selectedTask?.id ?? null, duration, focusAnchor ?? null)
    if (focusAnchor) play(focusAnchor)

    setRemaining(durationSec)
    setElapsed(0)
    setPhase('struggle')
    setShowDigits(false)
    setScreen('session')

    startInterval()
  }, [showCustom, customDuration, selectedDuration, selectedTask, focusAnchor,
      play, startSession, setPhase, startInterval])

  // ── Quick-start auto detection ─────────────────────────────────────────────
  useEffect(() => {
    if (isQuickStart && !quickStartedRef.current && screen === 'setup') {
      quickStartedRef.current = true
      // Auto-start with 5 minutes, no task, sound anchor or brown noise
      handleStart(5)
    }
  }, [isQuickStart, screen, handleStart])

  // ── Stop → interrupt confirm ───────────────────────────────────────────────
  const handleStop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    pauseStartRef.current = Date.now()
    setScreen('interrupt-confirm')
  }, [])

  // ── Resume from interrupt confirm ────────────────────────────────────────────
  const handleResume = useCallback(() => {
    pausedMsRef.current += Date.now() - pauseStartRef.current
    setScreen('session')
    startInterval()
  }, [startInterval])

  // ── Confirm end from interrupt screen ─────────────────────────────────────────
  const handleConfirmStop = useCallback(() => {
    handleSessionEnd(false)
  }, [handleSessionEnd])

  // ── Skip nature buffer ─────────────────────────────────────────────────────
  const handleSkipBuffer = useCallback(() => {
    if (bufferIntervalRef.current) clearInterval(bufferIntervalRef.current)
    stopAudio()
    setPreset(null)
    setScreen('setup')
  }, [stopAudio, setPreset])

  // ── Audio toggle during session ───────────────────────────────────────────────
  const handleAudioToggle = useCallback(() => {
    if (isPlaying) {
      stopAudio()
    } else {
      const preset: AudioPreset = (focusAnchor ?? activePreset ?? 'brown')
      play(preset)
      setPreset(preset)
    }
  }, [isPlaying, focusAnchor, activePreset, play, stopAudio, setPreset])

  const progress  = durationSecRef.current > 0 ? 1 - remainingSeconds / durationSecRef.current : 0
  const isFlow    = sessionPhase === 'flow'
  const elapsedMin = Math.floor(elapsedSeconds / 60)

  // ── Energy label for setup screen ─────────────────────────────────────────
  const energyLabel = useMemo(() => {
    if (energyLevel <= 2) return { text: 'Low energy — starting small 🌱', color: '#4ECDC4' }
    if (energyLevel === 3) return { text: 'Steady energy — classic focus 🎯', color: '#6C63FF' }
    return { text: 'High energy — deep work time 🚀', color: '#FFE66D' }
  }, [energyLevel])

  // ─────────────────────────────────────────────────────────────────────────────
  // NATURE BUFFER SCREEN (2 min between sessions)
  // ─────────────────────────────────────────────────────────────────────────────

  if (screen === 'nature-buffer') {
    const bm = Math.floor(bufferSeconds / 60)
    const bs = bufferSeconds % 60
    return (
      <div
        className="flex flex-col items-center justify-center min-h-screen px-6 text-center"
        style={{ background: '#0F1117' }}
      >
        <motion.div
          initial={reducedMotion ? {} : { opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center"
        >
          <div className="text-5xl mb-6">🌿</div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: '#4ECDC4' }}>
            Nature Buffer
          </h2>
          <p className="text-sm mb-8 max-w-xs leading-relaxed" style={{ color: '#8B8BA7' }}>
            Let your mind settle. Nature sounds are playing softly to ease the transition.
          </p>

          <div
            className="px-8 py-4 rounded-2xl mb-6"
            style={{ background: '#1A1D2E', border: '1.5px solid #2D3150' }}
          >
            <p className="font-mono text-3xl font-bold" style={{ color: '#4ECDC4' }}>
              {bm}:{bs.toString().padStart(2, '0')}
            </p>
            <p className="text-xs mt-1" style={{ color: '#8B8BA7' }}>transition time</p>
          </div>

          {/* Volume down is fine, skip too */}
          <button
            onClick={handleSkipBuffer}
            className="px-6 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
            style={{
              background: 'transparent',
              border: '1.5px solid #2D3150',
              color: '#8B8BA7',
            }}
          >
            Skip → Ready for more
          </button>
        </motion.div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SETUP SCREEN
  // ─────────────────────────────────────────────────────────────────────────────

  if (screen === 'setup') {
    return (
      <div className="flex flex-col min-h-screen pb-28" style={{ background: '#0F1117' }}>
        <div className="px-5 pt-10 pb-4">
          <h1 className="text-2xl font-bold" style={{ color: '#E8E8F0' }}>
            Focus Session ⏱️
          </h1>
          <p className="text-sm mt-1" style={{ color: energyLabel.color }}>
            {energyLabel.text}
          </p>
        </div>

        {/* Task picker */}
        {allTasks.length > 0 && (
          <div className="px-5 mb-6">
            <p className="text-xs font-medium mb-2" style={{ color: '#8B8BA7' }}>TASK (OPTIONAL)</p>
            <div className="flex flex-col gap-2">

              {/* Open focus */}
              <button
                onClick={() => setSelectedTask(null)}
                className="flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200"
                style={{
                  background: selectedTask === null ? 'rgba(108,99,255,0.1)' : '#1A1D2E',
                  border: `1.5px solid ${selectedTask === null ? '#6C63FF' : '#2D3150'}`,
                }}
              >
                <span>🧠</span>
                <span className="text-sm" style={{ color: selectedTask === null ? '#6C63FF' : '#E8E8F0' }}>
                  Open focus — no specific task
                </span>
              </button>

              {allTasks.slice(0, 5).map(task => {
                const isSelected = selectedTask?.id === task.id
                return (
                  <button
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className="flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200"
                    style={{
                      background: isSelected ? 'rgba(108,99,255,0.1)' : '#1A1D2E',
                      border: `1.5px solid ${isSelected ? '#6C63FF' : '#2D3150'}`,
                    }}
                  >
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-md font-medium"
                      style={{ background: '#2D3150', color: '#8B8BA7' }}
                    >
                      {task.pool === 'now' ? 'NOW' : 'NEXT'}
                    </span>
                    <span className="text-sm flex-1" style={{ color: isSelected ? '#6C63FF' : '#E8E8F0' }}>
                      {task.title}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Duration presets */}
        <div className="px-5 mb-6">
          <p className="text-xs font-medium mb-2" style={{ color: '#8B8BA7' }}>
            DURATION
            <span className="ml-2 font-normal" style={{ color: '#6C63FF' }}>
              (smart: {smartDuration}m)
            </span>
          </p>
          <div className="flex gap-2">
            {TIMER_PRESETS.map(min => {
              const isActive = selectedDuration === min && !showCustom
              const isRecommended = min === smartDuration
              return (
                <button
                  key={min}
                  onClick={() => { setSelectedDuration(min); setShowCustom(false) }}
                  className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all duration-200 relative"
                  style={{
                    background:  isActive ? 'rgba(108,99,255,0.15)' : '#1A1D2E',
                    border:      `1.5px solid ${isActive ? '#6C63FF' : '#2D3150'}`,
                    color:       isActive ? '#6C63FF' : '#E8E8F0',
                  }}
                >
                  {min}m
                  {isRecommended && (
                    <span
                      className="absolute -top-1.5 -right-1.5 text-xs w-4 h-4 flex items-center justify-center rounded-full"
                      style={{ background: '#6C63FF', color: 'white', fontSize: '8px' }}
                    >
                      ✦
                    </span>
                  )}
                </button>
              )
            })}
            <button
              onClick={() => setShowCustom(true)}
              className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all duration-200"
              style={{
                background: showCustom ? 'rgba(108,99,255,0.15)' : '#1A1D2E',
                border:     `1.5px solid ${showCustom ? '#6C63FF' : '#2D3150'}`,
                color:      showCustom ? '#6C63FF' : '#8B8BA7',
              }}
            >
              ✎
            </button>
          </div>

          {showCustom && (
            <div className="mt-3 flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="180"
                value={customDuration}
                onChange={e => setCustomDuration(e.target.value)}
                placeholder="Minutes..."
                autoFocus
                className="flex-1 px-4 py-2.5 rounded-xl text-sm focus:outline-none"
                style={{ background: '#1A1D2E', border: '1.5px solid #6C63FF', color: '#E8E8F0' }}
              />
              <span className="text-sm" style={{ color: '#8B8BA7' }}>min</span>
            </div>
          )}
        </div>

        {/* Sound anchor indicator */}
        {focusAnchor && (
          <div
            className="mx-5 mb-6 p-3 rounded-xl flex items-center gap-3"
            style={{ background: '#1A1D2E', border: '1.5px solid #2D3150' }}
          >
            <span>🎯</span>
            <div>
              <p className="text-xs font-medium" style={{ color: '#E8E8F0' }}>Sound Anchor ready</p>
              <p className="text-xs" style={{ color: '#8B8BA7' }}>
                {focusAnchor} noise will play automatically
              </p>
            </div>
          </div>
        )}

        {/* Start button */}
        <div className="px-5">
          <button
            onClick={() => handleStart()}
            className="w-full py-4 rounded-2xl font-bold text-base transition-all duration-200"
            style={{
              background: 'linear-gradient(135deg, #6C63FF, #8B7FF7)',
              color: 'white',
              boxShadow: '0 8px 32px rgba(108,99,255,0.3)',
            }}
          >
            Start Focus →
          </button>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RECOVERY LOCK SCREEN
  // ─────────────────────────────────────────────────────────────────────────────

  if (screen === 'recovery-lock') {
    const rm = Math.floor(recoverySeconds / 60)
    const rs = recoverySeconds % 60
    return (
      <div
        className="flex flex-col items-center justify-center min-h-screen px-6 text-center"
        style={{ background: '#0F1117' }}
      >
        <div className="text-5xl mb-6">🌿</div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: '#FFE66D' }}>
          Recovery Time
        </h2>
        <p className="text-sm mb-8 max-w-xs leading-relaxed" style={{ color: '#8B8BA7' }}>
          You completed 90 minutes of deep focus. Your brain needs a real break — step away, breathe, stretch.
        </p>
        <div
          className="px-8 py-4 rounded-2xl mb-4"
          style={{ background: '#1A1D2E', border: '1.5px solid #2D3150' }}
        >
          <p className="font-mono text-3xl font-bold" style={{ color: '#FFE66D' }}>
            {rm}:{rs.toString().padStart(2, '0')}
          </p>
          <p className="text-xs mt-1" style={{ color: '#8B8BA7' }}>until next session</p>
        </div>
        <p className="text-xs" style={{ color: '#8B8BA7' }}>
          Skipping recovery reduces future focus quality 🧠
        </p>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // INTERRUPT CONFIRM SCREEN
  // ─────────────────────────────────────────────────────────────────────────────

  if (screen === 'interrupt-confirm') {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-screen px-6 text-center"
        style={{ background: '#0F1117' }}
      >
        <div className="text-4xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold mb-2" style={{ color: '#E8E8F0' }}>
          Leave focus session?
        </h2>
        <p className="text-sm mb-8 max-w-xs leading-relaxed" style={{ color: '#8B8BA7' }}>
          You've been focused for {elapsedMin}m. Your progress will be saved.
        </p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={handleResume}
            className="w-full py-3.5 rounded-2xl font-semibold text-sm transition-all duration-200"
            style={{
              background: 'rgba(108,99,255,0.15)',
              border: '1.5px solid #6C63FF',
              color: '#6C63FF',
            }}
          >
            Keep going 💪
          </button>
          <button
            onClick={handleConfirmStop}
            className="w-full py-3 rounded-2xl font-medium text-sm transition-all duration-200"
            style={{
              background: 'transparent',
              border: '1.5px solid #2D3150',
              color: '#8B8BA7',
            }}
          >
            End session
          </button>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ACTIVE SESSION SCREEN
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen px-6"
      style={{ background: '#0F1117' }}
    >
      {/* Phase label — hidden in flow mode */}
      <AnimatePresence mode="wait">
        {!isFlow && PHASE_LABELS[sessionPhase] && (
          <motion.p
            key={sessionPhase}
            initial={reducedMotion ? {} : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="text-sm mb-6 text-center"
            style={{ color: '#8B8BA7' }}
          >
            {PHASE_LABELS[sessionPhase]}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Arc timer */}
      <ArcTimer
        progress={progress}
        remainingSeconds={remainingSeconds}
        phase={sessionPhase}
        showDigits={showDigits}
        onToggleDigits={() => setShowDigits(d => !d)}
      />

      {/* Task title */}
      {selectedTask && (
        <motion.p
          animate={{ opacity: isFlow ? 0.5 : 1 }}
          transition={{ duration: 0.5 }}
          className="text-base font-semibold mt-6 text-center max-w-xs leading-snug"
          style={{ color: '#E8E8F0' }}
        >
          {selectedTask.title}
        </motion.p>
      )}

      {/* Controls — fade out in flow */}
      <AnimatePresence>
        {!isFlow && (
          <motion.div
            initial={reducedMotion ? {} : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center gap-4 mt-8"
          >
            {/* Audio toggle */}
            <button
              onClick={handleAudioToggle}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm transition-all duration-200"
              style={{
                background: isPlaying ? 'rgba(78,205,196,0.12)' : '#1A1D2E',
                border: `1.5px solid ${isPlaying ? '#4ECDC4' : '#2D3150'}`,
                color: isPlaying ? '#4ECDC4' : '#8B8BA7',
              }}
            >
              {isPlaying ? '🔊 Sound on' : '🔇 Sound off'}
            </button>

            {/* End session */}
            <button
              onClick={handleStop}
              className="px-6 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
              style={{
                background: 'transparent',
                border: '1.5px solid #2D3150',
                color: '#8B8BA7',
              }}
            >
              End session
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── "Park the thought" — quick capture without leaving focus ────── */}
      <div className="fixed bottom-8 right-5 z-30">
        <AnimatePresence>
          {parkOpen && (
            <motion.div
              initial={reducedMotion ? {} : { opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="mb-3 p-3 rounded-2xl w-64"
              style={{ background: '#1A1D2E', border: '1.5px solid #2D3150' }}
            >
              <p className="text-xs font-medium mb-2" style={{ color: '#8B8BA7' }}>
                💭 Park a thought (goes to Someday)
              </p>
              <input
                value={parkText}
                onChange={e => setParkText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') void handleParkThought() }}
                placeholder="Quick note..."
                autoFocus
                className="w-full px-3 py-2 rounded-xl text-sm outline-none mb-2"
                style={{ background: '#252840', border: '1px solid #2D3150', color: '#E8E8F0' }}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => void handleParkThought()}
                  disabled={!parkText.trim()}
                  className="flex-1 py-1.5 rounded-lg text-xs font-medium"
                  style={{ background: parkText.trim() ? '#6C63FF' : '#2D3150', color: 'white' }}
                >
                  Save
                </button>
                <button
                  onClick={() => { setParkOpen(false); setParkText('') }}
                  className="py-1.5 px-3 rounded-lg text-xs"
                  style={{ color: '#8B8BA7' }}
                >
                  ✕
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={() => setParkOpen(p => !p)}
          className="w-11 h-11 rounded-full flex items-center justify-center text-lg shadow-lg"
          style={{
            background: parkOpen ? '#6C63FF' : '#1A1D2E',
            border: `1.5px solid ${parkOpen ? '#6C63FF' : '#2D3150'}`,
          }}
          aria-label="Park a thought"
        >
          💭
        </button>
      </div>
    </div>
  )
}
