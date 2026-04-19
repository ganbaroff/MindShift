import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useMotion } from '@/shared/hooks/useMotion'
import { useStore } from '@/store'
import { formatBurnoutCell } from '@/shared/lib/burnout'

export function StatsGrid() {
  const { shouldAnimate } = useMotion()
  const { t } = useTranslation()
  const achievements = useStore(s => s.achievements)
  const completedTotal = useStore(s => s.completedTotal)
  const burnoutScore = useStore(s => s.burnoutScore)

  const unlockedCount = achievements.filter(a => a.unlockedAt).length

  // Em-dash policy (Design-Atlas REV2, 2026-04-19) — belt-and-suspenders over
  // PR #13's NaN guards: even if a NaN somehow reaches this render layer, we
  // surface it as an honest "data not yet available" cell instead of fabricating
  // "0". Pure logic in formatBurnoutCell, unit-tested.
  const burnout = formatBurnoutCell(burnoutScore)

  const stats: Array<{ value: string; emoji: string; label: string; a11y?: string }> = [
    { value: String(unlockedCount), emoji: '🏆', label: t('progress.achievements') },
    { value: String(completedTotal), emoji: '✅', label: t('progress.tasksDone') },
    { value: burnout.value, emoji: '🧠', label: t('progress.burnoutScoreLabel'), a11y: t(burnout.a11yKey) },
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
          aria-label={s.a11y}
        >
          <span className="text-[18px] font-bold" style={{ color: 'var(--color-text-primary)' }}>{s.value}</span>
          <span className="text-[14px]">{s.emoji}</span>
          <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{s.label}</span>
        </motion.div>
      ))}
    </div>
  )
}
