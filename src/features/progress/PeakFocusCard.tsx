import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useMotion } from '@/shared/hooks/useMotion'
import { useStore } from '@/store'

export function PeakFocusCard() {
  const { shouldAnimate } = useMotion()
  const { t } = useTranslation()
  const weeklyStats = useStore(s => s.weeklyStats)

  if (!weeklyStats || weeklyStats.peakFocusTime === 'Not enough data') return null

  return (
    <motion.div
      initial={shouldAnimate ? { opacity: 0, y: 12 } : false}
      animate={shouldAnimate ? { opacity: 1, y: 0 } : false}
      transition={shouldAnimate ? { delay: 0.17 } : undefined}
      className="rounded-2xl p-3"
      style={{
        backgroundColor: 'var(--color-surface-card)',
        border: '1px solid rgba(78,205,196,0.12)',
      }}
    >
      <p
        className="text-[11px] uppercase tracking-widest mb-2"
        style={{ color: 'var(--color-teal)' }}
      >
        {t('progress.peakFocusWindow')}
      </p>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[20px] font-bold" style={{ color: 'var(--color-teal)' }}>
            {weeklyStats.peakFocusTime}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {t('progress.mostProductiveTime')}
          </p>
        </div>
        {weeklyStats.consistencyScore > 0 && (
          <div className="text-right">
            <p className="text-[18px] font-bold" style={{ color: 'var(--color-primary)' }}>
              {Math.round(weeklyStats.consistencyScore * 7)}/7
            </p>
            <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
              {t('progress.daysActive')}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  )
}
