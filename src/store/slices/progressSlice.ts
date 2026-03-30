import { type StateCreator } from 'zustand'
import type { AppStore } from '../types'
import type { Achievement, WeeklyStats } from '@/types'
import { initAchievements } from './helpers'

export interface ProgressSlice {
  achievements: Achievement[]
  weeklyStats: WeeklyStats | null
  /** Lifetime total of completed tasks — incremented on each completeTask call */
  completedTotal: number
  /** Lifetime total of completed focus sessions — used for In-App Review gate */
  completedFocusSessions: number
  incrementFocusSessions: () => void
  unlockAchievement: (key: string) => void
  setWeeklyStats: (stats: WeeklyStats) => void
  hasAchievement: (key: string) => boolean
}

export const createProgressSlice: StateCreator<
  AppStore,
  [['zustand/subscribeWithSelector', never], ['zustand/persist', unknown]],
  [],
  ProgressSlice
> = (set, get) => ({
  achievements: initAchievements(),
  weeklyStats: null,
  completedTotal: 0,
  completedFocusSessions: 0,

  unlockAchievement: (key) => set((s) => ({
    achievements: s.achievements.map(a =>
      a.key === key && !a.unlockedAt
        ? { ...a, unlockedAt: new Date().toISOString() }
        : a
    ),
  })),

  setWeeklyStats: (stats) => set({ weeklyStats: stats }),
  hasAchievement: (key) => !!get().achievements.find(a => a.key === key)?.unlockedAt,
  incrementFocusSessions: () => set((s) => ({ completedFocusSessions: s.completedFocusSessions + 1 })),
})
