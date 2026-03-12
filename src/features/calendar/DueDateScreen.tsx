// ── DueDateScreen ──────────────────────────────────────────────────────────
// List of all tasks with due dates, grouped by section: Today, Tomorrow,
// This Week, Later. Non-shaming, warm colors.

import { useMemo } from 'react'
import { motion } from 'motion/react'
import { useMotion } from '@/shared/hooks/useMotion'
import { useStore } from '@/store'
import type { Task } from '@/types'

// ── Helpers ────────────────────────────────────────────────────────────────

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

// ── Section header ──────────────────────────────────────────────────────────

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

// ── Task row ────────────────────────────────────────────────────────────────

function TaskRow({ task }: { task: Task }) {
  const diffColor =
    task.difficulty === 1 ? '#4ECDC4' :
    task.difficulty === 2 ? '#F59E0B' :
    '#7B72FF'

  return (
    <div
      className="flex items-center gap-3 px-3 py-3 rounded-xl"
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
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────

export default function DueDateScreen() {
  const { nowPool, nextPool, somedayPool } = useStore()
  const { shouldAnimate, t } = useMotion()

  const allTasks = useMemo(
    () => [...nowPool, ...nextPool, ...somedayPool],
    [nowPool, nextPool, somedayPool]
  )

  const grouped = useMemo(() => groupTasksByDueDate(allTasks), [allTasks])
  const hasDueTasks = allTasks.some(t => t.dueDate && t.status === 'active')

  return (
    <motion.div
      initial={shouldAnimate ? { opacity: 0, y: 10 } : {}}
      animate={{ opacity: 1, y: 0 }}
      transition={t()}
      className="flex flex-col pb-[calc(112px+env(safe-area-inset-bottom))]"
    >
      {/* Header */}
      <div className="px-5 pt-10 pb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
          Upcoming
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
          Tasks with due dates
        </p>
      </div>

      {/* Empty state */}
      {!hasDueTasks && (
        <div className="px-5 py-12 flex flex-col items-center gap-3">
          <p className="text-4xl">📅</p>
          <p className="text-base font-medium text-center" style={{ color: 'var(--color-text)' }}>
            No upcoming tasks
          </p>
          <p className="text-sm text-center" style={{ color: 'var(--color-muted)' }}>
            Add a due date when creating a task.
          </p>
        </div>
      )}

      {/* Content */}
      {hasDueTasks && (
        <div className="px-5 flex flex-col gap-5">
          {/* Today */}
          {grouped.today.length > 0 && (
            <div>
              <SectionHeader title="Today" color="#7B72FF" count={grouped.today.length} />
              <div className="flex flex-col gap-2">
                {grouped.today.map(t => <TaskRow key={t.id} task={t} />)}
              </div>
            </div>
          )}

          {/* Tomorrow */}
          {grouped.tomorrow.length > 0 && (
            <div>
              <SectionHeader title="Tomorrow" color="#4ECDC4" count={grouped.tomorrow.length} />
              <div className="flex flex-col gap-2">
                {grouped.tomorrow.map(t => <TaskRow key={t.id} task={t} />)}
              </div>
            </div>
          )}

          {/* This Week */}
          {grouped.thisWeek.length > 0 && (
            <div>
              <SectionHeader title="This Week" color="#E8E8F0" count={grouped.thisWeek.length} />
              <div className="flex flex-col gap-2">
                {grouped.thisWeek.map(t => <TaskRow key={t.id} task={t} />)}
              </div>
            </div>
          )}

          {/* Later */}
          {grouped.later.length > 0 && (
            <div>
              <SectionHeader title="Later" color="#8B8BA7" count={grouped.later.length} />
              <div className="flex flex-col gap-2">
                {grouped.later.map(t => <TaskRow key={t.id} task={t} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}
