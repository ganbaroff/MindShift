/**
 * EnergyWidget — Bento grid version of the energy check-in.
 * Compact card: shows current level + quick re-select.
 */
import { motion } from 'motion/react'
import { useStore } from '@/store'
import type { EnergyLevel } from '@/types'

const LEVELS: { level: EnergyLevel; emoji: string; label: string; color: string }[] = [
  { level: 1, emoji: '😴', label: 'Low',   color: '#4A4580' },
  { level: 2, emoji: '😌', label: 'Calm',  color: '#5B5499' },
  { level: 3, emoji: '🙂', label: 'Good',  color: '#7B72FF' },
  { level: 4, emoji: '😄', label: 'High',  color: '#4ECDC4' },
  { level: 5, emoji: '⚡', label: 'Peak',  color: '#F59E0B' },
]

export function EnergyWidget() {
  const { energyLevel, setEnergyLevel } = useStore()
  const current = LEVELS.find(l => l.level === energyLevel) ?? LEVELS[2]

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium tracking-widest uppercase" style={{ color: '#8B8BA7' }}>
          Energy
        </p>
        <span className="text-xs font-semibold" style={{ color: current.color }}>
          {current.label}
        </span>
      </div>

      {/* Level selector */}
      <div className="flex items-center justify-between gap-1">
        {LEVELS.map(({ level, emoji, color }) => {
          const isSelected = level === energyLevel
          return (
            <motion.button
              key={level}
              onClick={() => setEnergyLevel(level)}
              whileTap={{ scale: 0.88 }}
              className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl transition-all duration-150"
              style={{
                background: isSelected ? `${color}20` : 'transparent',
                border: `1.5px solid ${isSelected ? color : 'transparent'}`,
              }}
            >
              <span className="text-xl leading-none">{emoji}</span>
              <span
                className="text-xs font-bold"
                style={{ color: isSelected ? color : '#8B8BA7' }}
              >
                {level}
              </span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
