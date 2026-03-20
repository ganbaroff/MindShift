/**
 * useTaskSync
 *
 * Background task synchronisation between Supabase and the local Zustand store.
 *
 * Rules:
 *  - Guest users (userId starts with "guest_") → skip all Supabase calls
 *  - Re-runs only when userId changes (login / logout)
 *  - Fire-and-forget: never blocks the UI
 *  - "First device" scenario: if server returns 0 tasks but local store has
 *    tasks, push local tasks to Supabase so data is not lost.
 */

import { useEffect } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/shared/lib/supabase'
import { useStore } from '@/store'
import { logError } from '@/shared/lib/logger'
import type { Task, TaskCategory } from '@/types'
import type { TaskRow } from '@/types/database'

// Valid TaskCategory values — used to safely cast DB strings
const VALID_CATEGORIES = new Set<string>(['work', 'personal', 'health', 'learning', 'finance'])

// ── Row → Task mapping ────────────────────────────────────────────────────────

function rowToTask(row: TaskRow): Task {
  return {
    id:              row.id,
    title:           row.title,
    pool:            row.pool,
    status:          row.status,
    difficulty:      row.difficulty,
    estimatedMinutes: row.estimated_minutes,
    completedAt:     row.completed_at,
    createdAt:       row.created_at,
    snoozeCount:     row.snooze_count,
    parentTaskId:    row.parent_task_id,
    position:        row.position,
    dueDate:         row.due_date,
    dueTime:         row.due_time,
    // task_type from DB is a plain string; cast to the union expected by the
    // store — unknown values are normalised to 'task' as a safe fallback.
    taskType:        (row.task_type === 'idea' || row.task_type === 'reminder' || row.task_type === 'meeting')
                       ? row.task_type
                       : 'task',
    reminderSentAt:  row.reminder_sent_at,
    repeat:          (() => {
      const r = (row as unknown as Record<string, unknown>).repeat
      return r === 'daily' || r === 'weekly' ? r : 'none'
    })(),
    note:            row.note ?? undefined,
    // category column may not exist yet — read gracefully with fallback
    category:        (() => {
      const c = (row as unknown as Record<string, unknown>).category
      return typeof c === 'string' && VALID_CATEGORIES.has(c) ? c as TaskCategory : undefined
    })(),
    // Google Calendar event ID — may not exist yet in older DBs
    googleEventId:   row.google_event_id ?? null,
  }
}

// ── Task → Row mapping (for initial push) ────────────────────────────────────

function taskToInsertRow(task: Task, userId: string): Omit<TaskRow, 'id' | 'created_at' | 'completed_at' | 'snooze_count'> & { id: string; user_id: string } {
  return {
    id:                task.id,
    user_id:           userId,
    title:             task.title,
    pool:              task.pool,
    status:            task.status,
    difficulty:        task.difficulty,
    estimated_minutes: task.estimatedMinutes,
    parent_task_id:    task.parentTaskId,
    position:          task.position,
    due_date:          task.dueDate,
    due_time:          task.dueTime,
    task_type:         task.taskType ?? null,
    reminder_sent_at:  task.reminderSentAt,
    note:              task.note ?? null,
    google_event_id:   task.googleEventId ?? null,
    repeat:            task.repeat ?? 'none',
    category:          task.category ?? null,
  } as Omit<TaskRow, 'id' | 'created_at' | 'completed_at' | 'snooze_count'> & { id: string; user_id: string; repeat: string; category: string | null }
}

// ── Push local tasks to Supabase (first-device scenario) ─────────────────────

function pushLocalTasksToSupabase(tasks: Task[], userId: string): void {
  const rows = tasks.map(t => taskToInsertRow(t, userId))
  supabase
    .from('tasks')
    .upsert(rows as never, { onConflict: 'id' })
    .then(({ error }) => {
      if (error) logError('useTaskSync.pushLocal', error)
    })
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useTaskSync(): void {
  const { userId, nowPool, nextPool, somedayPool, setTasks } = useStore()

  useEffect(() => {
    if (!userId || userId.startsWith('guest_')) return

    supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .neq('status', 'archived')
      .then(({ data, error }) => {
        if (error) {
          logError('useTaskSync.fetch', error)
          toast('Could not sync tasks — working offline 📶', { duration: 4000 })
          return
        }

        const serverTasks: Task[] = (data ?? []).map(rowToTask)

        if (serverTasks.length === 0) {
          const localTasks = [...nowPool, ...nextPool, ...somedayPool]
          if (localTasks.length > 0) {
            pushLocalTasksToSupabase(localTasks, userId)
          }
        } else {
          setTasks(serverTasks)
        }
      })
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps
  // Intentionally omitting pool/setTasks from deps — we only re-sync on login
}

// ── Standalone fire-and-forget helpers ───────────────────────────────────────

/**
 * Upsert a full Task record to Supabase.
 * Call after any local mutation (add / complete / move / etc.).
 */
export function syncTaskUpsert(task: Task, userId: string): void {
  const row = taskToInsertRow(task, userId)
  supabase
    .from('tasks')
    .upsert(row as never, { onConflict: 'id' })
    .then(({ error }) => {
      if (error) logError('syncTaskUpsert', error)
    })
}

/**
 * Partial update of a Task row — useful for single-field mutations
 * (e.g. completedAt, dueDate) without sending the whole record.
 */
export function syncTaskUpdate(taskId: string, updates: Partial<TaskRow>, userId: string): void {
  supabase
    .from('tasks')
    .update(updates as never)
    .eq('id', taskId)
    .eq('user_id', userId)
    .then(({ error }) => {
      if (error) logError('syncTaskUpdate', error)
    })
}
