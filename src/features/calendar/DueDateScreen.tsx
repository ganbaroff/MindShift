// -- DueDateScreen ----------------------------------------------------------
// List of all tasks with due dates, grouped by section: Today, Tomorrow,
// This Week, Later. Non-shaming, warm colors. Task rows are tappable.

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useMotion } from '@/shared/hooks/useMotion'
import { useStore } from '@/store'
import { toast } from 'sonner'
import type { Task } from '@/types'
import { DIFFICULTY_MAP } from '@/types'

// -- Helpers ----------------------------------------------------------------

function groupTasksByDueDate(tasks: Task[]): {
  today: Task[]
  tomorrow: Task[]
  thisWeek: Task[]
  later: Task[]
} {
  const now   = new Date(); now.setHours(0,0,0,0)
  const tom   = new Date(now); tom.setDate(now.getDate() + 1)
  const week  = new Date(now); week.setDate(now.getDate() + 7)
  const hasDue = tasks.filter(t => t.dueDate && t.status === 'active')

  return {
    today:    hasDue.filter(t => { const d = new Date(t.dueDate!); return d.getTime() === now.getTime() }),
    tomorrow: hasDue.filter(t => { const d = new Date(t.dueDate!); return d.getTime() === tom.getTime() }),
    thisWeek: hasDue.filter(t => { const d = new Date(t.dueDate!); return d > tom && d <= week }),
    later:    hasDue.filter(t => new Date(t.dueDate!) > week),
  }
}

function formatDueDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// -- Section header ----------------------------------------------------------

function SectionHeader({ title, color, count }: { title: string; color: string; count: number }) {
  if (count === 0) return null
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="text-xs font-semibold tracking-wide uppercase" style={{ color }}>
        {title}
      </span>
      <span
        className="text-xs px-1.5 py-0.5 rounded-md font-medium"
        style={{ background: `${color}20`, color }}
      >
        {count}
      </span>
    </div>
  )
}

// -- Reschedule sheet ---------------------------------------------------------

interface RescheduleSheetProps {
  task: Task
  onClose: () => void
  onNavigate: () => void
}

