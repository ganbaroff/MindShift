import { useMemo } from 'react'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useMotion } from '@/shared/hooks/useMotion'
import { useStore } from '@/store'

export function FocusScoreCard() {
  const { shouldAnimate } = useMotion()
  const { t } = useTranslation()
  const weeklyStats = useStore(s => s.weeklyStats)
  const completedTotal = useStore(s => s.completedTotal)

  const focusScore = useMemo(() => {
    const sessionScore = Math.min(30, (weeklyStats?.tasksCompleted ?? 0) * 6)
    const consistencyScore = Math.round((weeklyStats?.consistencyScore ?? 0) * 40)
    const taskScore = Math.min(30, completedTotal * 3)
    return Math.min(100, sessionScore + consistencyScore + taskScore)
  }, [weeklyStats, completedTotal])

  const label = focusScore >= 70
    ? t('progress.thriving')
    : focusScore >= 40
    ? t('progress.growing')
    : t('progress.planting')

  const labelBg = focusScore >= 70
    ? 'rgba(78,205,196,0.15)'
    : focusScore >= 40
    ? 'rgba(123,114,255,0.12)'
    : 'rgba(245,158,11,0.10)'

  const labelColor = focusScore >= 70
    ? 'var(--color-teal)'
    : focusScore >= 40
    ? 'var(--color-primary)'
    : 'var(--color-gold)'

  const barGradient = focusScore >= 70
    ? 'linear-gradient(90deg, #4ECDC4, #7B72FF)'
    : 'linear-gradient(90deg, var(--color-primary), var(--color-primary-light))'

  return (
    <motion.div
      initial={shouldAnimate ? { opacity: 0, y: 12 } : false}
      animate={shouldAnimate ? { opacity: 1, y: 0 } : false}
      transition={shouldAnimate ? { delay: 0.13 } : undefined}
      className="rounded-2xl p-3"
      style={{ backgroundColor: 'var(--color-surface-card)' }}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
          {t('progress.focusHealthScore')}
        </p>
        <span
          className="text-[12px] font-semibold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: labelBg, color: labelColor }}
        >
          {label}
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
        <motion.div
          className="h-full rounded-full"
          initial={shouldAnimate ? { width: 0 } : false}
          animate={{ width: `${focusScore}%` }}
          transition={shouldAnimate ? { duration: 0.9, ease: 'easeOut' } : { duration: 0 }}
          style={{ background: barGradient }}
        />
      </div>
      <div className="flex justify-between mt-1.5">
        <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
          {t('progress.scoreComponents')}
        </p>
        <p className="text-[11px] font-medium" style={{ color: 'var(--color-text-primary)' }}>
          {focusScore}/100
        </p>
      </div>
    </motion.div>
  )
}
