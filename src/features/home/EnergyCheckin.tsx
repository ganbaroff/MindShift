import { motion } from 'motion/react'
import { useMotion } from '@/shared/hooks/useMotion'
import { useTranslation } from 'react-i18next'
import type { EnergyLevel } from '@/types'
import { ENERGY_EMOJI } from '@/shared/lib/constants'

// -- Energy level options — labels resolved via i18n --------------------------

const ENERGY_LEVELS: EnergyLevel[] = [1, 2, 3, 4, 5]
const ENERGY_LABEL_KEYS = ['energy.drained', 'energy.low', 'energy.okay', 'energy.good', 'energy.wired'] as const

interface Props {
  onSelect: (level: EnergyLevel) => void
  selected?: EnergyLevel | null
  compact?: boolean
}

export function EnergyCheckin({ onSelect, selected, compact = false }: Props) {
  const { shouldAnimate, t: transition } = useMotion()
  const { t } = useTranslation()

  return (
    <div className="flex gap-2 justify-between">
      {ENERGY_LEVELS.map((level, i) => {
        const isSelected = selected === level
        const label = t(ENERGY_LABEL_KEYS[i])
        return (
          <motion.button
            key={level}
            initial={shouldAnimate ? { opacity: 0, y: 10 } : {}}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...transition(), delay: i * 0.06 }}
            whileTap={shouldAnimate ? { scale: 0.90 } : {}}
            onClick={() => onSelect(level)}
            aria-label={`Energy level ${level} — ${label}`}
            aria-pressed={isSelected}
            className="flex flex-col items-center gap-1 flex-1 rounded-2xl transition-all duration-200"
            style={{
              padding: compact ? '10px 4px' : '14px 4px',
              background: isSelected ? 'rgba(123, 114, 255, 0.18)' : 'var(--color-surface-card)',
              border: isSelected ? '2px solid var(--color-primary)' : '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <span style={{ fontSize: compact ? '1.5rem' : '2rem', lineHeight: 1 }}>{ENERGY_EMOJI[i]}</span>
            {!compact && (
              <span
                className="text-xs font-medium"
                style={{ color: isSelected ? 'var(--color-primary)' : 'var(--color-text-muted)' }}
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
