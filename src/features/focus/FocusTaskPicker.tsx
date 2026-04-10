/**
 * FocusTaskPicker — Task list / empty-state CTA
 *
 * Extracted from FocusSetup.tsx (Sprint BC+1 decomposition).
 * Shows either an empty-state card with a link to /tasks,
 * or a list of up to 5 NOW/NEXT tasks to pick from.
 *
 * Smart suggestion: marks one task with ✨ based on time-of-day
 * and energy level to reduce decision paralysis (ADHD #1 barrier).
 */

import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useStore } from '@/store'
import type { Task } from '@/types'
import { todayISO } from '@/shared/lib/dateUtils'

// -- Smart suggestion ----------------------------------------------------------
// Scores tasks to suggest the best one for right now.
// Factors: due urgency, pool priority, difficulty vs time-of-day, difficulty vs energy.
// Returns the id of the suggested task or null if there's nothing useful.

function getSuggestedTaskId(
  tasks: Task[],
  energyLevel: number,
): string | null {
  if (tasks.length === 0) return null
  if (tasks.length === 1) return tasks[0].id

  const today = todayISO()
  const hour = new Date().getHours()

  // Time-of-day → preferred difficulty (1=easy, 2=medium, 3=hard)
  // Morning (6–11): peak focus → prefer hard
  // Afternoon (12–17): mid range → prefer medium
  // Evening (18+): winding down → prefer easy
  const timePref: number =
    hour >= 6 && hour < 12 ? 3 :
    hour >= 12 && hour < 18 ? 2 : 1

  // Energy → difficulty cap (low energy shouldn't pick hard tasks)
  const energyDiffCap: number =
    energyLevel >= 4 ? 3 :
    energyLevel >= 3 ? 2 : 1

  const effectivePref = Math.min(timePref, energyDiffCap)

  function score(task: Task): number {
    let s = 0
    // NOW pool strongly preferred
    if (task.pool === 'now') s += 10
    // Overdue or due today: highest urgency
    if (task.dueDate && task.dueDate <= today) s += 8
    // Difficulty match to effective preference
    const diff = task.difficulty ?? 2
    const diffDelta = Math.abs(diff - effectivePref)
    s += (3 - diffDelta) * 2   // 0 delta = +6, 1 = +4, 2 = +2
    return s
  }

  const sorted = [...tasks].sort((a, b) => score(b) - score(a))
  return sorted[0].id
}

// -- Props ---------------------------------------------------------------------

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
  const energyLevel = useStore(s => s.energyLevel)

  const suggestedId = useMemo(
    () => getSuggestedTaskId(allTasks, energyLevel),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allTasks.length, energyLevel],
  )

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
          const isSuggested = task.id === suggestedId
          return (
            <button
              key={task.id}
              onClick={() => setSelectedTask(task)}
              aria-pressed={isSelected}
              aria-label={`Focus on: ${task.title}${isSuggested ? ' (suggested)' : ''}`}
              className="flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:outline-none"
              style={{
                background: isSelected ? 'var(--color-primary-alpha)' : 'var(--color-card)',
                border: `1.5px solid ${isSelected ? 'var(--color-primary)' : isSuggested ? 'rgba(78,205,196,0.35)' : 'var(--color-border-subtle)'}`,
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
              {/* Smart suggestion chip — visible only when not yet selected */}
              {isSuggested && !isSelected && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-md font-medium flex-shrink-0"
                  style={{ background: 'rgba(78,205,196,0.12)', color: 'var(--color-teal)' }}
                  aria-hidden="true"
                >
                  ✨
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
