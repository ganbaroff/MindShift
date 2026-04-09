/**
 * useSessionEnd — post-session screen transitions + recovery/buffer timers
 *
 * Owns:
 * - handleSessionEnd: XP awards, achievement unlocks, Volaura event, nature-buffer/recovery routing
 * - startNatureBuffer: 2-min nature sound interlude
 * - handleSkipBuffer: skip interlude early
 * - handleBypassRecovery: skip mandatory rest (developer override)
 * - recoverySeconds / bufferSeconds countdown state
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import type { MutableRefObject } from 'react'
import { isVolauraConfigured } from '@/shared/lib/volaura-bridge'
import { logEvent } from '@/shared/lib/logger'
import { useStore } from '@/store'
import { notifyFocusEnd, notifyAchievement, pushFocusComplete, pushRecoveryEnd } from '@/shared/lib/notify'
import { nativeRequestReview } from '@/shared/lib/native'
import { hapticDone } from '@/shared/lib/haptic'
import { getToneCopy } from '@/shared/lib/uiTone'
import { ACHIEVEMENT_DEFINITIONS } from '@/types'
import { MAX_SESSION_MINUTES, RECOVERY_LOCK_MINUTES, NATURE_BUFFER_SECONDS } from '@/shared/lib/constants'
import type { SessionPhase, AudioPreset, EnergyLevel } from '@/types'

// ScreenState is defined here (owns post-session screens) and re-exported
export type ScreenState =
  | 'setup'
  | 'session'
  | 'interrupt-confirm'
  | 'bookmark-capture'
  | 'recovery-lock'
  | 'nature-buffer'
  | 'hard-stop'

interface UseSessionEndParams {
  sessionPhase: SessionPhase
  activePreset: AudioPreset | null
  isPlaying: boolean
  energyBeforeRef: MutableRefObject<EnergyLevel | null>
  intervalRef: MutableRefObject<ReturnType<typeof setInterval> | null>
  startTimeRef: MutableRefObject<number>
  pausedMsRef: MutableRefObject<number>
  durationSecRef: MutableRefObject<number>
  saveSession: (elapsedMs: number, phase: SessionPhase) => Promise<void>
  stopAudio: () => void
  setPreset: (preset: AudioPreset | null) => void
  endSession: () => void
  hasAchievement: (key: string) => boolean
  unlockAchievement: (key: string) => void
  play: (preset: AudioPreset) => void
  setScreen: (screen: ScreenState) => void
}

export function useSessionEnd({
  sessionPhase, activePreset, isPlaying, energyBeforeRef,
  intervalRef, startTimeRef, pausedMsRef, durationSecRef,
  saveSession, stopAudio, setPreset, endSession,
  hasAchievement, unlockAchievement, play, setScreen,
}: UseSessionEndParams) {
  const [recoverySeconds, setRecovery]    = useState(RECOVERY_LOCK_MINUTES * 60)
  const [bufferSeconds, setBufferSeconds] = useState(NATURE_BUFFER_SECONDS)
  const recoveryIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const bufferIntervalRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  // Pending VOLAURA session data — populated at session end, consumed in handlePostEnergy
  // with the real post-session energy_after (not the stale energyBefore value)
  const pendingSessionRef   = useRef<{
    durationMinutes: number
    phase: string
    energyBefore: number
    psychotype: string | null
  } | null>(null)

  // Cleanup intervals on unmount — prevents timer accumulation if FocusScreen unmounts mid-countdown
  useEffect(() => {
    return () => {
      if (bufferIntervalRef.current)   clearInterval(bufferIntervalRef.current)
      if (recoveryIntervalRef.current) clearInterval(recoveryIntervalRef.current)
    }
  }, [])

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
  }, [play, stopAudio, setPreset, setScreen])

  const handleSessionEnd = useCallback((wasCompleted: boolean) => {
    if (intervalRef.current) clearInterval(intervalRef.current)

    const elapsedMs  = Date.now() - startTimeRef.current - pausedMsRef.current
    const elapsedMin = Math.floor(elapsedMs / 60_000)
    void saveSession(elapsedMs, sessionPhase)

    if (elapsedMin >= 1) { notifyFocusEnd(elapsedMin); hapticDone() }
    if (elapsedMin >= 1) pushFocusComplete(elapsedMin)

    logEvent('session_ended', { completed: wasCompleted ? 1 : 0, duration_min: elapsedMin, phase: sessionPhase })
    if (wasCompleted) {
      const installDate = useStore.getState().installDate
      const daysSinceInstall = installDate
        ? Math.floor((Date.now() - new Date(installDate).getTime()) / 86_400_000)
        : undefined
      logEvent('session_completed', { duration_min: elapsedMin, phase: sessionPhase, energy_before: useStore.getState().energyLevel, audio_active: isPlaying ? 1 : 0, ...(daysSinceInstall != null && { days_since_install: daysSinceInstall }) })
      const lastActive = useStore.getState().lastActiveDate
      if (lastActive) {
        const gapDays = (Date.now() - new Date(lastActive).getTime()) / 86_400_000
        if (gapDays >= 2) logEvent('streak_recovered', { gap_days: Math.floor(gapDays), grace_shown: 0 })
      }
    }

    if (wasCompleted) {
      const storeState = useStore.getState()
      const toneCopy = getToneCopy(storeState.uiTone)
      const tryUnlock = (key: string) => {
        if (!hasAchievement(key)) {
          unlockAchievement(key)
          const def = ACHIEVEMENT_DEFINITIONS.find(a => a.key === key)
          if (def) notifyAchievement(toneCopy.badgeUnlocked(def.name), def.emoji, def.description)
        }
      }
      if (durationSecRef.current >= 52 * 60) tryUnlock('flow_rider')
      if (sessionPhase === 'flow')            tryUnlock('full_cycle')
      if (durationSecRef.current <= 5 * 60)  tryUnlock('five_min_hero')
      if (isPlaying || activePreset !== null) tryUnlock('quiet_mind')

      const sessionXP =
        elapsedMin < 10  ? 5 :
        elapsedMin <= 25 ? 15 :
        elapsedMin <= 45 ? 25 : 40
      storeState.addXP(sessionXP)

      // Aha moment — first ever focus session completed
      if (storeState.completedFocusSessions === 0) {
        tryUnlock('first_focus')
        logEvent('first_session_completed', { duration_min: elapsedMin })
      }

      storeState.incrementFocusSessions()

      // In-App Review — trigger on 3rd session (feel-good moment, not low energy)
      // OS rate-limits actual dialog; calling at the right milestone maximises conversion.
      // completedFocusSessions is pre-increment here (0-indexed), so === 2 means 3rd session.
      const isLowEnergy = storeState.energyLevel <= 2
      if (storeState.completedFocusSessions === 2 && !isLowEnergy) {
        nativeRequestReview()
      }

      if (isVolauraConfigured() && storeState.userId && !storeState.userId.startsWith('guest_')) {
        // Store session data — sendFocusSession fires in handlePostEnergy once
        // the user picks their post-session energy (energy_after becomes accurate)
        pendingSessionRef.current = {
          durationMinutes: elapsedMin,
          phase: sessionPhase,
          energyBefore: energyBeforeRef.current ?? 3,
          psychotype: storeState.psychotype ?? null,
        }
      }
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
  }, [sessionPhase, isPlaying, activePreset, energyBeforeRef,
      intervalRef, startTimeRef, pausedMsRef, durationSecRef,
      saveSession, stopAudio, setPreset, endSession,
      hasAchievement, unlockAchievement, startNatureBuffer, setScreen])

  const handleSkipBuffer = useCallback(() => {
    logEvent('nature_buffer_skipped', {
      buffer_elapsed_sec: NATURE_BUFFER_SECONDS - bufferSeconds,
      session_minutes: Math.floor(durationSecRef.current / 60),
    })
    if (bufferIntervalRef.current) clearInterval(bufferIntervalRef.current)
    stopAudio()
    setPreset(null)
    setScreen('setup')
  }, [bufferSeconds, durationSecRef, stopAudio, setPreset, setScreen])

  const handleBypassRecovery = useCallback(() => {
    logEvent('recovery_lock_bypassed', { recovery_elapsed_sec: RECOVERY_LOCK_MINUTES * 60 - recoverySeconds })
    if (recoveryIntervalRef.current) clearInterval(recoveryIntervalRef.current)
    setScreen('setup')
  }, [recoverySeconds, setScreen])

  return {
    recoverySeconds, bufferSeconds,
    handleSessionEnd, handleSkipBuffer, handleBypassRecovery,
    recoveryIntervalRef, bufferIntervalRef, pendingSessionRef,
  }
}
