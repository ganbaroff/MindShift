// ── Toast notifications (sonner) ──────────────────────────────────────────────
// Centralised notification layer — importable from anywhere (not a React hook).

import { toast } from 'sonner'
import { hapticDone, hapticWow } from './haptic'

export function notifyXP(amount: number): void {
  hapticDone()
  toast.success(`+${amount} XP earned!`, { duration: 2500 })
}

// Variable Ratio bonus notification — fired on lucky phasic burst (~25% chance)
export function notifyXPBonus(amount: number): void {
  hapticWow()
  toast.success(`⚡ Lucky burst! +${amount} XP`, {
    duration: 3000,
    description: 'Bonus dopamine 🎉',
  })
}

export function notifyAchievement(name: string, emoji: string, description: string): void {
  hapticWow()
  toast(`${emoji} ${name}`, {
    description,
    duration: 5000,
  })
}

export function notifyFocusEnd(minutes: number): void {
  hapticDone()
  toast.success(`💪 ${minutes} min of deep focus!`, { duration: 3500 })
}

export function notifyTaskDone(title: string): void {
  hapticDone()
  toast.success(`✓ ${title}`, { duration: 2000 })
}

export function notifyError(message: string): void {
  toast.error(message, { duration: 4000 })
}
