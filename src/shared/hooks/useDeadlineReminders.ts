/**
 * useDeadlineReminders — Gentle deadline reminder system
 *
 * Periodically scans active tasks (NOW + NEXT pools) for upcoming deadlines
 * and shows warm, ADHD-friendly, tone-aware reminders via sonner toasts.
 *
 * Triggers:
 *   - 1 hour before due: gentle nudge
 *   - 30 min before due (meetings only): extra heads-up
 *   - 15 min before due: slightly more direct
 *   - Overdue (missed): warm, non-shaming nudge on next check
 *
 * Rules:
 *   - Never uses urgency language ("hurry", "urgent", "running out", etc.)
 *   - Never shames ("You missed", "You forgot", "Still haven't done")
 *   - Tracks shown reminders in a session-only Set (no duplicate toasts)
 *   - Fires browser push notification when app is backgrounded
 *   - All copy comes from i18n locale files
 */

import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useStore } from '@/store'
import type { Task, TaskType } from '@/types'

// ── Constants ──────────────────────────────────────────────────────────────────

const CHECK_INTERVAL_MS = 15 * 60 * 1000 // 15 minutes
const INITIAL_DELAY_MS = 5_000            // 5s after mount (let app settle)

// Reminder windows in minutes before due time
const WINDOW_1H = 60
const WINDOW_30M = 30
const WINDOW_15M = 15

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Build a due timestamp from task's dueDate + optional dueTime. */
function getDueTimestamp(task: Task): number | null {
  if (!task.dueDate) return null
  const timeStr = task.dueTime ?? '09:00'
  const ts = new Date(`${task.dueDate}T${timeStr}:00`).getTime()
  return Number.isNaN(ts) ? null : ts
}

/** Unique key for deduplication: taskId + window name. */
function reminderKey(taskId: string, window: string): string {
  return `${taskId}:${window}`
}

/** Try to show a browser push notification (non-blocking). */
function pushDeadlineNotify(message: string, taskId: string, tag: string): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  try {
    const show = (title: string, options: NotificationOptions) => {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification(title, { icon: '/icons/icon-192.png', ...options })
        }).catch(() => {
          new Notification(title, { icon: '/icons/icon-192.png', ...options })
        })
      } else {
        new Notification(title, { icon: '/icons/icon-192.png', ...options })
      }
    }
    show(message, {
      tag: `deadline-${tag}-${taskId}`,
      silent: false,
    })
  } catch { /* non-critical */ }
}

/** Check if a task is a meeting type. */
function isMeeting(taskType: TaskType): boolean {
  return taskType === 'meeting'
}

// ── Types ─────────────────────────────────────────────────────────────────────

type TFn = (key: string, opts?: Record<string, string>) => string

// ── Core check logic ───────────────────────────────────────────────────────────

function checkDeadlines(
  tasks: Task[],
  t: TFn,
  shownSet: Set<string>,
): void {
  const now = Date.now()

  for (const task of tasks) {
    if (task.status !== 'active') continue

    const dueTs = getDueTimestamp(task)
    if (dueTs === null) continue

    const minutesUntilDue = (dueTs - now) / 60_000
    const meeting = isMeeting(task.taskType)

    // ── Overdue (missed deadline) ──────────────────────────────────────────
    if (minutesUntilDue < -1) {
      const key = reminderKey(task.id, 'overdue')
      if (!shownSet.has(key)) {
        shownSet.add(key)
        const message = t('reminders.overdue', { title: task.title })
        toast(message, {
          duration: 10_000,
          action: {
            label: t('reminders.viewTasks'),
            onClick: () => { window.location.hash = '' ; window.location.pathname = '/tasks' },
          },
        })
        pushDeadlineNotify(message, task.id, 'overdue')
      }
      continue
    }

    // ── 15 minutes before ──────────────────────────────────────────────────
    if (minutesUntilDue <= WINDOW_15M && minutesUntilDue > 0) {
      const key = reminderKey(task.id, '15m')
      if (!shownSet.has(key)) {
        shownSet.add(key)
        const message = meeting
          ? t('reminders.meetingFifteen', { title: task.title })
          : t('reminders.fifteenMin', { title: task.title })
        toast(message, {
          duration: 8000,
          action: {
            label: t('reminders.startFocus'),
            onClick: () => { window.location.hash = '' ; window.location.pathname = '/focus' },
          },
        })
        pushDeadlineNotify(message, task.id, '15m')
      }
      continue
    }

    // ── 30 minutes before (meetings only) ──────────────────────────────────
    if (meeting && minutesUntilDue <= WINDOW_30M && minutesUntilDue > WINDOW_15M) {
      const key = reminderKey(task.id, '30m')
      if (!shownSet.has(key)) {
        shownSet.add(key)
        const message = t('reminders.meetingThirty', { title: task.title })
        toast(message, {
          duration: 8000,
          action: {
            label: t('reminders.startFocus'),
            onClick: () => { window.location.hash = '' ; window.location.pathname = '/focus' },
          },
        })
        pushDeadlineNotify(message, task.id, '30m')
      }
      continue
    }

    // ── 1 hour before ──────────────────────────────────────────────────────
    if (minutesUntilDue <= WINDOW_1H && minutesUntilDue > WINDOW_30M) {
      const key = reminderKey(task.id, '1h')
      if (!shownSet.has(key)) {
        shownSet.add(key)
        const message = t('reminders.oneHour', { title: task.title })
        toast(message, {
          duration: 6000,
          action: {
            label: t('reminders.startFocus'),
            onClick: () => { window.location.hash = '' ; window.location.pathname = '/focus' },
          },
        })
        pushDeadlineNotify(message, task.id, '1h')
      }
    }
  }
}

// ── Hook ───────────────────────────────────────────────────────────────────────

/**
 * Runs a deadline reminder check every 15 minutes.
 * Call once in AppShell.tsx.
 */
export function useDeadlineReminders(): void {
  const nowPool = useStore(s => s.nowPool)
  const nextPool = useStore(s => s.nextPool)
  const onboardingCompleted = useStore(s => s.onboardingCompleted)
  const { t } = useTranslation()

  // Session-only dedup set — survives re-renders but not page reloads
  const shownRef = useRef(new Set<string>())

  useEffect(() => {
    if (!onboardingCompleted) return

    const activeTasks = [...nowPool, ...nextPool].filter(t => t.status === 'active' && t.dueDate)

    // Nothing to check
    if (activeTasks.length === 0) return

    const runCheck = () => {
      checkDeadlines(activeTasks, t, shownRef.current)
    }

    // Initial check after a short delay (let the app settle)
    const initialTimer = setTimeout(runCheck, INITIAL_DELAY_MS)

    // Periodic check every 15 minutes
    const interval = setInterval(runCheck, CHECK_INTERVAL_MS)

    return () => {
      clearTimeout(initialTimer)
      clearInterval(interval)
    }
  }, [nowPool, nextPool, onboardingCompleted, t])
}
