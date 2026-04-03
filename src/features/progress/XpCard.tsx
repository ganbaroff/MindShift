import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useMotion } from '@/shared/hooks/useMotion'
import { useStore } from '@/store'

const LEVEL_KEYS = ['seedling', 'sprout', 'grower', 'bloomer', 'flourisher',
  'cultivator', 'nurturer', 'luminary', 'pathfinder', 'sage'] as const

export function XpCard() {
  const { shouldAnimate } = useMotion()
  const { t } = useTranslation()
  const xpTotal = useStore(s => s.xpTotal)

  const xpSafe = xpTotal ?? 0
  const level = Math.floor(xpSafe / 1000) + 1
  const xpInLevel = xpSafe % 1000
  const xpToNext = 1000
  const levelKey = LEVEL_KEYS[Math.min(level - 1, LEVEL_KEYS.length - 1)]
  const levelName = t(`levels.${levelKey}`)

  return (
    <motion.div
      initial={shouldAnimate ? { opacity: 0, y: 12 } : false}
      animate={shouldAnimate ? { opacity: 1, y: 0 } : false}
      className="rounded-2xl p-3"
      style={{ backgroundColor: 'var(--color-surface-card)' }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-[24px] shrink-0"
          style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-teal))', padding: 2 }}
        >
          <div
            className="w-full h-full rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--color-surface-card)' }}
          >
            🧠
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {t('progress.level', { level, name: levelName })}
          </p>
          <p className="text-[13px]" style={{ color: 'var(--color-primary)' }}>
            {xpSafe.toLocaleString()} XP
          </p>
          <div
            className="w-full h-1.5 rounded-full mt-1.5 overflow-hidden"
            style={{ backgroundColor: 'var(--color-surface-raised)' }}
          >
            <div
              className="h-full rounded-full gradient-primary-teal"
              style={{ width: `${(xpInLevel / xpToNext) * 100}%` }}
            />
          </div>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {t('progress.xpToNext', { current: xpInLevel, next: xpToNext, level: level + 1 })}
          </p>
        </div>
      </div>
    </motion.div>
  )
}
