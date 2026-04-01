import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useMotion } from '@/shared/hooks/useMotion'
import { useStore } from '@/store'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

interface WeeklyActivityChartProps {
  loading: boolean
}

export function WeeklyActivityChart({ loading }: WeeklyActivityChartProps) {
  const { shouldAnimate } = useMotion()
  const { t } = useTranslation()
  const weeklyStats = useStore(s => s.weeklyStats)

  const weekData = DAY_LABELS.map((day, i) => ({
    day,
    mins: weeklyStats?.dailyMinutes?.[i] ?? 0,
  }))

  const maxMins = Math.max(...weekData.map(d => d.mins), 1)

  return (
    <motion.div
      initial={shouldAnimate ? { opacity: 0, y: 12 } : false}
      animate={shouldAnimate ? { opacity: 1, y: 0 } : false}
      transition={shouldAnimate ? { delay: 0.05 } : undefined}
      className="rounded-2xl p-3"
      style={{ backgroundColor: 'var(--color-surface-card)' }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
          {t('progress.thisWeek')}
        </span>
        <span className="text-[13px]" style={{ color: 'var(--color-text-primary)' }}>
          {loading ? t('progress.loading') : t('progress.greatWeek')}
        </span>
      </div>
      <div className="flex items-end justify-between h-20 gap-1.5">
        {weekData.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
            <motion.div
              initial={shouldAnimate ? { height: 0 } : false}
              animate={shouldAnimate
                ? { height: `${Math.max((d.mins / maxMins) * 100, 4)}%` }
                : { height: `${Math.max((d.mins / maxMins) * 100, 4)}%` }}
              transition={shouldAnimate ? { delay: 0.1 + i * 0.05, duration: 0.4 } : { duration: 0 }}
              className="w-full rounded-t gradient-primary-teal"
              style={{ minHeight: d.mins > 0 ? 4 : 2 }}
            />
            <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{d.day}</span>
          </div>
        ))}
      </div>
      <p className="text-[11px] mt-1.5 text-center" style={{ color: 'var(--color-text-muted)' }}>
        {weeklyStats
          ? t('progress.focusThisWeek', { min: weeklyStats.totalFocusMinutes })
          : t('progress.noDataYet')}
      </p>
    </motion.div>
  )
}
