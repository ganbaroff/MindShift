import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useMotion } from '@/shared/hooks/useMotion'
import TaskCard from '@/components/TaskCard'
import type { Task } from '@/types'

interface StatPillProps { label: string; value: string | number; color: string }
function StatPill({ label, value, color }: StatPillProps) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[15px] font-bold" style={{ color }}>{value}</span>
      <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
    </div>
  )
}

interface TodayMorningPlanProps {
  todayTasks: Task[]
  activeTasks: Task[]
  completedToday: Task[]
  todayFocusMin: number
  dailyFocusGoalMin: number
  isLowEnergy: boolean
  density: string
  completedTotal: number
  onComplete: (id: string) => void
  onPark: (id: string) => void
  onAddSample: () => void
  onShowAddTask?: () => void
}

export function TodayMorningPlan({
  todayTasks, activeTasks, completedToday, todayFocusMin, dailyFocusGoalMin,
  isLowEnergy, density, completedTotal,
  onComplete, onPark, onAddSample,
}: TodayMorningPlanProps) {
  const { t } = useTranslation()
  const { shouldAnimate } = useMotion()

  return (
    <div className="space-y-3">
      {/* Summary strip */}
      <div
        className="flex items-center justify-between px-3 py-2.5 rounded-xl"
        style={{ background: 'var(--color-surface-card)' }}
      >
        <div className="flex items-center gap-3">
          <StatPill label={t('today.tasks')} value={todayTasks.length} color="var(--color-teal)" />
          <StatPill label={t('today.focus')} value={`${todayFocusMin}m`} color="var(--color-primary)" />
          {completedToday.length > 0 && (
            <StatPill label={t('today.done')} value={completedToday.length} color="var(--color-gold)" />
          )}
        </div>
        {dailyFocusGoalMin > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-surface-raised)' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: todayFocusMin >= dailyFocusGoalMin ? 'var(--color-teal)' : 'var(--color-primary)' }}
                initial={false}
                animate={{ width: `${Math.min(100, (todayFocusMin / dailyFocusGoalMin) * 100)}%` }}
                transition={shouldAnimate ? { type: 'spring', damping: 20 } : { duration: 0 }}
              />
            </div>
            <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
              {todayFocusMin}/{dailyFocusGoalMin}m
            </span>
          </div>
        )}
      </div>

      {/* Today's tasks */}
      {todayTasks.length > 0 ? (
        <div className="space-y-1.5">
          <h2 className="text-[13px] font-semibold px-1" style={{ color: 'var(--color-text-muted)' }}>
            {t('today.todayLabel')}
          </h2>
          {(isLowEnergy ? todayTasks.slice(0, 2) : todayTasks).map(task => (
            <TaskCard key={task.id} task={task} onDone={onComplete} onPark={onPark} />
          ))}
          {isLowEnergy && todayTasks.length > 2 && (
            <p className="text-[11px] px-1" style={{ color: 'var(--color-text-muted)' }}>
              {t('today.moreFirst', { count: todayTasks.length - 2 })}
            </p>
          )}
        </div>
      ) : activeTasks.length === 0 ? (
        <div
          className="text-center py-6 rounded-2xl space-y-3"
          style={{ background: 'rgba(78,205,196,0.05)' }}
        >
          <p className="text-[28px] mb-1">🌿</p>
          <p className="text-[14px] font-medium" style={{ color: 'var(--color-text-primary)' }}>
            {t('today.clearDay')}
          </p>
          <p className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
            {t('today.addOrSample')}
          </p>
          {completedTotal === 0 && (
            <button
              onClick={onAddSample}
              className="mx-auto px-4 py-2 rounded-xl text-[13px] font-medium focus-visible:ring-2 focus-visible:ring-[#7B72FF]"
              style={{
                background: 'rgba(123,114,255,0.12)',
                color: 'var(--color-primary)',
                border: '1px solid rgba(123,114,255,0.2)',
              }}
            >
              {t('today.addSample')}
            </button>
          )}
        </div>
      ) : null}

      {/* NOW pool tasks (not date-specific) */}
      {activeTasks.length > 0 && todayTasks.length === 0 && (
        <div className="space-y-1.5">
          <h2 className="text-[13px] font-semibold px-1" style={{ color: 'var(--color-text-muted)' }}>
            {t('today.nowPool')}
          </h2>
          {activeTasks.slice(0, isLowEnergy ? 1 : density === 'compact' ? 2 : 3).map(task => (
            <TaskCard key={task.id} task={task} onDone={onComplete} onPark={onPark} />
          ))}
        </div>
      )}
    </div>
  )
}
