import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useMotion } from '@/shared/hooks/useMotion'
import { ENERGY_EMOJI } from '@/shared/lib/constants'

interface EnergyTrendCardProps {
  energyTrend: number[]
}

export function EnergyTrendCard({ energyTrend }: EnergyTrendCardProps) {
  const { shouldAnimate } = useMotion()
  const { t } = useTranslation()

  const energyTrendEmojis = energyTrend
    .slice(0, 5)
    .map(e => ENERGY_EMOJI[Math.min(4, Math.max(0, e - 1))])

  return (
    <motion.div
      initial={shouldAnimate ? { opacity: 0, y: 12 } : false}
      animate={shouldAnimate ? { opacity: 1, y: 0 } : false}
      transition={shouldAnimate ? { delay: 0.15 } : undefined}
      className="rounded-2xl p-3"
      style={{ backgroundColor: 'var(--color-surface-card)' }}
    >
      <p
        className="text-[11px] uppercase tracking-widest mb-1.5"
        style={{ color: 'var(--color-teal)' }}
      >
        {t('progress.energyAfterSessions')}
      </p>
      {energyTrendEmojis.length > 0 ? (
        <>
          <div className="flex gap-1 text-[22px]">
            {energyTrendEmojis.map((emoji, i) => (
              <span key={i}>{emoji}</span>
            ))}
          </div>
          <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {t('progress.lastSessions', { count: energyTrendEmojis.length })}
          </p>
        </>
      ) : (
        <>
          <p className="text-[13px]" style={{ color: 'var(--color-teal)' }}>
            {t('progress.noEnergyData')}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {t('progress.completeToTrack')}
          </p>
        </>
      )}
    </motion.div>
  )
}
