/**
 * UI Tone System — P0 Gen Z personalization
 *
 * Auto-derives tone from existing store signals (no age collection needed).
 * Provides copy variants for Mochi, badges, recovery, streaks.
 *
 * Rules:
 * - Never changes components or CSS — only string content
 * - Fallback to 'neutral' when signals are insufficient
 */

export type UITone = 'gen_z' | 'millennial' | 'neutral'

/**
 * Derive UI tone from existing store fields.
 *
 * gen_z:       minimal intent + high emotional reactivity (younger, emotion-driven)
 * millennial:  system intent + rarely time-blind (structured, time-aware)
 * neutral:     everything else
 */
export function deriveUITone(
  appMode: string,
  emotionalReactivity: string | null,
  timeBlindness: string | null,
): UITone {
  if (appMode === 'minimal' && emotionalReactivity === 'high') return 'gen_z'
  if (appMode === 'system' && timeBlindness === 'rarely') return 'millennial'
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
}

const TONE_MAP: Record<UITone, ToneCopy> = {
  gen_z: GEN_Z_COPY,
  millennial: MILLENNIAL_COPY,
  neutral: NEUTRAL_COPY,
}

export function getToneCopy(tone: UITone): ToneCopy {
  return TONE_MAP[tone] ?? NEUTRAL_COPY
}
