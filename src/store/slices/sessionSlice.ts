import { type StateCreator } from 'zustand'
import type { AppStore } from '../types'
import type { AudioPreset, SessionPhase, ActiveSession } from '@/types'

export interface SessionSlice {
  activeSession: ActiveSession | null
  sessionPhase: SessionPhase
  timerSeconds: number
  timerRunning: boolean
  startSession: (taskId: string | null, durationMinutes: number, preset: AudioPreset | null) => void
  endSession: () => void
  pauseTimer: () => void
  resumeTimer: () => void
  setPhase: (phase: SessionPhase) => void
  tickTimer: () => void
  resetSession: () => void
}

export const createSessionSlice: StateCreator<
  AppStore,
  [['zustand/subscribeWithSelector', never], ['zustand/persist', unknown]],
  [],
  SessionSlice
> = (set) => ({
  activeSession: null,
  sessionPhase: 'idle',
  timerSeconds: 0,
  timerRunning: false,

  startSession: (taskId, durationMinutes, preset) => set({
    activeSession: {
      id: crypto.randomUUID(),
      taskId,
      startedAt: new Date().toISOString(),
      durationMs: durationMinutes * 60 * 1000,
      phase: 'struggle',
      audioPreset: preset,
    },
    sessionPhase: 'struggle',
    timerSeconds: durationMinutes * 60,
    timerRunning: true,
  }),

  endSession: () => set({
    activeSession: null,
    sessionPhase: 'idle',
    timerSeconds: 0,
    timerRunning: false,
  }),

  pauseTimer: () => set({ timerRunning: false }),
  resumeTimer: () => set({ timerRunning: true }),
  setPhase: (phase) => set((s) => ({
    sessionPhase: phase,
    activeSession: s.activeSession ? { ...s.activeSession, phase } : null,
  })),

  tickTimer: () => set((s) => {
    if (!s.timerRunning || s.timerSeconds <= 0) return s
    return { timerSeconds: s.timerSeconds - 1 }
  }),

  resetSession: () => set({
    activeSession: null, sessionPhase: 'idle', timerSeconds: 0, timerRunning: false,
  }),
})
