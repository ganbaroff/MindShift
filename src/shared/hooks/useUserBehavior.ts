import { useMemo } from 'react'
import { useStore } from '@/store'
import type { FocusSessionRow } from '@/types/database'

export interface UserBehaviorProfile {
  /** Average session duration in minutes */
  avgSessionMinutes: number
  /** How often user reaches flow phase (0-1) */
  flowRate: number
  /** How often user drops out in struggle phase (0-1) */
  struggleDropRate: number
  /** Most common session time of day */
  peakHour: number | null
  /** Average energy level */
  avgEnergy: number
  /** Energy trend: improving/stable/declining */
  energyTrend: 'improving' | 'stable' | 'declining' | null
  /** Human-readable struggle description for AI context */
  recentStruggles: string | null
  /** Total lifetime sessions */
  totalSessions: number
  /** Tasks completed today */
  completedToday: number
}

/**
 * Aggregates user behavior patterns from focus sessions and store data
 * into a profile suitable for AI edge-function context (e.g. Mochi).
 *
 * @param sessions - FocusSessionRow[] from useSessionHistory
 */
export function useUserBehavior(sessions: FocusSessionRow[]): UserBehaviorProfile {
  const nowPool = useStore((s) => s.nowPool)
  const nextPool = useStore((s) => s.nextPool)
  const somedayPool = useStore((s) => s.somedayPool)

  return useMemo(() => {
    const totalSessions = sessions.length

    // ── Average session duration ──────────────────────────────────────
    const durationsMs = sessions
      .map((s) => s.duration_ms)
      .filter((d): d is number => d != null && d > 0)
    const avgSessionMinutes =
      durationsMs.length > 0
        ? durationsMs.reduce((sum, ms) => sum + ms, 0) / durationsMs.length / 60_000
        : 0

    // ── Flow rate & struggle drop rate ────────────────────────────────
    const sessionsWithPhase = sessions.filter((s) => s.phase_reached != null)
    const phaseCount = sessionsWithPhase.length
    const flowRate =
      phaseCount > 0
        ? sessionsWithPhase.filter((s) => s.phase_reached === 'flow').length / phaseCount
        : 0
    const struggleDropRate =
      phaseCount > 0
        ? sessionsWithPhase.filter((s) => s.phase_reached === 'struggle').length / phaseCount
        : 0

    // ── Peak hour ─────────────────────────────────────────────────────
    let peakHour: number | null = null
    if (totalSessions > 0) {
      const hourCounts = new Map<number, number>()
      for (const s of sessions) {
        const h = new Date(s.started_at).getHours()
        hourCounts.set(h, (hourCounts.get(h) ?? 0) + 1)
      }
      let maxCount = 0
      for (const [hour, count] of hourCounts) {
        if (count > maxCount) {
          maxCount = count
          peakHour = hour
        }
      }
    }

    // ── Average energy ────────────────────────────────────────────────
    const energyValues = sessions
      .map((s) => s.energy_after ?? s.energy_before)
      .filter((e): e is number => e != null)
    const avgEnergy =
      energyValues.length > 0
        ? energyValues.reduce((sum, e) => sum + e, 0) / energyValues.length
        : 0

    // ── Energy trend ──────────────────────────────────────────────────
    let energyTrend: 'improving' | 'stable' | 'declining' | null = null
    const sessionsWithEnergyAfter = sessions
      .filter((s) => s.energy_after != null)
      .sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime())

    if (sessionsWithEnergyAfter.length >= 10) {
      const first5 = sessionsWithEnergyAfter.slice(0, 5)
      const last5 = sessionsWithEnergyAfter.slice(-5)
      const avgFirst =
        first5.reduce((sum, s) => sum + (s.energy_after as number), 0) / 5
      const avgLast =
        last5.reduce((sum, s) => sum + (s.energy_after as number), 0) / 5
      const delta = avgLast - avgFirst
      if (delta > 0.5) energyTrend = 'improving'
      else if (delta < -0.5) energyTrend = 'declining'
      else energyTrend = 'stable'
    } else if (sessionsWithEnergyAfter.length >= 2) {
      // With fewer sessions, still attempt a basic comparison
      const first = sessionsWithEnergyAfter.slice(0, Math.min(5, sessionsWithEnergyAfter.length))
      const last = sessionsWithEnergyAfter.slice(-Math.min(5, sessionsWithEnergyAfter.length))
      const avgFirst =
        first.reduce((sum, s) => sum + (s.energy_after as number), 0) / first.length
      const avgLast =
        last.reduce((sum, s) => sum + (s.energy_after as number), 0) / last.length
      const delta = avgLast - avgFirst
      if (delta > 0.5) energyTrend = 'improving'
      else if (delta < -0.5) energyTrend = 'declining'
      else energyTrend = 'stable'
    }

    // ── Completed today ───────────────────────────────────────────────
    const todayISO = new Date().toISOString().slice(0, 10)
    const allTasks = [...nowPool, ...nextPool, ...somedayPool]
    // Only count 'task' type completions (not reminders/meetings/ideas)
    const completedToday = allTasks.filter(
      (t) =>
        t.status === 'completed' &&
        t.taskType === 'task' &&
        t.completedAt != null &&
        t.completedAt.startsWith(todayISO)
    ).length

    // ── Recent struggles (human-readable for AI context) ──────────────
    const struggles: string[] = []
    if (struggleDropRate > 0.5) {
      struggles.push('Often ends sessions before reaching release phase')
    }
    if (avgSessionMinutes > 0 && avgSessionMinutes < 10) {
      struggles.push('Sessions tend to be very short — difficulty sustaining focus')
    }
    if (flowRate < 0.1 && totalSessions > 5) {
      struggles.push('Rarely reaches deep flow state')
    }
    if (energyTrend === 'declining') {
      struggles.push('Energy has been declining recently')
    }
    const recentStruggles = struggles.length > 0 ? struggles.join('; ') : null

    return {
      avgSessionMinutes: Math.round(avgSessionMinutes * 10) / 10,
      flowRate: Math.round(flowRate * 100) / 100,
      struggleDropRate: Math.round(struggleDropRate * 100) / 100,
      peakHour,
      avgEnergy: Math.round(avgEnergy * 10) / 10,
      energyTrend,
      recentStruggles,
      totalSessions,
      completedToday,
    }
  }, [sessions, nowPool, nextPool, somedayPool])
}
