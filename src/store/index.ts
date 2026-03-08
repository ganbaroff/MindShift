import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'
import type { Task, AudioPreset, SessionPhase, EnergyLevel, CognitiveMode, AppMode, Psychotype, ActiveSession, WeeklyStats, Achievement, WidgetConfig } from '@/types'
import { ACHIEVEMENT_DEFINITIONS, WIDGET_DEFAULTS, WIDGET_DEFAULTS_GENERIC } from '@/types'

// ── Psychotype derivation ─────────────────────────────────────────────────────
// Derives a personality profile from onboarding choices.
// system → planner | habit → connector | minimal+focused → achiever | minimal+overview → explorer
function derivePsychotype(mode: AppMode, cognitive: CognitiveMode): Psychotype {
  if (mode === 'system')  return 'planner'
  if (mode === 'habit')   return 'connector'
  if (cognitive === 'focused') return 'achiever'
  return 'explorer'
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface UserSlice {
  userId: string | null
  email: string | null
  cognitiveMode: CognitiveMode
  appMode: AppMode
  energyLevel: EnergyLevel
  psychotype: Psychotype | null
  avatarId: number
  xpTotal: number
  lastSessionAt: string | null
  onboardingCompleted: boolean
  recoveryShown: boolean   // flag: recovery overlay already shown this session
  setUser: (userId: string, email: string) => void
  setEnergyLevel: (level: EnergyLevel) => void
  setCognitiveMode: (mode: CognitiveMode) => void
  setAppMode: (mode: AppMode) => void
  setAvatarId: (id: number) => void
  addXP: (amount: number) => void
  setOnboardingCompleted: () => void
  setRecoveryShown: () => void
  updateLastSession: () => void
  signOut: () => void
}

interface TaskSlice {
  nowPool: Task[]
  nextPool: Task[]
  somedayPool: Task[]
  addTask: (task: Task) => void
  completeTask: (taskId: string) => void
  snoozeTask: (taskId: string) => void  // now → next
  moveTask: (taskId: string, toPool: Task['pool']) => void
  removeTask: (taskId: string) => void
  setTasks: (tasks: Task[]) => void
  archiveAllOverdue: () => string[]     // returns archived ids
}

interface SessionSlice {
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

interface AudioSlice {
  activePreset: AudioPreset | null
  audioVolume: number          // 0-1 (mapped to 0-70 dBA)
  audioPlaying: boolean
  focusAnchor: AudioPreset | null
  transitionBufferActive: boolean
  setPreset: (preset: AudioPreset | null) => void
  setVolume: (volume: number) => void
  setPlaying: (playing: boolean) => void
  setFocusAnchor: (preset: AudioPreset | null) => void
  setTransitionBuffer: (active: boolean) => void
}

interface ProgressSlice {
  achievements: Achievement[]
  weeklyStats: WeeklyStats | null
  unlockAchievement: (key: string) => void
  setWeeklyStats: (stats: WeeklyStats) => void
  hasAchievement: (key: string) => boolean
}

interface PreferencesSlice {
  reducedStimulation: boolean
  setReducedStimulation: (val: boolean) => void
  // Subscription state (trial mode — no actual charges)
  subscriptionTier: 'free' | 'pro_trial' | 'pro'
  trialEndsAt: string | null        // ISO timestamp
  setSubscription: (tier: 'free' | 'pro_trial' | 'pro', trialEnd?: string | null) => void
  isProActive: () => boolean
}

interface GridSlice {
  /** Ordered list of widget configs — drives BentoGrid layout */
  gridWidgets: WidgetConfig[]
  setGridWidgets: (widgets: WidgetConfig[]) => void
  /** Reset to psychotype-driven defaults (called after onboarding or psychotype change) */
  resetGridToDefaults: () => void
}

export type AppStore = UserSlice & TaskSlice & SessionSlice & AudioSlice & ProgressSlice & PreferencesSlice & GridSlice

// ── Store ─────────────────────────────────────────────────────────────────────

export const useStore = create<AppStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // ── User ────────────────────────────────────────────────────────────
        userId: null,
        email: null,
        cognitiveMode: 'focused',
        appMode: 'minimal',
        energyLevel: 3,
        psychotype: null,
        avatarId: 1,
        xpTotal: 0,
        lastSessionAt: null,
        onboardingCompleted: false,
        recoveryShown: false,

        setUser: (userId, email) => set({ userId, email }),
        setEnergyLevel: (level) => set({ energyLevel: level }),
        setCognitiveMode: (mode) => set((s) => ({
          cognitiveMode: mode,
          psychotype: derivePsychotype(s.appMode, mode),
        })),
        setAppMode: (mode) => set((s) => ({
          appMode: mode,
          psychotype: derivePsychotype(mode, s.cognitiveMode),
        })),
        setAvatarId: (id) => set({ avatarId: id }),
        addXP: (amount) => set((s) => ({ xpTotal: s.xpTotal + amount })),
        setOnboardingCompleted: () => set({ onboardingCompleted: true }),
        setRecoveryShown: () => set({ recoveryShown: true }),
        updateLastSession: () => set({ lastSessionAt: new Date().toISOString() }),
        signOut: () => set({
          userId: null, email: null, nowPool: [], nextPool: [], somedayPool: [],
          xpTotal: 0, onboardingCompleted: false, recoveryShown: false,
          lastSessionAt: null, achievements: initAchievements(),
        }),

        // ── Tasks ───────────────────────────────────────────────────────────
        nowPool: [],
        nextPool: [],
        somedayPool: [],

        addTask: (task) => set((s) => {
          if (task.pool === 'now')  return { nowPool: [...s.nowPool, task] }
          if (task.pool === 'next') return { nextPool: [...s.nextPool, task] }
          return { somedayPool: [...s.somedayPool, task] }
        }),

        completeTask: (taskId) => set((s) => {
          const now = new Date().toISOString()
          const complete = (tasks: Task[]) =>
            tasks.map(t => t.id === taskId ? { ...t, status: 'completed' as const, completedAt: now } : t)
          return {
            nowPool: complete(s.nowPool),
            nextPool: complete(s.nextPool),
            somedayPool: complete(s.somedayPool),
          }
        }),

        snoozeTask: (taskId) => set((s) => {
          const task = s.nowPool.find(t => t.id === taskId)
          if (!task) return s
          return {
            nowPool: s.nowPool.filter(t => t.id !== taskId),
            nextPool: [...s.nextPool, { ...task, pool: 'next', snoozeCount: task.snoozeCount + 1 }],
          }
        }),

        moveTask: (taskId, toPool) => set((s) => {
          const allTasks = [...s.nowPool, ...s.nextPool, ...s.somedayPool]
          const task = allTasks.find(t => t.id === taskId)
          if (!task) return s
          const updated = { ...task, pool: toPool }
          const filter = (tasks: Task[]) => tasks.filter(t => t.id !== taskId)
          return {
            nowPool:     toPool === 'now'     ? [...filter(s.nowPool), updated]     : filter(s.nowPool),
            nextPool:    toPool === 'next'    ? [...filter(s.nextPool), updated]    : filter(s.nextPool),
            somedayPool: toPool === 'someday' ? [...filter(s.somedayPool), updated] : filter(s.somedayPool),
          }
        }),

        removeTask: (taskId) => set((s) => ({
          nowPool: s.nowPool.filter(t => t.id !== taskId),
          nextPool: s.nextPool.filter(t => t.id !== taskId),
          somedayPool: s.somedayPool.filter(t => t.id !== taskId),
        })),

        setTasks: (tasks) => set({
          nowPool:     tasks.filter(t => t.pool === 'now'),
          nextPool:    tasks.filter(t => t.pool === 'next'),
          somedayPool: tasks.filter(t => t.pool === 'someday'),
        }),

        archiveAllOverdue: () => {
          const s = get()
          const allActive = [...s.nowPool, ...s.nextPool]
            .filter(t => t.status === 'active')
          const ids = allActive.map(t => t.id)
          set((s) => ({
            nowPool: s.nowPool.filter(t => t.status !== 'active'),
            nextPool: s.nextPool.filter(t => t.status !== 'active'),
            somedayPool: [...s.somedayPool, ...allActive.map(t => ({ ...t, pool: 'someday' as const }))],
          }))
          return ids
        },

        // ── Session ─────────────────────────────────────────────────────────
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

        // ── Audio ───────────────────────────────────────────────────────────
        activePreset: null,
        audioVolume: 0.47,
        audioPlaying: false,
        focusAnchor: null,
        transitionBufferActive: false,

        setPreset: (preset) => set({ activePreset: preset }),
        setVolume: (volume) => set({ audioVolume: Math.min(1.0, Math.max(0, volume)) }),
        setPlaying: (playing) => set({ audioPlaying: playing }),
        setFocusAnchor: (preset) => set({ focusAnchor: preset }),
        setTransitionBuffer: (active) => set({ transitionBufferActive: active }),

        // ── Progress ─────────────────────────────────────────────────────────
        achievements: initAchievements(),
        weeklyStats: null,

        unlockAchievement: (key) => set((s) => ({
          achievements: s.achievements.map(a =>
            a.key === key && !a.unlockedAt
              ? { ...a, unlockedAt: new Date().toISOString() }
              : a
          ),
        })),

        setWeeklyStats: (stats) => set({ weeklyStats: stats }),
        hasAchievement: (key) => !!get().achievements.find(a => a.key === key)?.unlockedAt,

        // ── Grid ─────────────────────────────────────────────────────────
        gridWidgets: WIDGET_DEFAULTS_GENERIC,

        setGridWidgets: (widgets) => set({ gridWidgets: widgets }),

        resetGridToDefaults: () => {
          const psychotype = get().psychotype
          const defaults = psychotype ? WIDGET_DEFAULTS[psychotype] : WIDGET_DEFAULTS_GENERIC
          set({ gridWidgets: defaults })
        },

        // ── Preferences ────────────────────────────────────────────────────
        reducedStimulation: false,
        setReducedStimulation: (val) => set({ reducedStimulation: val }),

        subscriptionTier: 'free',
        trialEndsAt: null,
        setSubscription: (tier, trialEnd) => set({
          subscriptionTier: tier,
          trialEndsAt: trialEnd ?? null,
        }),
        isProActive: () => {
          const s = get()
          if (s.subscriptionTier === 'pro') return true
          if (s.subscriptionTier === 'pro_trial' && s.trialEndsAt) {
            return new Date(s.trialEndsAt).getTime() > Date.now()
          }
          return false
        },
      }),
      {
        name: 'mindshift-store',
        partialize: (s) => ({
          userId: s.userId,
          email: s.email,
          cognitiveMode: s.cognitiveMode,
          appMode: s.appMode,
          avatarId: s.avatarId,
          xpTotal: s.xpTotal,
          lastSessionAt: s.lastSessionAt,
          onboardingCompleted: s.onboardingCompleted,
          focusAnchor: s.focusAnchor,
          achievements: s.achievements,
          audioVolume: s.audioVolume,
          reducedStimulation: s.reducedStimulation,
          subscriptionTier: s.subscriptionTier,
          trialEndsAt: s.trialEndsAt,
          gridWidgets: s.gridWidgets,
          psychotype: s.psychotype,
        }),
      }
    )
  )
)

function initAchievements(): import('@/types').Achievement[] {
  return ACHIEVEMENT_DEFINITIONS.map(a => ({ ...a, unlockedAt: null }))
}

// ── Selectors ─────────────────────────────────────────────────────────────────
export const selectActiveTasks = (s: AppStore) =>
  s.nowPool.filter(t => t.status === 'active').slice(0, 3)

export const selectSessionProgress = (s: AppStore) => {
  if (!s.activeSession) return 0
  const elapsed = s.activeSession.durationMs / 1000 - s.timerSeconds
  return elapsed / (s.activeSession.durationMs / 1000)
}
