// ── Reminders service ─────────────────────────────────────────────────────────
// Singleton that schedules browser push notifications for tasks with due dates.
// Uses setTimeout (current session) + localStorage (persistence across reloads).

import { toast } from 'sonner'
import type { Task } from '@/types'

const STORAGE_KEY = 'ms_reminders'

export interface ScheduledReminder {
  taskId: string
  taskTitle: string
  fireAt: number        // ms timestamp
  minutesBefore: number
}

// Active timeout handles (session-only, not persisted)
const activeTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

// ── Push notification helper (inline to avoid circular import) ────────────────

function pushReminderNotify(reminder: ScheduledReminder): void {
  // In-app toast (always visible when app is foregrounded)
  toast(`⏰ ${reminder.taskTitle}`, {
    description: `Due in ${reminder.minutesBefore} min`,
    duration: 8000,
  })

  // Native push (when app is backgrounded)
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

    show(`⏰ ${reminder.taskTitle}`, {
      body: `Reminder: ${reminder.minutesBefore} min before due time`,
      tag: `reminder-${reminder.taskId}`,
      silent: false,
    })
  } catch { /* non-critical */ }
}

// ── Core service ─────────────────────────────────────────────────────────────

function loadAll(): ScheduledReminder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as ScheduledReminder[]) : []
  } catch {
    return []
  }
}

function saveAll(list: ScheduledReminder[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch { /* storage full — skip */ }
}

function arm(reminder: ScheduledReminder): void {
  const delay = reminder.fireAt - Date.now()
  if (delay <= 0) return  // already past due — skip
  const id = setTimeout(() => {
    pushReminderNotify(reminder)
    activeTimeouts.delete(reminder.taskId)
    // Remove from storage once fired
    const list = loadAll().filter(r => r.taskId !== reminder.taskId)
    saveAll(list)
  }, Math.min(delay, 2_147_483_647)) // setTimeout max ~24.8 days
  activeTimeouts.set(reminder.taskId, id)
}

export const reminders = {
  /** Schedule a reminder for a task with dueDate+dueTime. */
  schedule(task: Task, minutesBefore: number): void {
    if (!task.dueDate) return
    const timeStr = task.dueTime ?? '09:00'
    const fireAt = new Date(`${task.dueDate}T${timeStr}:00`).getTime() - minutesBefore * 60_000
    if (fireAt <= Date.now()) return

    // Cancel any existing reminder for this task
    reminders.cancel(task.id)

    const r: ScheduledReminder = {
      taskId: task.id,
      taskTitle: task.title,
      fireAt,
      minutesBefore,
    }

    const list = loadAll().filter(existing => existing.taskId !== task.id)
    list.push(r)
    saveAll(list)
    arm(r)
  },

  /** Cancel and remove a reminder. */
  cancel(taskId: string): void {
    const id = activeTimeouts.get(taskId)
    if (id !== undefined) clearTimeout(id)
    activeTimeouts.delete(taskId)
    saveAll(loadAll().filter(r => r.taskId !== taskId))
  },

  /** Re-arm all persisted reminders after page reload. Call on app mount. */
  restore(): void {
    const list = loadAll()
    const now = Date.now()
    const valid = list.filter(r => r.fireAt > now)
    if (valid.length !== list.length) saveAll(valid)  // prune expired
    valid.forEach(arm)
  },

  getAll(): ScheduledReminder[] {
    return loadAll()
  },

  has(taskId: string): boolean {
    return loadAll().some(r => r.taskId === taskId)
  },
}
