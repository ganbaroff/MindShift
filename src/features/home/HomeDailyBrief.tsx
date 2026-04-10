import React, { useMemo } from 'react'
import { motion } from 'motion/react'
import { useMotion } from '@/shared/hooks/useMotion'
import { useTranslation } from 'react-i18next'
import { BurnoutGauge } from './BurnoutGauge'
import { ENERGY_EMOJI } from '@/shared/lib/constants'
import type { EnergyLevel } from '@/types'

interface HomeDailyBriefProps {
  completedTotal: number
  focusMinutes: number | null
  xpTotal: number
  energyLevel: EnergyLevel
  burnoutScore: number
  isLowEnergy: boolean
  goalReached: boolean
  goalProgress: number
  todayMin: number
  dailyFocusGoalMin: number
  weeklyStats: { dailyMinutes?: number[] } | null
}

const TIER_NAMES = [
  'Seedling', 'Sprout', 'Grower', 'Bloomer', 'Flourisher',
  'Cultivator', 'Nurturer', 'Luminary', 'Pathfinder', 'Sage',
]

export const HomeDailyBrief = React.memo(function HomeDailyBrief({
  completedTotal,
  focusMinutes,
  xpTotal,
  energyLevel,
  burnoutScore,
  isLowEnergy,
  goalReached,
  goalProgress,
  todayMin,
  dailyFocusGoalMin,
  weeklyStats,
}: HomeDailyBriefProps) {
  const { shouldAnimate } = useMotion()
  const { t } = useTranslation()

  const xpLevel = Math.min(Math.floor((xpTotal ?? 0) / 1000), TIER_NAMES.length - 1)
  const tierName = TIER_NAMES[xpLevel]

  const bentoCards = useMemo(() => [
    {
      content: (
        <>
          <span className="text-[20px] font-bold" style={{ color: 'var(--color-text-primary)' }}>{completedTotal ?? 0}</span>
          <span className="text-[11px] ml-1" style={{ color: 'var(--color-text-muted)' }}>{t('home.doneSub')}</span>
          {focusMinutes !== null && (
            <>
              <span className="text-[11px] mx-1" style={{ color: 'var(--color-text-muted)' }}>·</span>
              <span className="text-[20px] font-bold" style={{ color: 'var(--color-text-primary)' }}>{(focusMinutes / 60).toFixed(1)}h</span>
            </>
          )}
        </>
      ),
      sub: `Level ${xpLevel} · ${tierName}`,
    },
    {
      content: <span className="text-[28px]">{ENERGY_EMOJI[energyLevel - 1]}</span>,
      sub: t('home.tapToUpdate'),
    },
    {
      content: <span className="text-[20px] font-bold" style={{ color: 'var(--color-text-primary)' }}>✅ {completedTotal}</span>,
      sub: t('home.tasksCompleted'),
    },
    {
      content: <BurnoutGauge score={isNaN(burnoutScore) ? 0 : (burnoutScore ?? 0)} />,
      sub: t('home.burnoutGauge'),
    },
  ], [completedTotal, focusMinutes, xpLevel, tierName, energyLevel, burnoutScore, t])

  return (
    <>
      {/* Daily focus goal progress */}
      {weeklyStats && (
        <motion.div
          initial={shouldAnimate ? { opacity: 0, y: 8 } : false}
          animate={shouldAnimate ? { opacity: 1, y: 0 } : false}
          className="rounded-2xl px-4 py-3"
          style={{ backgroundColor: 'var(--color-surface-card)' }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-semibold" style={{ color: goalReached ? 'var(--color-teal)' : 'var(--color-text-primary)' }}>
              {goalReached ? `🎯 ${t('home.goalReached')}` : `🎯 ${t('home.todaysFocus')}`}
            </span>
            <span className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
              {todayMin} / {dailyFocusGoalMin} min
            </span>
          </div>
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
            role="progressbar"
            aria-valuenow={Math.round(goalProgress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t('home.todaysFocus')}
          >
            <motion.div
              className="h-full rounded-full"
              initial={shouldAnimate ? { width: 0 } : false}
              animate={{ width: `${goalProgress * 100}%` }}
              transition={shouldAnimate ? { duration: 0.8, ease: 'easeOut' } : { duration: 0 }}
              style={{ background: goalReached ? 'var(--color-teal)' : 'linear-gradient(90deg, var(--color-primary), var(--color-primary-light, #9B8EFF))' }}
            />
          </div>
        </motion.div>
      )}

      {/* Bento Grid — hidden in low-energy mode */}
      {!isLowEnergy && (
        <div className="grid grid-cols-2 gap-2">
          {bentoCards.map((card, i) => (
            <motion.div
              key={i}
              initial={shouldAnimate ? { opacity: 0, y: 12 } : false}
              animate={shouldAnimate ? { opacity: 1, y: 0 } : false}
              transition={shouldAnimate ? { delay: 0.2 + i * 0.05 } : undefined}
              className="rounded-2xl p-3 flex flex-col items-center justify-center min-h-[80px]"
              style={{ backgroundColor: 'var(--color-surface-card)' }}
            >
              <div className="flex items-baseline">{card.content}</div>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{card.sub}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Low-energy gentle card */}
      {isLowEnergy && (
        <motion.div
          initial={shouldAnimate ? { opacity: 0, y: 12 } : false}
          animate={shouldAnimate ? { opacity: 1, y: 0 } : false}
          className="rounded-2xl p-4"
          style={{ backgroundColor: 'var(--color-surface-card)' }}
        >
          <div className="flex items-center gap-3">
            <span className="text-[32px]">{ENERGY_EMOJI[energyLevel - 1]}</span>
            <div>
              <p className="text-[15px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                Level {xpLevel} · {tierName} · {completedTotal ?? 0} done
              </p>
              <p className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
                {burnoutScore > 60 ? t('home.hardWork') : t('home.easyDoesIt')}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </>
  )
})
