import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useMotion } from '@/shared/hooks/useMotion'
import { useStore } from '@/store'

export function StatsGrid() {
  const { shouldAnimate } = useMotion()
  const { t } = useTranslation()
  const achievements = useStore(s => s.achievements)
  const completedTotal = useStore(s => s.completedTotal)
  const burnoutScore = useStore(s => s.burnoutScore)

  const unlockedCount = achievements.filter(a => a.unlockedAt).length

  const stats = [
    { value: String(unlockedCount), emoji: '🏆', label: t('progress.achievements') },
    { value: String(completedTotal), emoji: '✅', label: t('progress.tasksDone') },
    { value: String(burnoutScore), emoji: '🧠', label: t('progress.burnoutScoreLabel') },
  ]

  return (
    <div className="grid grid-cols-3 gap-2">
      {stats.map((s, i) => (
        <motion.div
          key={i}
          initial={shouldAnimate ? { opacity: 0, y: 12 } : false}
          animate={shouldAnimate ? { opacity: 1, y: 0 } : false}
          transition={shouldAnimate ? { delay: 0.1 + i * 0.03 } : undefined}
          className="rounded-2xl p-2.5 flex flex-col items-center"
          style={{ backgroundColor: 'var(--color-surface-card)' }}
        >
          <span className="text-[18px] font-bold" style={{ color: 'var(--color-text-primary)' }}>{s.value}</span>
          <span className="text-[14px]">{s.emoji}</span>
          <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{s.label}</span>
        </motion.div>
      ))}
    </div>
  )
}