function RescheduleSheet({ task, onClose, onNavigate }: RescheduleSheetProps) {
  const { setTaskDueDate } = useStore()
  const { t } = useTranslation()
  const [newDate, setNewDate] = useState(task.dueDate ?? '')
  const diffColor = DIFFICULTY_MAP[task.difficulty]?.color ?? '#7B72FF'

  const handleReschedule = () => {
    if (!newDate) return
    setTaskDueDate(task.id, newDate, task.dueTime)
    toast(t('calendar.dateUpdated'))
    onClose()
  }

  const handleClearDate = () => {
    setTaskDueDate(task.id, null, null)
    toast(t('calendar.dateRemoved'))
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.55)' }}
        onClick={onClose}
      />
      {/* Sheet */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-50 rounded-t-3xl p-5 pb-[calc(20px+env(safe-area-inset-bottom))]"
        style={{ background: 'var(--color-card)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {/* Drag handle */}
        <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: 'rgba(255,255,255,0.15)' }} />

        {/* Task title */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-5 rounded-full shrink-0" style={{ background: diffColor }} />
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>
            {task.title}
          </p>
        </div>

        {/* Reschedule date input */}
        <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>
          {t('calendar.rescheduleTo')}
        </label>
        <input
          type="date"
          value={newDate}
          onChange={(e) => setNewDate(e.target.value)}
          className="w-full rounded-xl px-3 py-2.5 text-sm outline-none mb-3"
          style={{
            background: 'var(--color-elevated)',
            border: '1.5px solid var(--color-border-subtle)',
            color: 'var(--color-text)',
            colorScheme: 'dark',
          }}
        />

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            onClick={handleReschedule}
            disabled={!newDate || newDate === task.dueDate}
            className="w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200 min-h-[44px]"
            style={{
              background: newDate && newDate !== task.dueDate ? 'var(--color-primary-alpha)' : 'var(--color-elevated)',
              border: `1.5px solid ${newDate && newDate !== task.dueDate ? 'var(--color-primary)' : 'var(--color-border-subtle)'}`,
              color: newDate && newDate !== task.dueDate ? 'var(--color-primary)' : 'var(--color-muted)',
            }}
          >
            {t('calendar.saveNewDate')}
          </button>
          <button
            onClick={onNavigate}
            className="w-full py-3 rounded-xl text-sm font-medium transition-all duration-200 min-h-[44px]"
            style={{
              background: 'var(--color-elevated)',
              border: '1px solid var(--color-border-subtle)',
              color: 'var(--color-text)',
            }}
          >
            {t('calendar.goToTask')}
          </button>
          <button
            onClick={handleClearDate}
            className="w-full py-2 text-xs transition-all duration-200"
            style={{ color: 'var(--color-muted)' }}
          >
            {t('calendar.removeDueDate')}
          </button>
        </div>
      </motion.div>
    </>
  )
}

// -- Task row ----------------------------------------------------------------

function TaskRow({ task, onTap }: { task: Task; onTap: (t: Task) => void }) {
  const diffColor = DIFFICULTY_MAP[task.difficulty]?.color ?? '#7B72FF'

  return (
    <button
      onClick={() => onTap(task)}
      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all duration-150 active:opacity-80"
      style={{ background: 'var(--color-card)', border: '1px solid rgba(255,255,255,0.04)' }}
    >
      <div
        className="w-1 self-stretch rounded-full shrink-0"
        style={{ background: diffColor }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
          {task.title}
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
          {formatDueDate(task.dueDate!)} · ~{task.estimatedMinutes}m
        </p>
      </div>
      <span className="text-xs shrink-0" style={{ color: 'var(--color-muted)' }}>›</span>
    </button>
  )
}

// -- Main component ----------------------------------------------------------

export default function DueDateScreen() {
  const { nowPool, nextPool, somedayPool } = useStore()
  const { shouldAnimate, t: transition } = useMotion()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  const allTasks = useMemo(
    () => [...nowPool, ...nextPool, ...somedayPool],
    [nowPool, nextPool, somedayPool]
  )

  const grouped = useMemo(() => groupTasksByDueDate(allTasks), [allTasks])
  const hasDueTasks = allTasks.some(task => task.dueDate && task.status === 'active')

  return (
    <>
      <motion.div
        initial={shouldAnimate ? { opacity: 0, y: 10 } : {}}
        animate={{ opacity: 1, y: 0 }}
        transition={transition()}
        className="flex flex-col pb-[calc(112px+env(safe-area-inset-bottom))]"
      >
        {/* Header */}
        <div className="px-5 pt-10 pb-6">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
            {t('calendar.upcoming')}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
            {t('calendar.tapToReschedule')}
          </p>
        </div>

        {/* Empty state */}
        {!hasDueTasks && (
          <div className="px-5 py-12 flex flex-col items-center gap-3">
            <p className="text-4xl">📅</p>
            <p className="text-base font-medium text-center" style={{ color: 'var(--color-text)' }}>
              {t('calendar.noUpcoming')}
            </p>
            <p className="text-sm text-center" style={{ color: 'var(--color-muted)' }}>
              {t('calendar.addDueDate')}
            </p>
          </div>
        )}

        {/* Content */}
        {hasDueTasks && (
          <div className="px-5 flex flex-col gap-5">
            {grouped.today.length > 0 && (
              <div>
                <SectionHeader title={t('calendar.today')} color="#7B72FF" count={grouped.today.length} />
                <div className="flex flex-col gap-2">
                  {grouped.today.map(task => <TaskRow key={task.id} task={task} onTap={setSelectedTask} />)}
                </div>
              </div>
            )}

            {grouped.tomorrow.length > 0 && (
              <div>
                <SectionHeader title={t('calendar.tomorrow')} color="#4ECDC4" count={grouped.tomorrow.length} />
                <div className="flex flex-col gap-2">
                  {grouped.tomorrow.map(task => <TaskRow key={task.id} task={task} onTap={setSelectedTask} />)}
                </div>
              </div>
            )}

            {grouped.thisWeek.length > 0 && (
              <div>
                <SectionHeader title={t('calendar.thisWeek')} color="#E8E8F0" count={grouped.thisWeek.length} />
                <div className="flex flex-col gap-2">
                  {grouped.thisWeek.map(task => <TaskRow key={task.id} task={task} onTap={setSelectedTask} />)}
                </div>
              </div>
            )}

            {grouped.later.length > 0 && (
              <div>
                <SectionHeader title={t('calendar.later')} color="#8B8BA7" count={grouped.later.length} />
                <div className="flex flex-col gap-2">
                  {grouped.later.map(task => <TaskRow key={task.id} task={task} onTap={setSelectedTask} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Reschedule bottom sheet */}
      <AnimatePresence>
        {selectedTask && (
          <RescheduleSheet
            task={selectedTask}
            onClose={() => setSelectedTask(null)}
            onNavigate={() => { setSelectedTask(null); navigate('/tasks') }}
          />
        )}
      </AnimatePresence>
    </>
  )
}
