import { create } from 'zustand'
import { persist, createJSONStorage, subscribeWithSelector } from 'zustand/middleware'
import type { Task } from '@/types'
import { idbStorage } from '@/shared/lib/idbStorage'
import { createUserSlice } from './slices/userSlice'
import { createTaskSlice } from './slices/taskSlice'
import { createSessionSlice } from './slices/sessionSlice'
import { createAudioSlice } from './slices/audioSlice'
import { createProgressSlice } from './slices/progressSlice'
import { createPreferencesAndGridSlice } from './slices/preferencesAndGridSlice'
import { _registerHapticsGetter } from '@/shared/lib/haptic'
import { logEvent } from '@/shared/lib/logger'
export type { AppStore } from './types'

// ── Store ─────────────────────────────────────────────────────────────────────

export const useStore = create<import('./types').AppStore>()(
  subscribeWithSelector(
    persist(
      (...a) => ({
        _hasHydrated: false,
        ...createUserSlice(...a),
        ...createTaskSlice(...a),
        ...createSessionSlice(...a),
        ...createAudioSlice(...a),
        ...createProgressSlice(...a),
        ...createPreferencesAndGridSlice(...a),
      }),
      {
        name: 'mindshift-store',
        version: 1,
        storage: createJSONStorage(() => idbStorage),
        // migrate() ensures Zustand treats versioned state as recoverable
        // rather than discarding it when the version matches.
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        migrate: (persistedState: unknown, _version: number) => {
          const state = persistedState as Record<string, unknown>
          return state as ReturnType<typeof Object>
        },
        // Merge persisted state with current defaults so new fields don't
        // cause data loss. Defensive against null/undefined persisted state
        // which can happen during SW cache cleanup race conditions.
        merge: (persisted, current) => {
          if (!persisted || typeof persisted !== 'object') return current
          const p = persisted as Partial<import('./types').AppStore>
          const merged = { ...current, ...p }
          // Ensure pools and arrays are always valid — guard against corruption
          if (!Array.isArray(merged.nowPool)) merged.nowPool = []
          if (!Array.isArray(merged.nextPool)) merged.nextPool = []
          if (!Array.isArray(merged.somedayPool)) merged.somedayPool = []
          if (!Array.isArray(merged.achievements)) merged.achievements = current.achievements
          if (!Array.isArray(merged.gridWidgets)) merged.gridWidgets = current.gridWidgets
          if (!Array.isArray(merged.seenHints)) merged.seenHints = current.seenHints
          if (!Array.isArray(merged.ifThenRules)) merged.ifThenRules = []
          // Validate enum fields — guard against localStorage corruption or schema drift
          const validMedTimes = ['morning', 'afternoon', 'evening', null] as const
          if (!validMedTimes.includes(merged.medicationTime as typeof validMedTimes[number])) merged.medicationTime = null
          const validTimerStyles = ['countdown', 'countup', 'surprise'] as const
          if (!validTimerStyles.includes(merged.timerStyle as typeof validTimerStyles[number])) merged.timerStyle = 'countdown'
          return merged
        },
        // Prune completed tasks older than 30 days on every store rehydration.
        // Prevents localStorage from growing unboundedly while keeping recent
        // completed tasks visible in the "Done recently" section.
        onRehydrateStorage: () => (state) => {
          // Always signal hydration complete — even if state is null (IDB failure).
          // useStore.setState triggers a subscriber notification so App.tsx re-renders
          // and lifts the LoadingScreen gate. Called after Zustand's merge() completes,
          // so useStore is guaranteed to be assigned at this point.
          useStore.setState({ _hasHydrated: true })

          if (!state) return
          // Defensive: ensure pools are arrays even after rehydration
          if (!Array.isArray(state.nowPool)) state.nowPool = []
          if (!Array.isArray(state.nextPool)) state.nextPool = []
          if (!Array.isArray(state.somedayPool)) state.somedayPool = []
          const now = Date.now()
          const cutoff = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString()
          // Guard: skip pruning if system clock appears wrong (cutoff in future = clock jumped forward)
          const shouldPrune = new Date(cutoff).getTime() < now
          const prune = (tasks: Task[]) =>
            shouldPrune
              ? tasks.filter(t => !(t.status === 'completed' && t.completedAt && t.completedAt < cutoff))
              : tasks
          state.nowPool = prune(state.nowPool)
          state.nextPool = prune(state.nextPool)
          state.somedayPool = prune(state.somedayPool)

          // Auto-reschedule overdue tasks — bump to today silently
          const today = new Date().toISOString().split('T')[0]
          const bump = (tasks: Task[]) =>
            tasks.map(t =>
              t.status === 'active' && t.dueDate && t.dueDate < today
                ? { ...t, dueDate: today }
                : t
            )
          state.nowPool = bump(state.nowPool)
          state.nextPool = bump(state.nextPool)

          // Auto-set installDate on first launch — ISO timestamp, never reset
          if (!state.installDate) {
            state.installDate = new Date().toISOString()
            // Fire once per device — true install denominator for funnel metrics
            setTimeout(() => logEvent('app_first_open'), 0)
          }

          // Sync analytics consent to window flag — logger.ts reads this without import cycle
          ;(window as unknown as Record<string, unknown>).__MS_ANALYTICS__ = state.analyticsEnabled ?? true
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
          userLocale: s.userLocale,
          userTheme: s.userTheme,
          userCountry: s.userCountry,
          seenHints: s.seenHints,
          mochiChatOpenCount: s.mochiChatOpenCount,
          mochiDiscoveries: s.mochiDiscoveries,
          subscriptionTier: s.subscriptionTier,
          trialEndsAt: s.trialEndsAt,
          gridWidgets: s.gridWidgets,
          psychotype: s.psychotype,
          psychotypeLastDerived: s.psychotypeLastDerived,
          completedTotal: s.completedTotal,
          completedFocusSessions: s.completedFocusSessions,
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
          installDate: s.installDate,
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
          poolsExplained: s.poolsExplained,
          firstFocusTutorialCompleted: s.firstFocusTutorialCompleted,
          uiTone: s.uiTone,
          telegramLinkCode: s.telegramLinkCode,
          telegramLinked: s.telegramLinked,
          mochiCompanionEnabled: s.mochiCompanionEnabled,
          calendarSyncEnabled: s.calendarSyncEnabled,
          calendarFocusBlocks: s.calendarFocusBlocks,
          fontScale: s.fontScale,
          // S-5 Ghosting Grace — persisted so ContextRestore can surface room context on return
          lastRoomCode: s.lastRoomCode,
          lastRoomLeftAt: s.lastRoomLeftAt,
          mochiMemory: s.mochiMemory,
          shopUnlocks: s.shopUnlocks,
          analyticsEnabled: s.analyticsEnabled,
          ifThenRules: s.ifThenRules,
        }),
      }
    )
  )
)

// Break circular dep: store → taskSlice → notify → haptic → store
// haptic.ts uses this getter instead of importing useStore directly.
_registerHapticsGetter(() => useStore.getState().hapticsEnabled)

// ── Selectors ─────────────────────────────────────────────────────────────────
export const selectActiveTasks = (s: import('./types').AppStore) =>
  s.nowPool.filter(t => t.status === 'active').slice(0, 3)

export const selectSessionProgress = (s: import('./types').AppStore) => {
  if (!s.activeSession) return 0
  const elapsed = s.activeSession.durationMs / 1000 - s.timerSeconds
  return elapsed / (s.activeSession.durationMs / 1000)
}
