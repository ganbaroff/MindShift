import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'
import type { Task, AudioPreset, SessionPhase, EnergyLevel, CognitiveMode, AppMode, Psychotype, ActiveSession, WeeklyStats, Achievement, WidgetConfig } from '@/types'
import { ACHIEVEMENT_DEFINITIONS, WIDGET_DEFAULTS, WIDGET_DEFAULTS_GENERIC } from '@/types'
import {
  VR_BUCKET_SIZE, VR_JACKPOT_THRESHOLD, VR_BONUS_THRESHOLD,
  VR_MULTIPLIER_JACKPOT, VR_MULTIPLIER_BONUS, VR_MULTIPLIER_BASE,
} from '@/shared/lib/constants'

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
  // DEPRECATED: cognitiveMode replaced by appMode (Sprint B). Kept for localStorage compat.
  cognitiveMode: CognitiveMode
  appMode: AppMode
  energyLevel: EnergyLevel
  psychotype: Psychotype | null
  avatarId: number
  xpTotal: number
  lastSessionAt: string | null
  onboardingCompleted: boolean
  recoveryShown: boolean   // flag: recovery overlay already shown this session
  // ── Health & Rhythms (Block 1) ──────────────────────────────────────────────
  timerStyle: 'countdown' | 'countup' | 'surprise'
  sleepQuality: 1 | 2 | 3 | null        // session-only (not persisted)
  medicationEnabled: boolean
  medicationTime: 'morning' | 'afternoon' | 'evening' | null
  chronotype: 'lark' | 'owl' | 'varies' | null
  seasonalMode: 'launch' | 'maintain' | 'recover' | 'sandbox'
  burnoutScore: number                  // 0–100, computed (not persisted)
  flexiblePauseUntil: string | null     // ISO timestamp, null = no active pause
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
  setTimerStyle: (style: 'countdown' | 'countup' | 'surprise') => void
  setSleepQuality: (q: 1 | 2 | 3 | null) => void
  setMedicationEnabled: (val: boolean) => void
  setMedicationTime: (t: 'morning' | 'afternoon' | 'evening' | null) => void
  setChronotype: (c: 'lark' | 'owl' | 'varies' | null) => void
  setSeasonalMode: (m: 'launch' | 'maintain' | 'recover' | 'sandbox') => void
  setBurnoutScore: (score: number) => void
  setFlexiblePauseUntil: (until: string | null) => void
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
  setTaskDueDate: (id: string, dueDate: string | null, dueTime: string | null) => void
  setTaskType: (id: string, type: 'task' | 'idea' | 'reminder') => void
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
  /** Lifetime total of completed tasks — incremented on each completeTask call */
  completedTotal: number
  unlockAchievement: (key: string) => void
  setWeeklyStats: (stats: WeeklyStats) => void
  hasAchievement: (key: string) => boolean
}

