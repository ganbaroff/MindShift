/**
 * Psychotype re-derivation from usage patterns (O-7).
 *
 * After ≥10 focus sessions, compute a behaviour-derived psychotype
 * that may differ from the onboarding-derived one.
 *
 * Scoring dimensions:
 *   achiever   — high deep-focus rate (flow/release phase reached)
 *   explorer   — high session variety (diverse durations + times of day)
 *   connector  — high consistency (many active days out of 30)
 *   planner    — predictable scheduling (low variance in session start hours)
 *
 * Returns null when there is insufficient data (< MIN_SESSIONS).
 *
 * Research: ADHD adults benefit from personalised feedback loops that
 * reflect *actual* patterns, not just self-reported preferences (O-7).
 */

import type { FocusSessionRow } from '@/types/database'
import type { Psychotype } from '@/types'

const MIN_SESSIONS = 10

function stdDev(values: number[]): number {
  if (values.length === 0) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length
  return Math.sqrt(variance)
}

export function deriveFromSessions(sessions: FocusSessionRow[]): Psychotype | null {
  if (sessions.length < MIN_SESSIONS) return null

  const scores: Record<Psychotype, number> = {
    achiever:  0,
    explorer:  0,
    connector: 0,
    planner:   0,
  }

  // -- Achiever: reached flow or release in majority of sessions --------------
  const deep = sessions.filter(
    s => s.phase_reached === 'flow' || s.phase_reached === 'release',
  )
  const deepRate = deep.length / sessions.length
  if (deepRate > 0.6) scores.achiever += 3
  else if (deepRate > 0.4) scores.achiever += 2
  else if (deepRate > 0.2) scores.achiever += 1

  // Bonus: average session length > 20 min
  const avgMinutes =
    sessions.reduce((a, s) => a + (s.duration_ms ?? 0), 0) / sessions.length / 60000
  if (avgMinutes > 25) scores.achiever += 1

  // -- Explorer: high variance in session durations AND start hours -----------
  const durations = sessions.map(s => (s.duration_ms ?? 0) / 60000)
  const hours     = sessions.map(s => new Date(s.started_at).getHours())
  const durStd    = stdDev(durations)
  const hourStd   = stdDev(hours)
  if (durStd > 15 && hourStd > 3) scores.explorer += 3
  else if (durStd > 10 || hourStd > 4) scores.explorer += 2
  else if (durStd > 5)  scores.explorer += 1

  // -- Connector: sessions spread across many unique days ---------------------
  const uniqueDays = new Set(sessions.map(s => new Date(s.started_at).toDateString())).size
  // Out of a 30-day window
  const dayRate = uniqueDays / 30
  if (dayRate > 0.5) scores.connector += 3
  else if (dayRate > 0.3) scores.connector += 2
  else if (dayRate > 0.15) scores.connector += 1

  // Bonus: low burnout signal (energy stays stable — energy_after not much lower than energy_before)
  const energyDeltas = sessions
    .filter(s => s.energy_before != null && s.energy_after != null)
    .map(s => (s.energy_after as number) - (s.energy_before as number))
  if (energyDeltas.length > 0) {
    const avgDelta = energyDeltas.reduce((a, b) => a + b, 0) / energyDeltas.length
    if (avgDelta >= 0) scores.connector += 1  // sessions feel restorative
  }

  // -- Planner: consistent start times (low hour variance) -------------------
  if (hourStd < 2) scores.planner += 3
  else if (hourStd < 3.5) scores.planner += 2
  else if (hourStd < 5) scores.planner += 1

  // Bonus: consistent session lengths (focused routine)
  if (durStd < 5) scores.planner += 1

  // -- Winner -----------------------------------------------------------------
  const sorted = (Object.entries(scores) as [Psychotype, number][])
    .sort((a, b) => b[1] - a[1])

  // Only suggest re-derivation if the top scorer has a meaningful lead (≥2 pts)
  if (sorted[0][1] < 2) return null
  return sorted[0][0]
}
