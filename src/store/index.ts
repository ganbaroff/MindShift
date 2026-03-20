import { create } from 'zustand'
import { persist, createJSONStorage, subscribeWithSelector } from 'zustand/middleware'
import type { Task, AudioPreset, SessionPhase, EnergyLevel, CognitiveMode, AppMode, Psychotype, ActiveSession, WeeklyStats, Achievement, WidgetConfig, TaskType, TaskCategory } from '@/types'
import { ACHIEVEMENT_DEFINITIONS, WIDGET_DEFAULTS, WIDGET_DEFAULTS_GENERIC } from '@/types'
import {
  VR_BUCKET_SIZE, VR_JACKPOT_THRESHOLD, VR_BONUS_THRESHOLD,
  VR_MULTIPLIER_JACKPOT, VR_MULTIPLIER_BONUS, VR_MULTIPLIER_BASE,
  getNowPoolMax,
} from '@/shared/lib/constants'
import { idbStorage } from '@/shared/lib/idbStorage'
import { notifyAchievement } from '@/shared/lib/notify'
import { deriveUITone, getToneCopy } from '@/shared/lib/uiTone'

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
  // ADHD signal (O-6) — collected in onboarding, used for AI personalisation
  timeBlindness: 'often' | 'sometimes' | 'rarely' | null
  emotionalReactivity: 'high' | 'moderate' | 'steady' | null
  setTimeBlindness: (v: 'often' | 'sometimes' | 'rarely') => void
  setEmotionalReactivity: (v: 'high' | 'moderate' | 'steady') => void
  seasonalMode: 'launch' | 'maintain' | 'recover' | 'sandbox'
  burnoutScore: number                  // 0–100, computed (not persisted)
  flexiblePauseUntil: string | null     // ISO timestamp, null = no active pause
  setUser: (userId: string, email: string) => void
  setEnergyLevel: (level: EnergyLevel) => void
  setCognitiveMode: (mode: CognitiveMode) => void
  setAppMode: (mode: AppMode) => void
  setAvatarId: (id: number) => void
  /** O-7: update psychotype from usage-derived re-derivation */
  setPsychotype: (type: Psychotype) => void
  /** O-7: ISO date of last usage-derived psychotype computation */
  psychotypeLastDerived: string | null
  setPsychotypeLastDerived: (date: string) => void
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
  updateTask: (taskId: string, updates: Partial<Pick<Task, 'title' | 'note' | 'difficulty' | 'dueDate' | 'dueTime' | 'category'>>) => void
  removeTask: (taskId: string) => void
  setTasks: (tasks: Task[]) => void
  archiveAllOverdue: () => string[]     // returns archived ids
  setTaskDueDate: (id: string, dueDate: string | null, dueTime: string | null) => void
  setTaskType: (id: string, type: TaskType) => void
  setTaskCategory: (id: string, category: TaskCategory | undefined) => void
  /** Reorder tasks within a pool — receives the full new ordered array */
  reorderPool: (pool: Task['pool'], ordered: Task[]) => void
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
  hapticsEnabled: boolean
  setHapticsEnabled: (val: boolean) => void
  // Progressive disclosure — tracks which coach marks have been seen
  seenHints: string[]
  markHintSeen: (id: string) => void
  // Mochi chat open counter — pulse hint shows for first 3 opens
  mochiChatOpenCount: number
  incrementMochiChatOpen: () => void
  // Subscription state (trial mode — no actual charges)
  subscriptionTier: 'free' | 'pro_trial' | 'pro'
  trialEndsAt: string | null        // ISO timestamp
  setSubscription: (tier: 'free' | 'pro_trial' | 'pro', trialEnd?: string | null) => void
  isProActive: () => boolean
  // Language / locale — drives AI prompt language injection
  locale: string   // BCP-47 e.g. 'en', 'ru', 'de'
  setLocale: (locale: string) => void
  // Invisible streaks (Research #3: show only when growing, never shame on break)
  currentStreak: number        // consecutive days with ≥1 task completed
  longestStreak: number        // all-time record
  lastActiveDate: string | null // ISO date (YYYY-MM-DD) of last completion
  recordStreakDay: () => void   // call on completeTask
  // Shutdown ritual — end-of-day wind-down, shown once per day after 9pm
  shutdownShownDate: string | null  // ISO date — prevents re-showing same day
  setShutdownShownDate: (date: string) => void
  // Monthly reflection — shown within first 5 days of each new month
  monthlyReflectionShownMonth: string | null  // 'YYYY-MM' e.g. '2026-03'
  setMonthlyReflectionShownMonth: (month: string) => void
  // Daily focus goal — user-configurable target (default 60 min)
  dailyFocusGoalMin: number
  setDailyFocusGoalMin: (min: number) => void
  // Prevents re-celebrating the same day's goal completion
  goalCelebratedDate: string | null
  setGoalCelebratedDate: (date: string) => void
  // Weekly planning ritual — shown Sunday 18pm+ or Monday before noon, once per week
  weeklyPlanShownWeek: string | null   // ISO week key: 'YYYY-Www'
  setWeeklyPlanShownWeek: (week: string) => void
  // Weekly intention — user's chosen focus area for the week (shown in FocusScreen)
  weeklyIntention: string | null
  setWeeklyIntention: (intention: string | null) => void
  // UI Tone — auto-derived from signals, user-overridable via Settings
  uiTone: 'gen_z' | 'millennial' | 'gen_x' | 'neutral'
  setUITone: (tone: 'gen_z' | 'millennial' | 'gen_x' | 'neutral') => void
  // Telegram integration
  telegramLinkCode: string | null
  telegramLinked: boolean
  generateTelegramCode: () => void
  setTelegramLinked: (linked: boolean) => void
  // Google Calendar integration
  calendarSyncEnabled: boolean
  setCalendarSyncEnabled: (val: boolean) => void
  calendarFocusBlocks: boolean
  setCalendarFocusBlocks: (val: boolean) => void
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
        psychotypeLastDerived: null,
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
        timeBlindness: null,
        emotionalReactivity: null,
        seasonalMode: 'launch' as const,
        burnoutScore: 0,
        flexiblePauseUntil: null,

        setUser: (userId, email) => set({ userId, email }),
        setEnergyLevel: (level) => set({ energyLevel: level }),
        setCognitiveMode: (mode) => set((s) => ({
          cognitiveMode: mode,
          psychotype: derivePsychotype(s.appMode, mode),
        })),
        setAppMode: (mode) => set((s) => {
          const newMax = getNowPoolMax(mode, s.seasonalMode)
          const activeNow = s.nowPool.filter(t => t.status === 'active')
          if (activeNow.length <= newMax) {
            return { appMode: mode, psychotype: derivePsychotype(mode, s.cognitiveMode) }
          }
          // Move excess tasks (last added first) to NEXT pool
          const keep = activeNow.slice(0, newMax)
          const overflow = activeNow.slice(newMax).map(t => ({ ...t, pool: 'next' as const }))
          const completed = s.nowPool.filter(t => t.status !== 'active')
          return {
            appMode: mode,
            psychotype: derivePsychotype(mode, s.cognitiveMode),
            nowPool: [...keep, ...completed],
            nextPool: [...s.nextPool, ...overflow],
          }
        }),
        setAvatarId: (id) => set({ avatarId: id }),
        setPsychotype: (type) => set({ psychotype: type }),
        setPsychotypeLastDerived: (date) => set({ psychotypeLastDerived: date }),
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
        setOnboardingCompleted: () => {
          const s = get()
          const tone = deriveUITone(s.appMode, s.emotionalReactivity, s.timeBlindness, s.psychotype, s.seasonalMode)
          set({ onboardingCompleted: true, uiTone: tone })
        },
        setRecoveryShown: () => set({ recoveryShown: true }),
        updateLastSession: () => set({ lastSessionAt: new Date().toISOString() }),
        // Health & Rhythms setters
        setTimerStyle: (style) => set({ timerStyle: style }),
        setSleepQuality: (q) => set({ sleepQuality: q }),
        setMedicationEnabled: (val) => set({ medicationEnabled: val }),
        setMedicationTime: (t) => set({ medicationTime: t }),
        setChronotype: (c) => set({ chronotype: c }),
        setTimeBlindness: (v) => set({ timeBlindness: v }),
        setEmotionalReactivity: (v) => set({ emotionalReactivity: v }),
        setSeasonalMode: (m) => set((s) => {
          const newMax = getNowPoolMax(s.appMode, m)
          const activeNow = s.nowPool.filter(t => t.status === 'active')
          if (activeNow.length <= newMax) {
            return { seasonalMode: m }
          }
          // Move excess tasks (last added first) to NEXT pool
          const keep = activeNow.slice(0, newMax)
          const overflow = activeNow.slice(newMax).map(t => ({ ...t, pool: 'next' as const }))
          const completed = s.nowPool.filter(t => t.status !== 'active')
          return {
            seasonalMode: m,
            nowPool: [...keep, ...completed],
            nextPool: [...s.nextPool, ...overflow],
          }
        }),
        setBurnoutScore: (score) => set({ burnoutScore: score }),
        setFlexiblePauseUntil: (until) => set({ flexiblePauseUntil: until }),
        signOut: () => set({
          // User slice
          userId: null, email: null, xpTotal: 0, psychotypeLastDerived: null,
          onboardingCompleted: false, recoveryShown: false, lastSessionAt: null,
          // Health & Rhythms — reset to defaults on sign out
          timerStyle: 'countdown' as const,
          sleepQuality: null, medicationEnabled: false, medicationTime: null,
          chronotype: null, timeBlindness: null, emotionalReactivity: null,
          seasonalMode: 'launch' as const,
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
          reducedStimulation: false, hapticsEnabled: true, seenHints: [],
          subscriptionTier: 'free' as const, trialEndsAt: null,
          // Grid slice
          gridWidgets: WIDGET_DEFAULTS_GENERIC,
          // Streaks reset on sign out (user-specific data)
          currentStreak: 0, longestStreak: 0, lastActiveDate: null,
          // UI tone reset
          uiTone: 'neutral' as const,
          // Telegram reset
          telegramLinkCode: null,
          telegramLinked: false,
          // Calendar reset
          calendarSyncEnabled: false,
          calendarFocusBlocks: false,
        }),

        // ── Tasks ───────────────────────────────────────────────────────────
        nowPool: [],
        nextPool: [],
        somedayPool: [],

        addTask: (task) => set((s) => {
          // Pool assignment by task type:
          //   task    → current logic (NOW if space, else NEXT)
          //   meeting → always NEXT
          //   reminder → always NEXT
          //   idea    → always SOMEDAY
          const effectivePool = (() => {
            if (task.taskType === 'idea') return 'someday' as const
            if (task.taskType === 'meeting' || task.taskType === 'reminder') return 'next' as const
            return task.pool // 'task' type uses caller-assigned pool
          })()
          const assigned = { ...task, pool: effectivePool }
          if (effectivePool === 'now')  return { nowPool: [...s.nowPool, assigned] }
          if (effectivePool === 'next') return { nextPool: [...s.nextPool, assigned] }
          return { somedayPool: [...s.somedayPool, assigned] }
        }),

        completeTask: (taskId) => {
          // Snapshot pre-set state for achievement checks (set() is sync in Zustand)
          const energyBefore = get().energyLevel
          let didComplete = false
          set((s) => {
          const now = new Date().toISOString()
          const complete = (tasks: Task[]) =>
            tasks.map(t => t.id === taskId ? { ...t, status: 'completed' as const, completedAt: now } : t)
          const completedTask = [...s.nowPool, ...s.nextPool, ...s.somedayPool]
            .find(t => t.id === taskId && t.status === 'active')
          const wasActive = !!completedTask
          if (wasActive) didComplete = true

          // Invisible streak tracking — Research #3
          const today = new Date().toISOString().split('T')[0]
          const yesterday = new Date(Date.now() - 86_400_000).toISOString().split('T')[0]
          const streakUpdate = wasActive && s.lastActiveDate !== today ? (() => {
            const isConsecutive = s.lastActiveDate === yesterday
            const newStreak = isConsecutive ? s.currentStreak + 1 : 1
            return {
              currentStreak: newStreak,
              longestStreak: Math.max(s.longestStreak, newStreak),
              lastActiveDate: today,
            }
          })() : {}

          // Recurring tasks — auto-create next occurrence in NEXT pool
          // Only 'task' and 'reminder' types support recurrence; meetings and ideas don't recur.
          const recurTask: Task | null = (() => {
            if (!completedTask || !completedTask.repeat || completedTask.repeat === 'none') return null
            if (completedTask.taskType === 'meeting' || completedTask.taskType === 'idea') return null
            const offsetDays = completedTask.repeat === 'daily' ? 1 : 7
            const nextDue = new Date(Date.now() + offsetDays * 86_400_000).toISOString().split('T')[0]
            return {
              ...completedTask,
              id: crypto.randomUUID(),
              status: 'active' as const,
              pool: 'next' as const,
              completedAt: null,
              snoozeCount: 0,
              createdAt: now,
              dueDate: nextDue,
              reminderSentAt: null,
              position: s.nextPool.length,
            }
          })()

          // Sync recurring task to Supabase (fire-and-forget)
          if (recurTask && s.userId && !s.userId.startsWith('guest_')) {
            const capturedTask = recurTask
            const capturedUserId = s.userId
            // Defer import to avoid circular dependency — store cannot statically import useTaskSync
            void import('@/shared/hooks/useTaskSync').then(({ syncTaskUpsert }) => {
              syncTaskUpsert(capturedTask, capturedUserId)
            })
          }

          return {
            nowPool: complete(s.nowPool),
            nextPool: recurTask
              ? [...complete(s.nextPool), recurTask]
              : complete(s.nextPool),
            somedayPool: complete(s.somedayPool),
            // Research #5: track cumulative effort (task total), never consecutive
            completedTotal: wasActive ? s.completedTotal + 1 : s.completedTotal,
            ...streakUpdate,
          }
          })

          // ── Achievement checks (post-set via get()) ────────────────────────────
          if (!didComplete) return
          const s2 = get()
          const toneCopy = getToneCopy(s2.uiTone)
          const tryUnlock = (key: string) => {
            if (s2.hasAchievement(key)) return
            s2.unlockAchievement(key)
            const def = ACHIEVEMENT_DEFINITIONS.find(a => a.key === key)
            if (def) notifyAchievement(toneCopy.badgeUnlocked(def.name), def.emoji, def.description)
          }
          const newTotal = s2.completedTotal
          const hour = new Date().getHours()
          if (newTotal === 1)  tryUnlock('first_seed')
          if (newTotal === 10) tryUnlock('task_sniper')
          if (newTotal === 50) tryUnlock('micro_master')
          if (hour >= 21)      tryUnlock('night_owl')
          if (hour < 9)        tryUnlock('morning_mind')
          if (energyBefore <= 2) tryUnlock('gentle_start')
          if (newTotal >= 5)   tryUnlock('deep_diver')

          // BUG 1 fix: award XP on task completion (was never called)
          s2.addXP(10)
        },

        snoozeTask: (taskId) => set((s) => {
          const task = s.nowPool.find(t => t.id === taskId)
          if (!task) return s
          return {
            nowPool: s.nowPool.filter(t => t.id !== taskId),
            nextPool: [...s.nextPool, { ...task, pool: 'next', snoozeCount: task.snoozeCount + 1 }],
          }
        }),

        moveTask: (taskId, toPool) => {
          const before = get()
          const allTasks = [...before.nowPool, ...before.nextPool, ...before.somedayPool]
          const task = allTasks.find(t => t.id === taskId)
          if (!task) return
          const fromPool = task.pool

          set((s) => {
            const updated = { ...task, pool: toPool }
            const filter = (tasks: Task[]) => tasks.filter(t => t.id !== taskId)
            return {
              nowPool:     toPool === 'now'     ? [...filter(s.nowPool), updated]     : filter(s.nowPool),
              nextPool:    toPool === 'next'    ? [...filter(s.nextPool), updated]    : filter(s.nextPool),
              somedayPool: toPool === 'someday' ? [...filter(s.somedayPool), updated] : filter(s.somedayPool),
            }
          })

          // Achievement: pool_shifter — move a task from Someday to Now
          if (fromPool === 'someday' && toPool === 'now') {
            const s2 = get()
            if (!s2.hasAchievement('pool_shifter')) {
              s2.unlockAchievement('pool_shifter')
              const toneCopy = getToneCopy(s2.uiTone)
              const def = ACHIEVEMENT_DEFINITIONS.find(a => a.key === 'pool_shifter')
              if (def) notifyAchievement(toneCopy.badgeUnlocked(def.name), def.emoji, def.description)
            }
          }
        },

        updateTask: (taskId, updates) => set((s) => {
          const apply = (tasks: Task[]) =>
            tasks.map(t => t.id === taskId ? { ...t, ...updates } : t)
          return {
            nowPool: apply(s.nowPool),
            nextPool: apply(s.nextPool),
            somedayPool: apply(s.somedayPool),
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
          const today = new Date().toISOString().split('T')[0]
          const allOverdue = [...s.nowPool, ...s.nextPool]
            .filter(t => t.status === 'active' && t.dueDate != null && t.dueDate < today)
          const ids = allOverdue.map(t => t.id)
          const overdueSet = new Set(ids)
          set((s) => ({
            nowPool: s.nowPool.filter(t => !overdueSet.has(t.id)),
            nextPool: s.nextPool.filter(t => !overdueSet.has(t.id)),
            somedayPool: [...s.somedayPool, ...allOverdue.map(t => ({ ...t, pool: 'someday' as const }))],
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

        setTaskCategory: (id, category) => set((s) => {
          const update = (tasks: Task[]) =>
            tasks.map(t => t.id === id ? { ...t, category } : t)
          return {
            nowPool: update(s.nowPool),
            nextPool: update(s.nextPool),
            somedayPool: update(s.somedayPool),
          }
        }),

        reorderPool: (pool, ordered) => set(() => {
          const withPositions = ordered.map((t, i) => ({ ...t, position: i }))
          if (pool === 'now')     return { nowPool: withPositions }
          if (pool === 'next')    return { nextPool: withPositions }
          return { somedayPool: withPositions }
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
        setFocusAnchor: (preset) => {
          set({ focusAnchor: preset })
          // Achievement: sonic_anchor — set a focus anchor sound
          if (preset !== null) {
            const s2 = get()
            if (!s2.hasAchievement('sonic_anchor')) {
              s2.unlockAchievement('sonic_anchor')
              const toneCopy = getToneCopy(s2.uiTone)
              const def = ACHIEVEMENT_DEFINITIONS.find(a => a.key === 'sonic_anchor')
              if (def) notifyAchievement(toneCopy.badgeUnlocked(def.name), def.emoji, def.description)
            }
          }
        },
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
        hapticsEnabled: true,
        setHapticsEnabled: (val) => set({ hapticsEnabled: val }),

        seenHints: [],
        markHintSeen: (id) => set((s) => ({
          seenHints: s.seenHints.includes(id) ? s.seenHints : [...s.seenHints, id],
        })),
        mochiChatOpenCount: 0,
        incrementMochiChatOpen: () => set((s) => ({
          mochiChatOpenCount: s.mochiChatOpenCount + 1,
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

        // Locale — BCP-47, auto-detected from browser on first load
        locale: typeof navigator !== 'undefined'
          ? (navigator.language?.split('-')[0] ?? 'en')
          : 'en',
        setLocale: (locale) => set({ locale }),

        // Invisible streaks — Research #3: show only when growing, never shame
        currentStreak: 0,
        longestStreak: 0,
        lastActiveDate: null,
        recordStreakDay: () => set((s) => {
          const today = new Date().toISOString().split('T')[0]
          if (s.lastActiveDate === today) return s  // already recorded today

          const yesterday = new Date(Date.now() - 86_400_000).toISOString().split('T')[0]
          const isConsecutive = s.lastActiveDate === yesterday

          const newStreak = isConsecutive ? s.currentStreak + 1 : 1
          return {
            currentStreak: newStreak,
            longestStreak: Math.max(s.longestStreak, newStreak),
            lastActiveDate: today,
          }
        }),

        // Shutdown ritual — shown once per day after 9pm
        shutdownShownDate: null,
        setShutdownShownDate: (date) => set({ shutdownShownDate: date }),

        // Monthly reflection — shown within first 5 days of each new month
        monthlyReflectionShownMonth: null,
        setMonthlyReflectionShownMonth: (month) => set({ monthlyReflectionShownMonth: month }),

        // Daily focus goal
        dailyFocusGoalMin: 60,
        setDailyFocusGoalMin: (min) => set({ dailyFocusGoalMin: min }),
        goalCelebratedDate: null,
        setGoalCelebratedDate: (date) => set({ goalCelebratedDate: date }),

        // Weekly planning ritual
        weeklyPlanShownWeek: null,
        setWeeklyPlanShownWeek: (week) => set({ weeklyPlanShownWeek: week }),
        weeklyIntention: null,
        setWeeklyIntention: (intention) => set({ weeklyIntention: intention }),

        // UI Tone — auto-derived from ADHD signals, settable manually
        uiTone: 'neutral',
        setUITone: (tone) => set({ uiTone: tone }),

        // Telegram integration
        telegramLinkCode: null,
        telegramLinked: false,
        generateTelegramCode: () => {
          const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
          let code = ''
          for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
          set({ telegramLinkCode: code })
          // Write to Supabase telegram_links table (fire-and-forget)
          const userId = get().userId
          if (userId && !userId.startsWith('guest_')) {
            import('@/shared/lib/supabase').then(({ supabase }) => {
              void (supabase.from('telegram_links') as unknown as { upsert: (values: Record<string, unknown>, opts?: Record<string, unknown>) => unknown }).upsert({
                user_id: userId,
                link_code: code,
              }, { onConflict: 'user_id' })
            })
          }
        },
        setTelegramLinked: (linked) => set({ telegramLinked: linked, telegramLinkCode: linked ? null : get().telegramLinkCode }),

        // Google Calendar integration
        calendarSyncEnabled: false,
        setCalendarSyncEnabled: (val) => set({ calendarSyncEnabled: val }),
        calendarFocusBlocks: false,
        setCalendarFocusBlocks: (val) => set({ calendarFocusBlocks: val }),
      }),
      {
        name: 'mindshift-store',
        version: 1,
        storage: createJSONStorage(() => idbStorage),
        // migrate() ensures Zustand treats versioned state as recoverable
        // rather than discarding it when the version matches.
        migrate: (persistedState: unknown, _version: number) => {
          const state = persistedState as Record<string, unknown>
          return state as ReturnType<typeof Object>
        },
        // Merge persisted state with current defaults so new fields don't
        // cause data loss. Defensive against null/undefined persisted state
        // which can happen during SW cache cleanup race conditions.
        merge: (persisted, current) => {
          if (!persisted || typeof persisted !== 'object') return current
          const p = persisted as Partial<AppStore>
          const merged = { ...current, ...p }
          // Ensure pools and arrays are always valid — guard against corruption
          if (!Array.isArray(merged.nowPool)) merged.nowPool = []
          if (!Array.isArray(merged.nextPool)) merged.nextPool = []
          if (!Array.isArray(merged.somedayPool)) merged.somedayPool = []
          if (!Array.isArray(merged.achievements)) merged.achievements = current.achievements
          if (!Array.isArray(merged.gridWidgets)) merged.gridWidgets = current.gridWidgets
          if (!Array.isArray(merged.seenHints)) merged.seenHints = current.seenHints
          return merged
        },
        // Prune completed tasks older than 30 days on every store rehydration.
        // Prevents localStorage from growing unboundedly while keeping recent
        // completed tasks visible in the "Done recently" section.
        onRehydrateStorage: () => (state) => {
          if (!state) return
          // Defensive: ensure pools are arrays even after rehydration
          if (!Array.isArray(state.nowPool)) state.nowPool = []
          if (!Array.isArray(state.nextPool)) state.nextPool = []
          if (!Array.isArray(state.somedayPool)) state.somedayPool = []
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
          appMode: s.appMode,
          energyLevel: s.energyLevel,
          avatarId: s.avatarId,
          xpTotal: s.xpTotal,
          lastSessionAt: s.lastSessionAt,
          onboardingCompleted: s.onboardingCompleted,
          focusAnchor: s.focusAnchor,
          achievements: s.achievements,
          audioVolume: s.audioVolume,
          reducedStimulation: s.reducedStimulation,
          hapticsEnabled: s.hapticsEnabled,
          seenHints: s.seenHints,
          mochiChatOpenCount: s.mochiChatOpenCount,
          subscriptionTier: s.subscriptionTier,
          trialEndsAt: s.trialEndsAt,
          gridWidgets: s.gridWidgets,
          psychotype: s.psychotype,
          psychotypeLastDerived: s.psychotypeLastDerived,
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
          timeBlindness: s.timeBlindness,
          emotionalReactivity: s.emotionalReactivity,
          seasonalMode: s.seasonalMode,
          flexiblePauseUntil: s.flexiblePauseUntil,
          // sleepQuality + burnoutScore are NOT persisted (session-only)
          // Locale & streaks
          locale: s.locale,
          currentStreak: s.currentStreak,
          longestStreak: s.longestStreak,
          lastActiveDate: s.lastActiveDate,
          shutdownShownDate: s.shutdownShownDate,
          monthlyReflectionShownMonth: s.monthlyReflectionShownMonth,
          dailyFocusGoalMin: s.dailyFocusGoalMin,
          goalCelebratedDate: s.goalCelebratedDate,
          weeklyPlanShownWeek: s.weeklyPlanShownWeek,
          weeklyIntention: s.weeklyIntention,
          uiTone: s.uiTone,
          telegramLinkCode: s.telegramLinkCode,
          telegramLinked: s.telegramLinked,
          calendarSyncEnabled: s.calendarSyncEnabled,
          calendarFocusBlocks: s.calendarFocusBlocks,
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