interface PreferencesSlice {
  reducedStimulation: boolean
  setReducedStimulation: (val: boolean) => void
  // Progressive disclosure — tracks which coach marks have been seen
  seenHints: string[]
  markHintSeen: (id: string) => void
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
        // Health & Rhythms
        timerStyle: 'countdown' as const,
        sleepQuality: null,
        medicationEnabled: false,
        medicationTime: null,
        chronotype: null,
        seasonalMode: 'launch' as const,
        burnoutScore: 0,
        flexiblePauseUntil: null,

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
        addXP: (amount) => set((s) => {
          // Research #5: Variable Ratio XP schedule — unpredictable rewards sustain ADHD motivation
          // 8% jackpot (2×) | 17% bonus (1.5×) | 75% base (1×) — rolling per VR_BUCKET_SIZE
          const bucket = s.completedTotal % VR_BUCKET_SIZE
          const multiplier =
            bucket < VR_JACKPOT_THRESHOLD ? VR_MULTIPLIER_JACKPOT :
            bucket < VR_BONUS_THRESHOLD   ? VR_MULTIPLIER_BONUS :
                                            VR_MULTIPLIER_BASE
          return { xpTotal: s.xpTotal + Math.round(amount * multiplier) }
        }),
        setOnboardingCompleted: () => set({ onboardingCompleted: true }),
        setRecoveryShown: () => set({ recoveryShown: true }),
        updateLastSession: () => set({ lastSessionAt: new Date().toISOString() }),
        // Health & Rhythms setters
        setTimerStyle: (style) => set({ timerStyle: style }),
        setSleepQuality: (q) => set({ sleepQuality: q }),
        setMedicationEnabled: (val) => set({ medicationEnabled: val }),
        setMedicationTime: (t) => set({ medicationTime: t }),
        setChronotype: (c) => set({ chronotype: c }),
        setSeasonalMode: (m) => set({ seasonalMode: m }),
        setBurnoutScore: (score) => set({ burnoutScore: score }),
        setFlexiblePauseUntil: (until) => set({ flexiblePauseUntil: until }),
        signOut: () => set({
          // User slice
          userId: null, email: null, xpTotal: 0,
          onboardingCompleted: false, recoveryShown: false, lastSessionAt: null,
          // Health & Rhythms — reset to defaults on sign out
          timerStyle: 'countdown' as const,
          sleepQuality: null, medicationEnabled: false, medicationTime: null,
          chronotype: null, seasonalMode: 'launch' as const,
          burnoutScore: 0, flexiblePauseUntil: null,
          // Task slice
          nowPool: [], nextPool: [], somedayPool: [],
          // Session slice — prevent stale focus sessions from persisting
          activeSession: null, sessionPhase: 'idle' as const,
          timerSeconds: 0, timerRunning: false,
          // Audio slice
          activePreset: null, audioPlaying: false, audioVolume: 0.55,
          focusAnchor: null, transitionBufferActive: false,
          // Progress slice
          achievements: initAchievements(), weeklyStats: null, completedTotal: 0,
          // Preferences slice — prevent Pro state leaking between users
          reducedStimulation: false, seenHints: [],
          subscriptionTier: 'free' as const, trialEndsAt: null,
          // Grid slice
          gridWidgets: WIDGET_DEFAULTS_GENERIC,
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
          const wasActive = [...s.nowPool, ...s.nextPool, ...s.somedayPool]
            .some(t => t.id === taskId && t.status === 'active')
          return {
            nowPool: complete(s.nowPool),
            nextPool: complete(s.nextPool),
            somedayPool: complete(s.somedayPool),
            // Research #5: track cumulative effort (task total), never consecutive
            completedTotal: wasActive ? s.completedTotal + 1 : s.completedTotal,
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

        setTaskDueDate: (id, dueDate, dueTime) => set((s) => {
          const update = (tasks: Task[]) =>
            tasks.map(t => t.id === id ? { ...t, dueDate, dueTime } : t)
          return {
            nowPool: update(s.nowPool),
            nextPool: update(s.nextPool),
            somedayPool: update(s.somedayPool),
          }
        }),

        setTaskType: (id, type) => set((s) => {
          const update = (tasks: Task[]) =>
            tasks.map(t => t.id === id ? { ...t, taskType: type } : t)
          return {
            nowPool: update(s.nowPool),
            nextPool: update(s.nextPool),
            somedayPool: update(s.somedayPool),
          }
        }),

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
        audioVolume: 0.55,
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
        completedTotal: 0,

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

        seenHints: [],
        markHintSeen: (id) => set((s) => ({
          seenHints: s.seenHints.includes(id) ? s.seenHints : [...s.seenHints, id],
        })),

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
        // Prune completed tasks older than 30 days on every store rehydration.
        // Prevents localStorage from growing unboundedly while keeping recent
        // completed tasks visible in the "Done recently" section.
        onRehydrateStorage: () => (state) => {
          if (!state) return
          const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
          const prune = (tasks: Task[]) =>
            tasks.filter(t => !(t.status === 'completed' && t.completedAt && t.completedAt < cutoff))
          state.nowPool = prune(state.nowPool)
          state.nextPool = prune(state.nextPool)
          state.somedayPool = prune(state.somedayPool)
        },
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
          seenHints: s.seenHints,
          subscriptionTier: s.subscriptionTier,
          trialEndsAt: s.trialEndsAt,
          gridWidgets: s.gridWidgets,
          psychotype: s.psychotype,
          completedTotal: s.completedTotal,
          // Persist task pools so tasks survive page reload in guest mode
          nowPool: s.nowPool,
          nextPool: s.nextPool,
          somedayPool: s.somedayPool,
          // Health & Rhythms — persisted (device-only, never server unless opt-in)
          timerStyle: s.timerStyle,
          medicationEnabled: s.medicationEnabled,
          medicationTime: s.medicationTime,
          chronotype: s.chronotype,
          seasonalMode: s.seasonalMode,
          flexiblePauseUntil: s.flexiblePauseUntil,
          // sleepQuality + burnoutScore are NOT persisted (session-only)
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
