/**
 * useSessionHistory
 *
 * Fetches the last 30 days of focus_sessions for the current user,
 * computes WeeklyStats from real data, loads it into the store, and
 * fetches AI-generated insights from the `weekly-insight` edge function.
 *
 * Returns: { energyTrend, weeklyInsight, loading }
 *
 * Rules:
 *  - Guest users (userId starts with "guest_") → skip Supabase, return statics
 *  - AI edge function is called once per component mount (guarded by useRef)
 *  - All Supabase calls wrapped in try/catch — never blocks the UI
 */

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { useStore } from '@/store'
import { logError } from '@/shared/lib/logger'
import type { WeeklyStats, AudioPreset, EnergyLevel } from '@/types'
import type { FocusSessionRow } from '@/types/database'

// ── Static fallback insights ──────────────────────────────────────────────────

const FALLBACK_INSIGHTS = [
  '🧠 Peak focus: 2-4pm',
  '💡 Try 15-min sessions on low days',
  '🎯 You finish tasks one step at a time',
]

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Monday of the current week at 00:00 local time */
function getWeekStart(): Date {
  const now = new Date()
  const day = now.getDay() // 0 = Sun
  const daysToMonday = (day + 6) % 7
  const monday = new Date(now)
  monday.setDate(now.getDate() - daysToMonday)
  monday.setHours(0, 0, 0, 0)
  return monday
}

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

export function useSessionHistory(): SessionHistoryResult {
  const { userId, seasonalMode, setWeeklyStats } = useStore()

  const [energyTrend, setEnergyTrend] = useState<number[]>([])
  const [weeklyInsight, setWeeklyInsight] = useState<string[]>(FALLBACK_INSIGHTS)
  const [sessions, setSessions] = useState<FocusSessionRow[]>([])
  const [loading, setLoading] = useState(false)

  // Guard: only call the AI edge function once per mount
  const insightCalledRef = useRef(false)

  useEffect(() => {
    if (!userId || userId.startsWith('guest_')) return

    setLoading(true)

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    supabase
      .from('focus_sessions')
      .select('*')
      .eq('user_id', userId)
      .gte('started_at', thirtyDaysAgo)
      .order('started_at', { ascending: false })
      .then(({ data, error }) => {
        setLoading(false)
        if (error) { logError('useSessionHistory.fetch', error); return }

        const sessions: FocusSessionRow[] = (data ?? []) as FocusSessionRow[]

        // Expose raw sessions for psychotype derivation (O-7)
        setSessions(sessions)

        // Compute and store WeeklyStats
        const stats = computeWeeklyStats(sessions)
        setWeeklyStats(stats)

        // Energy trend — last 10 sessions with a non-null energy_after
        const trend = sessions
          .map(s => s.energy_after)
          .filter((e): e is number => e !== null)
          .slice(0, 10)
        setEnergyTrend(trend)

        // AI insights (once per mount)
        if (!insightCalledRef.current && sessions.length > 0) {
          insightCalledRef.current = true

          const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
          const recentSessions = sessions.filter(s => s.started_at >= last7Days)

          supabase.functions
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
            .then(({ data: insightData, error: insightError }) => {
              if (insightError) {
                logError('useSessionHistory.insight', insightError)
                return
              }
              // Edge function returns { insights: string[] }
              const raw = insightData as { insights?: string[] } | null
              const insights = raw?.insights
              if (Array.isArray(insights) && insights.length > 0) {
                setWeeklyInsight(insights)
              }
            })
        }
      })
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps
  // Intentionally omitting seasonalMode/setWeeklyStats — re-fetch only on login

  return { energyTrend, weeklyInsight, loading, sessions }
}
