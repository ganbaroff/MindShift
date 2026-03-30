import type { EnergyLevel } from '@/types'

export type TimeBlock = 'morning' | 'afternoon' | 'evening'

export function getTimeBlock(): TimeBlock {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 18) return 'afternoon'
  return 'evening'
}

export const GREETING_KEYS: Record<TimeBlock, string> = {
  morning: 'today.morning',
  afternoon: 'today.afternoon',
  evening: 'today.evening',
}

export const GREETING_EMOJI: Record<TimeBlock, string> = {
  morning: '☀️',
  afternoon: '🌤️',
  evening: '🌙',
}

export function getEnergyAdvice(
  level: EnergyLevel,
  taskCount: number,
  copy: { lowEnergyNudge: string; highEnergyNudge: string },
): string | null {
  if (level <= 2) return copy.lowEnergyNudge
  if (level >= 4 && taskCount > 0) return copy.highEnergyNudge
  return null
}
