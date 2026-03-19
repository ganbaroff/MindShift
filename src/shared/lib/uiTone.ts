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

// ── Cohort detection ────────────────────────────────────────────────────────

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

// ── Copy variants per tone ──────────────────────────────────────────────────

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

const GEN_Z_COPY: ToneCopy = {
  mochiHey: 'yo! 👋',
  mochiGreat: 'that was fire 🔥',
  mochiComeBack: 'we missed you fr 🥺',
  badgeUnlocked: (name) => `${name} unlocked — you ate 🚀`,
  streakBreak: 'no stress, tomorrow is a new day 💜',
  streakGoing: (days) => `${days} days straight — you're on one 🔥`,
  recoveryWelcome: "you're back and that's literally all that matters 💜",
  errorGeneric: 'oops, something broke 😅',
  lowEnergyNudge: 'low battery mode — we got you 🌿',
  highEnergyNudge: "let's go, you're locked in ⚡",
  xpLabel: 'XP',
  streakLabel: 'streak',
  badgeLabel: 'badges',
}

const MILLENNIAL_COPY: ToneCopy = {
  mochiHey: 'hey there 👋',
  mochiGreat: 'great work today ✨',
  mochiComeBack: 'welcome back — good to see you',
  badgeUnlocked: (name) => `Achievement unlocked: ${name} 🏆`,
  streakBreak: 'streak paused — pick up when ready',
  streakGoing: (days) => `${days}-day streak — consistent effort pays off 💪`,
  recoveryWelcome: "welcome back — let's pick up where you left off",
  errorGeneric: 'Something went wrong. Please try again.',
  lowEnergyNudge: 'Taking it easy today — that counts too 🌿',
  highEnergyNudge: "Great energy! Let's make the most of it ✨",
  xpLabel: 'XP',
  streakLabel: 'streak',
  badgeLabel: 'achievements',
}

const GEN_X_COPY: ToneCopy = {
  mochiHey: 'Hello.',
  mochiGreat: 'Well done.',
  mochiComeBack: 'Welcome back.',
  badgeUnlocked: (name) => `${name} completed`,
  streakBreak: 'Streak paused. Resume anytime.',
  streakGoing: (days) => `${days} consecutive days`,
  recoveryWelcome: 'Welcome back. Ready when you are.',
  errorGeneric: 'Something went wrong. Please try again.',
  lowEnergyNudge: 'Light day — one task is enough.',
  highEnergyNudge: 'Good energy. Make the most of it.',
  xpLabel: 'Progress',
  streakLabel: 'Consecutive days',
  badgeLabel: 'Milestones',
}

const NEUTRAL_COPY: ToneCopy = {
  mochiHey: 'hey 👋',
  mochiGreat: 'well done ✨',
  mochiComeBack: 'welcome back 💙',
  badgeUnlocked: (name) => `${name} — unlocked ✨`,
  streakBreak: 'tomorrow is a fresh start',
  streakGoing: (days) => `${days} days — you keep showing up 💫`,
  recoveryWelcome: 'you showed up — that matters 💙',
  errorGeneric: 'Something went wrong',
  lowEnergyNudge: 'One thing today — that\'s enough 🌿',
  highEnergyNudge: 'Good energy today ✨',
  xpLabel: 'XP',
  streakLabel: 'streak',
  badgeLabel: 'badges',
}

const TONE_MAP: Record<UITone, ToneCopy> = {
  gen_z: GEN_Z_COPY,
  millennial: MILLENNIAL_COPY,
  gen_x: GEN_X_COPY,
  neutral: NEUTRAL_COPY,
}

export function getToneCopy(tone: UITone): ToneCopy {
  return TONE_MAP[tone] ?? NEUTRAL_COPY
}

export function getDensity(tone: UITone): UIDensity {
  return TONE_DENSITY[tone] ?? 'normal'
}
