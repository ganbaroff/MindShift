/**
 * MonthlyWrappedStep — "Your Wrapped" stats grid + share button.
 *
 * Step 0 of MonthlyReflection. Extracted to keep parent under 400 lines.
 */

import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import type { Achievement } from '@/types'
import type { MotionAPI } from '@/shared/hooks/useMotion'

interface MonthlyWrappedStepProps {
  prevMonthName: string
  xpTotal: number
  completedTotal: number
  currentStreak: number
  longestStreak: number
  unlockedBadges: Achievement[]
  topBadge: Achievement | null
  motionTransition: MotionAPI['t']
  onShare: () => void
  onContinue: () => void
}

export function MonthlyWrappedStep({
  prevMonthName, xpTotal, completedTotal, currentStreak, longestStreak,
  unlockedBadges, topBadge, motionTransition, onShare, onContinue,
}: MonthlyWrappedStepProps) {
  const { t } = useTranslation()

  return (
    <motion.div
      key="wrapped"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ ...motionTransition('expressive'), duration: 0.4 }}
      className="flex flex-col gap-6"
    >
      <div className="text-center">
        <p className="text-4xl mb-3">✨</p>
        <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {t('monthly.yourWrapped', { month: prevMonthName })}
        </h2>
        <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>
          {t('monthly.whatYouBuilt')}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div
          className="flex flex-col items-center p-3 rounded-2xl"
          style={{ background: 'var(--color-surface-card)', border: '1px solid rgba(123,114,255,0.12)' }}
        >
          <span className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>{xpTotal}</span>
          <span className="text-[11px] mt-0.5 text-center" style={{ color: 'var(--color-text-muted)' }}>{t('monthly.totalXp')}</span>
        </div>
        <div
          className="flex flex-col items-center p-3 rounded-2xl"
          style={{ background: 'var(--color-surface-card)', border: '1px solid rgba(78,205,196,0.12)' }}
        >
          <span className="text-2xl font-bold" style={{ color: 'var(--color-teal)' }}>{completedTotal}</span>
          <span className="text-[11px] mt-0.5 text-center" style={{ color: 'var(--color-text-muted)' }}>{t('monthly.tasksDone')}</span>
        </div>
        <div
          className="flex flex-col items-center p-3 rounded-2xl"
          style={{ background: 'var(--color-surface-card)', border: '1px solid rgba(78,205,196,0.12)' }}
        >
          <span className="text-2xl font-bold" style={{ color: 'var(--color-teal)' }}>{Math.max(currentStreak, longestStreak)}</span>
          <span className="text-[11px] mt-0.5 text-center" style={{ color: 'var(--color-text-muted)' }}>{t('monthly.bestStreak')} 🔥</span>
        </div>
        <div
          className="flex flex-col items-center p-3 rounded-2xl"
          style={{ background: 'var(--color-surface-card)', border: '1px solid rgba(123,114,255,0.12)' }}
        >
          <span className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>{unlockedBadges.length}</span>
          <span className="text-[11px] mt-0.5 text-center" style={{ color: 'var(--color-text-muted)' }}>{t('monthly.badgesEarned')}</span>
        </div>
      </div>

      {topBadge && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-2xl"
          style={{ background: 'rgba(123,114,255,0.08)', border: '1px solid rgba(123,114,255,0.15)' }}
        >
          <span className="text-2xl">{topBadge.emoji}</span>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{topBadge.name}</p>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{t('monthly.latestBadge')}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <button
          onClick={onShare}
          className="w-full py-4 rounded-2xl font-semibold text-base"
          style={{ background: 'var(--color-primary)', color: '#FFFFFF' }}
          aria-label="Share monthly wrapped"
        >
          {t('monthly.shareWrapped')} ✨
        </button>
        <button
          onClick={onContinue}
          className="w-full py-3 text-sm"
          style={{ color: 'var(--color-text-muted)' }}
          aria-label="Continue to recap"
        >
          {t('monthly.continue')}
        </button>
      </div>
    </motion.div>
  )
}
