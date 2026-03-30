import type { AppMode, CognitiveMode, Psychotype, Achievement } from '@/types'
import { ACHIEVEMENT_DEFINITIONS } from '@/types'

// ── Psychotype derivation ─────────────────────────────────────────────────────
// Derives a personality profile from onboarding choices.
// system → planner | habit → connector | minimal+focused → achiever | minimal+overview → explorer
export function derivePsychotype(mode: AppMode, cognitive: CognitiveMode): Psychotype {
  if (mode === 'system')  return 'planner'
  if (mode === 'habit')   return 'connector'
  if (cognitive === 'focused') return 'achiever'
  return 'explorer'
}

export function initAchievements(): Achievement[] {
  return ACHIEVEMENT_DEFINITIONS.map(a => ({ ...a, unlockedAt: null }))
}
