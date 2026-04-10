/**
 * UI Tone System — Age-adaptive personalization
 *
 * Auto-derives cohort from existing store signals (no age collection needed).
 * Provides copy variants + UI density for Mochi, badges, recovery, streaks.
 *
 * Rules:
 * - Never changes components or CSS — only string content + density hint
 * - Fallback to 'neutral' when signals are insufficient
 * - User can override via Settings ("Interface style" picker)
 */

import i18n from '@/i18n'

export type UITone = 'gen_z' | 'millennial' | 'gen_x' | 'neutral'

export type UIDensity = 'compact' | 'normal' | 'rich'

/** Human-facing label for the Settings picker (never named by generation). */
export const TONE_LABELS: Record<UITone, string> = {
  gen_z: 'Dynamic',
  millennial: 'Balanced',
  gen_x: 'Clear',
  neutral: 'Auto',
}

export const TONE_DESCRIPTIONS: Record<UITone, string> = {
  gen_z: 'Casual, emoji-rich, minimal data',
  millennial: 'Coaching tone, more metrics',
  gen_x: 'Straightforward, numbers-first',
  neutral: 'Adapts to your usage patterns',
}

/** Density hint per tone — components can use this to show more/less data. */
export const TONE_DENSITY: Record<UITone, UIDensity> = {
  gen_z: 'compact',
  millennial: 'rich',
  gen_x: 'normal',
  neutral: 'normal',
}

// -- Cohort detection --------------------------------------------------------

// CohortSignals interface — inlined into deriveUITone parameter type.
// Kept as documentation reference:
// { appMode, emotionalReactivity, timeBlindness, psychotype?, seasonalMode? }

/**
 * Derive UI tone from existing store fields.
 *
 * gen_z:       minimal intent + high emotional reactivity, OR
 *              minimal + often time-blind + launch mode
 * millennial:  system intent + rarely time-blind, OR
 *              achiever/planner psychotype + system mode
 * gen_x:       habit intent + steady reactivity, OR
 *              habit + maintain/recover seasonal mode
 * neutral:     everything else
 */
export function deriveUITone(
  appMode: string,
  emotionalReactivity: string | null,
  timeBlindness: string | null,
  psychotype?: string | null,
  seasonalMode?: string,
): UITone {
  // Gen Z signals
  if (appMode === 'minimal' && emotionalReactivity === 'high') return 'gen_z'
  if (appMode === 'minimal' && timeBlindness === 'often' && seasonalMode === 'launch') return 'gen_z'

  // Millennial signals
  if (appMode === 'system' && timeBlindness === 'rarely') return 'millennial'
  if (appMode === 'system' && (psychotype === 'achiever' || psychotype === 'planner')) return 'millennial'

  // Gen X signals
  if (appMode === 'habit' && emotionalReactivity === 'steady') return 'gen_x'
  if (appMode === 'habit' && (seasonalMode === 'maintain' || seasonalMode === 'recover')) return 'gen_x'

  return 'neutral'
}

// -- Copy variants per tone --------------------------------------------------

export interface ToneCopy {
  // Mochi greetings
  mochiHey: string
  mochiGreat: string
  mochiComeBack: string
  // Badge toast
  badgeUnlocked: (name: string) => string
  // Streak
  streakBreak: string
  streakGoing: (days: number) => string
  // Recovery
  recoveryWelcome: string
  // Error
  errorGeneric: string
  // Energy
  lowEnergyNudge: string
  highEnergyNudge: string
  // Gamification labels (gen_x strips emoji/game language)
  xpLabel: string
  streakLabel: string
  badgeLabel: string
}

/** i18n key prefix per tone */
const TONE_I18N_PREFIX: Record<UITone, string> = {
  gen_z: 'uiTone.genZ',
  millennial: 'uiTone.millennial',
  gen_x: 'uiTone.genX',
  neutral: 'uiTone.neutral',
}

function buildToneCopy(prefix: string): ToneCopy {
  return {
    mochiHey: i18n.t(`${prefix}.mochiHey`),
    mochiGreat: i18n.t(`${prefix}.mochiGreat`),
    mochiComeBack: i18n.t(`${prefix}.mochiComeBack`),
    badgeUnlocked: (name: string) => i18n.t(`${prefix}.badgeUnlocked`, { name }),
    streakBreak: i18n.t(`${prefix}.streakBreak`),
    streakGoing: (days: number) => i18n.t(`${prefix}.streakGoing`, { days }),
    recoveryWelcome: i18n.t(`${prefix}.recoveryWelcome`),
    errorGeneric: i18n.t(`${prefix}.errorGeneric`),
    lowEnergyNudge: i18n.t(`${prefix}.lowEnergyNudge`),
    highEnergyNudge: i18n.t(`${prefix}.highEnergyNudge`),
    xpLabel: i18n.t(`${prefix}.xpLabel`),
    streakLabel: i18n.t(`${prefix}.streakLabel`),
    badgeLabel: i18n.t(`${prefix}.badgeLabel`),
  }
}

export function getToneCopy(tone: UITone): ToneCopy {
  const prefix = TONE_I18N_PREFIX[tone] ?? TONE_I18N_PREFIX.neutral
  return buildToneCopy(prefix)
}

export function getDensity(tone: UITone): UIDensity {
  return TONE_DENSITY[tone] ?? 'normal'
}
