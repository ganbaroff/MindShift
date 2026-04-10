import { type StateCreator } from 'zustand'
import type { AppStore } from '../types'
import type { EnergyLevel, CognitiveMode, AppMode, Psychotype } from '@/types'
import { WIDGET_DEFAULTS_GENERIC } from '@/types'
import {
  getNowPoolMax,
  VR_BUCKET_SIZE, VR_JACKPOT_THRESHOLD, VR_BONUS_THRESHOLD,
  VR_MULTIPLIER_JACKPOT, VR_MULTIPLIER_BONUS, VR_MULTIPLIER_BASE,
} from '@/shared/lib/constants'
import { deriveUITone } from '@/shared/lib/uiTone'
import { derivePsychotype, initAchievements } from './helpers'

export interface UserSlice {
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
  // -- Health & Rhythms (Block 1) ----------------------------------------------
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
  /** ISO timestamp of first app launch — persisted, never reset on signOut (device-level) */
  installDate: string | null
  /** S-5 Ghosting Grace — last Focus Room code the user was in, cleared after 24h */
  lastRoomCode: string | null
  /** S-5 Ghosting Grace — ISO timestamp when the user last left a Focus Room */
  lastRoomLeftAt: string | null
  setLastRoomCode: (code: string | null) => void
  setLastRoomLeftAt: (at: string | null) => void
}

export const createUserSlice: StateCreator<
  AppStore,
  [['zustand/subscribeWithSelector', never], ['zustand/persist', unknown]],
  [],
  UserSlice
> = (set, get) => ({
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
  installDate: null,
  lastRoomCode: null,
  lastRoomLeftAt: null,

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
  setLastRoomCode: (code) => set({ lastRoomCode: code }),
  setLastRoomLeftAt: (at) => set({ lastRoomLeftAt: at }),
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
    achievements: initAchievements(), weeklyStats: null, completedTotal: 0, completedFocusSessions: 0,
    // Preferences slice — prevent Pro state leaking between users
    reducedStimulation: false, hapticsEnabled: true, seenHints: [], mochiDiscoveries: [],
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
    // Room reset (S-5)
    lastRoomCode: null,
    lastRoomLeftAt: null,
  }),
})
