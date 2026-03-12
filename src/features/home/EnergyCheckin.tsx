import { motion } from 'motion/react'
import { useMotion } from '@/shared/hooks/useMotion'
import type { EnergyLevel } from '@/types'
import { ENERGY_LABELS, ENERGY_EMOJI } from '@/shared/lib/constants'

// ── Energy level options — canonical labels from constants.ts ─────────────────

const ENERGY_OPTIONS: { level: EnergyLevel; emoji: string; label: string }[] = [
  { level: 1, emoji: ENERGY_EMOJI[0], label: ENERGY_LABELS[0] },
  { level: 2, emoji: ENERGY_EMOJI[1], label: ENERGY_LABELS[1] },
  { level: 3, emoji: ENERGY_EMOJI[2], label: ENERGY_LABELS[2] },
  { level: 4, emoji: ENERGY_EMOJI[3], label: ENERGY_LABELS[3] },
  { level: 5, emoji: ENERGY_EMOJI[4], label: ENERGY_LABELS[4] },
]

interface Props {
  onSelect: (level: EnergyLevel) => void
  selected?: EnergyLevel | null
  compact?: boolean
}

export function EnergyCheckin({ onSelect, selected, compact = false }: Props) {
  const { shouldAnimate, t } = useMotion()

  return (
    <div className="flex gap-2 justify-between">
      {ENERGY_OPTIONS.map(({ level, emoji, label }, i) => {
        const isSelected = selected === level
        return (
          <motion.button
            key={level}
            initial={shouldAnimate ? { opacity: 0, y: 10 } : {}}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...t(), delay: i * 0.06 }}
            whileTap={shouldAnimate ? { scale: 0.90 } : {}}
            onClick={() => onSelect(level)}
            aria-label={`Energy level ${level} — ${label}`}
            aria-pressed={isSelected}
            className="flex flex-col items-center gap-1 flex-1 rounded-2xl transition-all duration-200"
            style={{
              padding: compact ? '10px 4px' : '14px 4px',
              background: isSelected ? 'rgba(123, 114, 255, 0.18)' : '#1E2136',
              border: isSelected ? '2px solid #7B72FF' : '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <span style={{ fontSize: compact ? '1.5rem' : '2rem', lineHeight: 1 }}>{emoji}</span>
            {!compact && (
              <span
                className="text-xs font-medium"
                style={{ color: isSelected ? '#7B72FF' : '#8B8BA7' }}
              >
                {label}
              </span>
            )}
          </motion.button>
        )
      })}
    </div>
  )
}
