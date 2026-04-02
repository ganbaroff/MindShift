import { memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useUITone } from '@/shared/hooks/useUITone'
import TaskCard from '@/components/TaskCard'
import type { Task } from '@/types'

function RecapStat({ emoji, value, label }: { emoji: string; value: string | number; label: string }) {
  return (
    <div className="text-center">
      <p className="text-[14px]">{emoji}</p>
      <p className="text-[18px] font-bold" style={{ color: 'var(--color-text-primary)' }}>{value}</p>
      <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
    </div>
  )
}

interface TodayEveningRecapProps {
  completedToday: Task[]
  tomorrowTasks: Task[]
  activeTasks: Task[]
  todayFocusMin: number
  completedTotal: number
  density: string
  onComplete: (id: string) => void
  onPark: (id: string) => void
}

export const TodayEveningRecap = memo(function TodayEveningRecap({
  completedToday, tomorrowTasks, activeTasks, todayFocusMin,
  completedTotal, density, onComplete, onPark,
}: TodayEveningRecapProps) {
  const { t } = useTranslation()
  const { copy } = useUITone()
  const navigate = useNavigate()

  return (
    <div className="space-y-3">
      <div
        className="rounded-2xl p-4 space-y-3"
        style={{
          background: 'linear-gradient(135deg, rgba(123,114,255,0.08), rgba(78,205,196,0.05))',
          border: '1px solid rgba(123,114,255,0.12)',
        }}
      >
        <h2 className="text-[15px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {t('today.wrapUp')}
        </h2>
        <div className="flex gap-4">
          <RecapStat emoji="✅" value={completedToday.length} label={t('today.done')} />
          <RecapStat emoji="⏱" value={`${todayFocusMin}m`} label={t('today.focused')} />
          {density !== 'compact' && (
            <RecapStat emoji="📊" value={completedTotal} label={t('today.total')} />
          )}
        </div>
        {completedToday.length === 0 && todayFocusMin === 0 && (
          <p className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
            {t('today.quietDay')}
          </p>
        )}
        {completedToday.length > 0 && (
          <p className="text-[12px]" style={{ color: 'var(--color-teal)' }}>
            {copy.mochiGreat}
          </p>
        )}
      </div>

      {/* Tomorrow preview */}
      {tomorrowTasks.length > 0 && (
        <div className="space-y-1.5">
          <h2 className="text-[13px] font-semibold px-1" style={{ color: 'var(--color-text-muted)' }}>
            {t('today.tomorrow')}
          </h2>
          {tomorrowTasks.slice(0, 3).map(task => (
            <TaskCard key={task.id} task={task} onDone={onComplete} onPark={onPark} />
          ))}
          {tomorrowTasks.length > 3 && (
            <button
              onClick={() => navigate('/tasks')}
              className="text-[12px] flex items-center gap-1 px-1 focus-visible:ring-2 focus-visible:ring-[#7B72FF] rounded"
              style={{ color: 'var(--color-primary)' }}
            >
              {t('today.more', { count: tomorrowTasks.length - 3 })} <ChevronRight size={12} />
            </button>
          )}
        </div>
      )}

      {/* Remaining active tasks */}
      {activeTasks.length > 0 && (
        <div className="space-y-1.5">
          <h2 className="text-[13px] font-semibold px-1" style={{ color: 'var(--color-text-muted)' }}>
            {t('today.stillInNow')}
          </h2>
          {activeTasks.slice(0, 2).map(task => (
            <TaskCard key={task.id} task={task} onDone={onComplete} onPark={onPark} />
          ))}
        </div>
      )}
    </div>
  )
})
