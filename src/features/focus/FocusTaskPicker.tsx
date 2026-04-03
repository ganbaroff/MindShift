/**
 * FocusTaskPicker — Task list / empty-state CTA
 *
 * Extracted from FocusSetup.tsx (Sprint BC+1 decomposition).
 * Shows either an empty-state card with a link to /tasks,
 * or a list of up to 5 NOW/NEXT tasks to pick from.
 */

import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { Task } from '@/types'

// ── Props ─────────────────────────────────────────────────────────────────────

export interface FocusTaskPickerProps {
  allTasks: Task[]
  selectedTask: Task | null
  setSelectedTask: (t: Task | null) => void
}

export function FocusTaskPicker({
  allTasks,
  selectedTask,
  setSelectedTask,
}: FocusTaskPickerProps) {
  const { t } = useTranslation()

  if (allTasks.length === 0) {
    return (
      <div
        className="mx-5 mb-6 p-6 rounded-2xl flex flex-col items-center text-center"
        style={{ background: 'var(--color-card)', border: '1px solid var(--color-border-subtle)' }}
      >
        <span style={{ fontSize: 40 }} className="mb-3">🎯</span>
        <p className="text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
          {t('focus.noTasksYet')}
        </p>
        <p className="text-xs mb-4 leading-relaxed" style={{ color: 'var(--color-muted)' }}>
          {t('focus.pickATask')}
        </p>
        <Link
          to="/tasks"
          className="px-5 py-2.5 rounded-xl text-xs font-semibold transition-all focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:outline-none"
          style={{
            background: 'var(--color-primary-alpha)',
            border: '1.5px solid var(--color-primary)',
            color: 'var(--color-primary)',
          }}
        >
          {t('focus.goToTasks')}
        </Link>
      </div>
    )
  }

  return (
    <div className="px-5 mb-6">
      <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-muted)' }}>
        {t('focus.taskOptional')}
      </p>
      <div className="flex flex-col gap-2">
        {/* "Open focus" — no task */}
        <button
          onClick={() => setSelectedTask(null)}
          aria-pressed={selectedTask === null}
          aria-label="Open focus — no specific task"
          className="flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:outline-none"
          style={{
            background: selectedTask === null ? 'var(--color-primary-alpha)' : 'var(--color-card)',
            border: `1.5px solid ${selectedTask === null ? 'var(--color-primary)' : 'var(--color-border-subtle)'}`,
          }}
        >
          <span>🧠</span>
          <span
            className="text-sm"
            style={{ color: selectedTask === null ? 'var(--color-primary)' : 'var(--color-text)' }}
          >
            {t('focus.openFocus')}
          </span>
        </button>

        {/* Task rows — first 5 */}
        {allTasks.slice(0, 5).map(task => {
          const isSelected = selectedTask?.id === task.id
          return (
            <button
              key={task.id}
              onClick={() => setSelectedTask(task)}
              aria-pressed={isSelected}
              aria-label={`Focus on: ${task.title}`}
              className="flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:outline-none"
              style={{
                background: isSelected ? 'var(--color-primary-alpha)' : 'var(--color-card)',
                border: `1.5px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border-subtle)'}`,
              }}
            >
              <span
                className="text-xs px-1.5 py-0.5 rounded-md font-medium"
                style={{ background: 'var(--color-elevated)', color: 'var(--color-muted)' }}
              >
                {task.pool === 'now' ? t('tasks.now') : t('tasks.next')}
              </span>
              <span
                className="text-sm flex-1"
                style={{ color: isSelected ? 'var(--color-primary)' : 'var(--color-text)' }}
              >
                {task.title}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
