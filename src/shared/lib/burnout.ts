/**
 * Burnout Radar — Block 2
 *
 * Computes a 0–100 burnout score from behavioural signals.
 * Higher score = more risk of ADHD burnout spiral.
 *
 * Formula (weighted):
 *   snoozeRatio     × 30%  — task avoidance proxy
 *   completionDecay × 30%  — falling task completion rate
 *   sessionDecay    × 25%  — fewer / shorter focus sessions
 *   energyDecay     × 15%  — sustained low energy
 *
 * Thresholds:
 *   0–40   healthy
 *   41–65  caution (amber)
 *   66–100 burnout (purple — NEVER red)
 *
 * Privacy: runs entirely client-side. No data leaves the device.
 */

export interface BurnoutBehaviors {
  /** Tasks snoozed vs total active tasks, 0–1 */
  snoozeRatio: number
  /** Recent completion rate drop vs 7-day average, 0–1 (0 = no drop, 1 = complete halt) */
  completionDecay: number
  /** Reduction in daily session minutes vs personal average, 0–1 */
  sessionDecay: number
  /** Average energy level normalised to 0–1 (energy 1 = 1.0, energy 5 = 0.0) */
  energyDecay: number
}

/**
 * Compute burnout score from raw behaviour signals.
 * Each dimension is clamped [0, 1] before weighting.
 */
export function computeBurnoutScore(behaviors: BurnoutBehaviors): number {
  const clamp = (v: number) => Math.max(0, Math.min(1, v))

  const weighted =
    clamp(behaviors.snoozeRatio)     * 0.30 +
    clamp(behaviors.completionDecay) * 0.30 +
    clamp(behaviors.sessionDecay)    * 0.25 +
    clamp(behaviors.energyDecay)     * 0.15

  return Math.round(weighted * 100)
}

/** Classify score into severity tier */
export type BurnoutTier = 'healthy' | 'caution' | 'burnout'

export function getBurnoutTier(score: number): BurnoutTier {
  if (score <= 40) return 'healthy'
  if (score <= 65) return 'caution'
  return 'burnout'
}

/**
 * Build BurnoutBehaviors from store-level data.
 * Call this on app load + after each session/task completion.
 */
export function deriveBehaviors(params: {
  snoozedCount: number
  activeCount: number
  recentCompletedPerDay: number   // avg completed tasks/day, last 3 days
  avgCompletedPerDay: number      // avg completed tasks/day, last 7 days
  recentSessionMinutes: number    // avg session minutes/day, last 3 days
  avgSessionMinutes: number       // avg session minutes/day, last 7 days
  recentAvgEnergy: number         // avg energy level, last 3 sessions (1–5)
}): BurnoutBehaviors {
  const {
    snoozedCount, activeCount,
    recentCompletedPerDay, avgCompletedPerDay,
    recentSessionMinutes, avgSessionMinutes,
    recentAvgEnergy,
  } = params

  const snoozeRatio = activeCount > 0 ? snoozedCount / activeCount : 0

  // Completion decay: how much has recent rate dropped vs baseline
  const completionDecay = avgCompletedPerDay > 0
    ? Math.max(0, 1 - recentCompletedPerDay / avgCompletedPerDay)
    : 0

  // Session decay: drop in session time
  const sessionDecay = avgSessionMinutes > 0
    ? Math.max(0, 1 - recentSessionMinutes / avgSessionMinutes)
    : 0

  // Energy decay: energy 1 = high risk (1.0), energy 5 = no risk (0.0)
  const energyDecay = recentAvgEnergy > 0
    ? (5 - recentAvgEnergy) / 4
    : 0

  return { snoozeRatio, completionDecay, sessionDecay, energyDecay }
}
