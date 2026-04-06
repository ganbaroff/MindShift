import { type StateCreator } from 'zustand'
import type { AppStore } from '../types'
import type { Psychotype, WidgetConfig } from '@/types'
import { WIDGET_DEFAULTS, WIDGET_DEFAULTS_GENERIC } from '@/types'

interface PreferencesSlice {
  reducedStimulation: boolean
  setReducedStimulation: (val: boolean) => void
  hapticsEnabled: boolean
  setHapticsEnabled: (val: boolean) => void
  // Locale & theme — user-settable overrides
  userLocale: string | null        // null = auto-detect from navigator
  setUserLocale: (locale: string | null) => void
  userTheme: 'dark' | 'light' | 'system'
  setUserTheme: (theme: 'dark' | 'light' | 'system') => void
  userCountry: string | null       // ISO 3166-1 alpha-2 (e.g. "AZ", "US", "RU")
  setUserCountry: (country: string | null) => void
  // Progressive disclosure — tracks which coach marks have been seen
  seenHints: string[]
  markHintSeen: (id: string) => void
  // Mochi chat open counter — pulse hint shows for first 3 opens
  mochiChatOpenCount: number
  incrementMochiChatOpen: () => void
  // Mochi discoveries — variable reinforcement collectibles
  mochiDiscoveries: string[]
  addMochiDiscovery: (id: string) => void
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
  // Pool guide — dismissable one-time explainer in TasksPage
  poolsExplained: boolean
  setPoolsExplained: () => void
  // First-focus tutorial — shown once after onboarding
  firstFocusTutorialCompleted: boolean
  setFirstFocusTutorialCompleted: () => void
  // UI Tone — auto-derived from signals, user-overridable via Settings
  uiTone: 'gen_z' | 'millennial' | 'gen_x' | 'neutral'
  setUITone: (tone: 'gen_z' | 'millennial' | 'gen_x' | 'neutral') => void
  // Telegram integration
  telegramLinkCode: string | null
  telegramLinked: boolean
  generateTelegramCode: () => void
  setTelegramLinked: (linked: boolean) => void
  // Mochi companion — toggle visibility during focus sessions
  mochiCompanionEnabled: boolean
  setMochiCompanionEnabled: (val: boolean) => void
  // Google Calendar integration
  calendarSyncEnabled: boolean
  setCalendarSyncEnabled: (val: boolean) => void
  calendarFocusBlocks: boolean
  setCalendarFocusBlocks: (val: boolean) => void
  // Font scale — accessibility for ADHD+dyslexia users (30-50% comorbidity)
  fontScale: 1 | 1.15 | 1.3
  setFontScale: (scale: 1 | 1.15 | 1.3) => void
}

interface GridSlice {
  /** Ordered list of widget configs — drives BentoGrid layout */
  gridWidgets: WidgetConfig[]
  setGridWidgets: (widgets: WidgetConfig[]) => void
  /** Reset to psychotype-driven defaults (called after onboarding or psychotype change) */
  resetGridToDefaults: () => void
}

export type PreferencesAndGridSlice = PreferencesSlice & GridSlice

export const createPreferencesAndGridSlice: StateCreator<
  AppStore,
  [['zustand/subscribeWithSelector', never], ['zustand/persist', unknown]],
  [],
  PreferencesAndGridSlice
> = (set, get) => ({
  // ── Grid ─────────────────────────────────────────────────────────
  gridWidgets: WIDGET_DEFAULTS_GENERIC,

  setGridWidgets: (widgets) => set({ gridWidgets: widgets }),

  resetGridToDefaults: () => {
    const psychotype = get().psychotype as Psychotype | null
    const defaults = psychotype ? WIDGET_DEFAULTS[psychotype] : WIDGET_DEFAULTS_GENERIC
    set({ gridWidgets: defaults })
  },

  // ── Preferences ────────────────────────────────────────────────────
  reducedStimulation: false,
  setReducedStimulation: (val) => set({ reducedStimulation: val }),
  hapticsEnabled: true,
  setHapticsEnabled: (val) => set({ hapticsEnabled: val }),
  userLocale: null,
  setUserLocale: (locale) => set({ userLocale: locale }),
  userTheme: 'dark',
  setUserTheme: (theme) => set({ userTheme: theme }),
  userCountry: null,
  setUserCountry: (country) => set({ userCountry: country }),

  seenHints: [],
  markHintSeen: (id) => set((s) => ({
    seenHints: s.seenHints.includes(id) ? s.seenHints : [...s.seenHints, id],
  })),
  mochiChatOpenCount: 0,
  incrementMochiChatOpen: () => set((s) => ({
    mochiChatOpenCount: s.mochiChatOpenCount + 1,
  })),
  mochiDiscoveries: [],
  addMochiDiscovery: (id) => set((s) => ({
    mochiDiscoveries: s.mochiDiscoveries.includes(id) ? s.mochiDiscoveries : [...s.mochiDiscoveries, id],
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
  poolsExplained: false,
  setPoolsExplained: () => set({ poolsExplained: true }),
  firstFocusTutorialCompleted: false,
  setFirstFocusTutorialCompleted: () => set({ firstFocusTutorialCompleted: true }),

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
  setTelegramLinked: (linked) => set((s) => ({ telegramLinked: linked, telegramLinkCode: linked ? null : s.telegramLinkCode })),

  // Mochi companion — visible during focus sessions by default
  mochiCompanionEnabled: true,
  setMochiCompanionEnabled: (val) => set({ mochiCompanionEnabled: val }),

  // Google Calendar integration
  calendarSyncEnabled: false,
  setCalendarSyncEnabled: (val) => set({ calendarSyncEnabled: val }),
  calendarFocusBlocks: false,
  setCalendarFocusBlocks: (val) => set({ calendarFocusBlocks: val }),

  // Font scale — 1 = normal, 1.15 = large (~15%), 1.3 = extra large (~30%)
  fontScale: 1,
  setFontScale: (scale) => set({ fontScale: scale }),
})
