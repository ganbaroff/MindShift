/**
 * useSessionHistory
 *
 * Fetches the last 30 days of focus_sessions for the current user,
 * computes WeeklyStats from real data, loads it into the store, and
 * fetches AI-generated insights from the `weekly-insight` edge function.
 *
 * Returns: { energyTrend, weeklyInsight, loading, sessions }
 *
 * Rules:
 *  - Guest users (userId starts with "guest_") → skip Supabase, return statics
 *  - Uses React Query (`@tanstack/react-query`) to deduplicate fetches across
 *    all consumers — only ONE Supabase query and ONE AI call regardless of how
 *    many components call this hook.
 *  - All Supabase calls wrapped in try/catch — never blocks the UI
 */

import { useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabase'
import { useStore } from '@/store'
import { logError } from '@/shared/lib/logger'
import { getWeekStart } from '@/shared/lib/dateUtils'
import { notifyAchievement } from '@/shared/lib/notify'
import { getToneCopy } from '@/shared/lib/uiTone'
import { ACHIEVEMENT_DEFINITIONS } from '@/types'
import type { WeeklyStats, AudioPreset, EnergyLevel } from '@/types'
import type { FocusSessionRow } from '@/types/database'

// ── Static fallback insights ──────────────────────────────────────────────────

// i18n keys — resolved at render time via t() in ProgressPage
const FALLBACK_INSIGHTS = [
  'progress.insightPeakFocus',
  'progress.insightShortSessions',
  'progress.insightOneStep',
]

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Mode of an array of strings — returns null for empty arrays */
function modeOf(arr: string[]): string | null {
  if (arr.length === 0) return null
  const freq: Record<string, number> = {}
  let maxKey = arr[0]
  for (const val of arr) {
    freq[val] = (freq[val] ?? 0) + 1
    if (freq[val] > (freq[maxKey] ?? 0)) maxKey = val
  }
  return maxKey
}

/** Map most-common hour bucket to a human-readable string like "2-4pm" */
function hourToPeakLabel(hour: number): string {
  const start = hour % 12 === 0 ? 12 : hour % 12
  const end   = (hour + 2) % 12 === 0 ? 12 : (hour + 2) % 12
  const ampm  = hour < 12 ? 'am' : 'pm'
  return `${start}-${end}${ampm}`
}

function computeWeeklyStats(sessions: FocusSessionRow[]): WeeklyStats {
  const weekStart = getWeekStart()
  const weekSessions = sessions.filter(s => new Date(s.started_at) >= weekStart)

  // dailyMinutes[0] = Monday … [6] = Sunday
  const dailyMinutes: number[] = [0, 0, 0, 0, 0, 0, 0]
  weekSessions.forEach(s => {
    const day = (new Date(s.started_at).getDay() + 6) % 7
    dailyMinutes[day] += Math.round((s.duration_ms ?? 0) / 60000)
  })

  const totalFocusMinutes = dailyMinutes.reduce((a, b) => a + b, 0)

  const uniqueDays = new Set(weekSessions.map(s => new Date(s.started_at).toDateString())).size
  const consistencyScore = uniqueDays / 7

  // Peak focus time — most common 2-hour window bucket from started_at
  const hours = weekSessions.map(s => new Date(s.started_at).getHours())
  const buckets = hours.map(h => Math.floor(h / 2) * 2) // snap to even hours
  const peakBucketStr = modeOf(buckets.map(String))
  const peakFocusTime = peakBucketStr !== null
    ? hourToPeakLabel(parseInt(peakBucketStr, 10))
    : 'Not enough data'

  // Peak energy (max energy_before this week)
  const energyValues = weekSessions
    .map(s => s.energy_before)
    .filter((e): e is number => e !== null && e >= 1 && e <= 5)
  const peakEnergyRaw = energyValues.length > 0 ? Math.max(...energyValues) : 3
  const peakEnergyLevel = Math.min(5, Math.max(1, peakEnergyRaw)) as EnergyLevel

  // Most used audio preset
  const presets = weekSessions
    .map(s => s.audio_preset)
    .filter((p): p is string => p !== null)
  const mostUsedPresetRaw = modeOf(presets)
  const validPresets: AudioPreset[] = ['brown', 'lofi', 'nature', 'pink', 'gamma']
  const mostUsedPreset: AudioPreset | null =
    mostUsedPresetRaw !== null && (validPresets as string[]).includes(mostUsedPresetRaw)
      ? (mostUsedPresetRaw as AudioPreset)
      : null

  // tasksCompleted from sessions that reached at least release phase
  const tasksCompleted = weekSessions.filter(
    s => s.phase_reached === 'release' || s.phase_reached === 'flow' || s.phase_reached === 'recovery'
  ).length

  return {
    peakFocusTime,
    tasksCompleted,
    mostUsedPreset,
    peakEnergyLevel,
    consistencyScore,
    totalFocusMinutes,
    dailyMinutes,
  }
}

// ── Data types ───────────────────────────────────────────────────────────────

interface SessionQueryResult {
  sessions: FocusSessionRow[]
  energyTrend: number[]
  weeklyInsight: string[]
  stats: WeeklyStats
}

// ── Query function ───────────────────────────────────────────────────────────

async function fetchSessionHistory(
  userId: string,
  seasonalMode: string | undefined,
): Promise<SessionQueryResult> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('focus_sessions')
    .select('*')
    .eq('user_id', userId)
    .gte('started_at', thirtyDaysAgo)
    .order('started_at', { ascending: false })

  if (error) {
    logError('useSessionHistory.fetch', error)
    return {
      sessions: [],
      energyTrend: [],
      weeklyInsight: FALLBACK_INSIGHTS,
      stats: computeWeeklyStats([]),
    }
  }

  const sessions: FocusSessionRow[] = (data ?? []) as FocusSessionRow[]

  // Compute WeeklyStats
  const stats = computeWeeklyStats(sessions)

  // Energy trend — last 10 sessions with a non-null energy_after
  const energyTrend = sessions
    .map(s => s.energy_after)
    .filter((e): e is number => e !== null)
    .slice(0, 10)

  // AI insights
  let weeklyInsight = FALLBACK_INSIGHTS
  if (sessions.length > 0) {
    try {
      const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const recentSessions = sessions.filter(s => s.started_at >= last7Days)

      const { data: insightData, error: insightError } = await supabase.functions
        .invoke('weekly-insight', {
          body: {
            sessions: recentSessions.map(s => ({
              duration_ms:   s.duration_ms,
              phase_reached: s.phase_reached,
              energy_before: s.energy_before,
              energy_after:  s.energy_after,
              audio_preset:  s.audio_preset,
              started_at:    s.started_at,
            })),
            seasonalMode,
          },
        })

      if (insightError) {
        logError('useSessionHistory.insight', insightError)
      } else {
        const raw = insightData as { insights?: string[] } | null
        const insights = raw?.insights
        if (Array.isArray(insights) && insights.length > 0) {
          weeklyInsight = insights
        }
      }
    } catch (e) {
      logError('useSessionHistory.insight', e)
    }
  }

  return { sessions, energyTrend, weeklyInsight, stats }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export interface SessionHistoryResult {
  /** Last 10 energy_after values, most recent first (null filtered out) */
  energyTrend: number[]
  /** AI-generated or fallback insight strings */
  weeklyInsight: string[]
  loading: boolean
  /** Last 30 days of raw sessions — exposed for psychotype derivation (O-7) */
  sessions: FocusSessionRow[]
}

const EMPTY_SESSIONS: FocusSessionRow[] = []
const EMPTY_ENERGY: number[] = []

export function useSessionHistory(): SessionHistoryResult {
  const userId = useStore(s => s.userId)
  const seasonalMode = useStore(s => s.seasonalMode)
  const setWeeklyStats = useStore(s => s.setWeeklyStats)

  const isGuest = !userId || userId.startsWith('guest_')

  const { data, isLoading } = useQuery({
    queryKey: ['session-history', userId],
    queryFn: () => fetchSessionHistory(userId!, seasonalMode),
    enabled: !isGuest,
    staleTime: 5 * 60 * 1000, // 5 minutes — matches QueryClient default
  })

  // Push WeeklyStats into Zustand store when data arrives
  useEffect(() => {
    if (data?.stats) {
      setWeeklyStats(data.stats)
      // Achievement: week_warrior — active 5 out of 7 days
      if (data.stats.consistencyScore >= 5 / 7) {
        const s = useStore.getState()
        if (!s.hasAchievement('week_warrior')) {
          s.unlockAchievement('week_warrior')
          const toneCopy = getToneCopy(s.uiTone)
          const def = ACHIEVEMENT_DEFINITIONS.find(a => a.key === 'week_warrior')
          if (def) notifyAchievement(toneCopy.badgeUnlocked(def.name), def.emoji, def.description)
        }
      }
    }
  }, [data?.stats, setWeeklyStats])

  return useMemo(() => ({
    energyTrend: data?.energyTrend ?? EMPTY_ENERGY,
    weeklyInsight: data?.weeklyInsight ?? FALLBACK_INSIGHTS,
    loading: isLoading,
    sessions: data?.sessions ?? EMPTY_SESSIONS,
  }), [data, isLoading])
}
