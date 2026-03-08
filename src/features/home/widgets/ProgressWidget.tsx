/**
 * ProgressWidget — XP bar, level, achievement count.
 * Non-punitive: shows positive momentum only.
 * Research: Gamification without punishment → dopamine without shame loops.
 */
import { motion } from 'framer-motion'
import { useStore } from '@/store'

/** XP needed to reach next level */
function xpForLevel(level: number): number { return level * 100 }
function getLevel(xp: number): number { return Math.floor(xp / 100) + 1 }
function getLevelProgress(xp: number): number {
  const level = getLevel(xp)
  const base = (level - 1) * 100
  return (xp - base) / 100
}

const LEVEL_LABELS: Record<number, string> = {
  1: 'Seedling 🌱', 2: 'Sprout 🪴', 3: 'Bloom 🌸', 4: 'Focused 🎯',
  5: 'Flowing 🌊', 6: 'Deep Diver 🤿', 7: 'Architect 🗂️', 8: 'Flow Master 🔥',
  9: 'Mind Sage 🧘', 10: 'Legend ✨',
}

export function ProgressWidget() {
  const { xpTotal, achievements } = useStore()
  const level = getLevel(xpTotal)
  const progress = getLevelProgress(xpTotal)
  const pct = Math.round(progress * 100)
  const xpInLevel = xpTotal - (level - 1) * 100
  const xpNeeded = xpForLevel(level)
  const unlocked = achievements.filter(a => a.unlockedAt !== null).length
  const levelLabel = LEVEL_LABELS[Math.min(level, 10)] ?? '✨ Legend'

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium tracking-widest uppercase" style={{ color: '#8B8BA7' }}>
          Progress
        </p>
        <span className="text-xs" style={{ color: '#FFE66D' }}>
          🏆 {unlocked} unlocked
        </span>
      </div>

      {/* Level + label */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
          style={{ background: 'rgba(108,99,255,0.2)', color: '#6C63FF' }}
        >
          {level}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: '#E8E8F0' }}>
            {levelLabel}
          </p>
          <p className="text-xs" style={{ color: '#8B8BA7' }}>
            {xpInLevel} / {xpNeeded} XP to next level
          </p>
        </div>
      </div>

      {/* XP bar */}
      <div className="h-2 rounded-full overflow-hidden" style={{ background: '#2D3150' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{
            background: 'linear-gradient(to right, #6C63FF, #4ECDC4)',
          }}
        />
      </div>
    </div>
  )
}
