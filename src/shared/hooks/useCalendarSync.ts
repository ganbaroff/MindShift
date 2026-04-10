// -- useCalendarSync — reactive Google Calendar sync -------------------------
// Watches store for task create/update/complete/delete and syncs to Google Calendar.
// Fire-and-forget: never blocks the UI. Gentle toast on failure.

import { useEffect, useRef, useCallback } from 'react'
import { useStore } from '@/store'
import { supabase } from '@/shared/lib/supabase'
import { toast } from 'sonner'
import { logError } from '@/shared/lib/logger'
import type { Task } from '@/types'

/** Task types that should sync to Google Calendar */
const SYNC_TYPES = new Set(['meeting', 'reminder'])

/** Check if a task should be synced (has dueDate + is a meeting or reminder) */
function shouldSync(task: Task): boolean {
  return SYNC_TYPES.has(task.taskType) && !!task.dueDate
}

async function callGcalSync(
  action: 'create' | 'update' | 'delete',
  task: Task,
): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke('gcal-sync', {
      body: {
        action,
        task: {
          id: task.id,
          title: task.title,
          taskType: task.taskType,
          dueDate: task.dueDate,
          dueTime: task.dueTime,
          estimatedMinutes: task.estimatedMinutes,
          googleEventId: task.googleEventId ?? null,
          note: task.note ?? null,
        },
      },
    })

    if (error) {
      logError('useCalendarSync.edgeFn', error)
      return null
    }

    if (data?.error === 'token_revoked') {
      toast('Calendar sync paused — reconnect in Settings', { icon: '📅' })
      useStore.getState().setCalendarSyncEnabled(false)
      return null
    }

    if (data?.error === 'calendar_not_connected') {
      return null // silently skip — not connected
    }

    return data?.googleEventId ?? null
  } catch (err) {
    logError('useCalendarSync.syncTask', err)
    return null
  }
}

/** Sync a focus session as a time block to Google Calendar */
export async function syncFocusSession(
  startedAt: string,
  durationMs: number,
  taskTitle: string | null,
): Promise<void> {
  const { calendarSyncEnabled, calendarFocusBlocks, userId } = useStore.getState()
  if (!calendarSyncEnabled || !calendarFocusBlocks || !userId || userId.startsWith('guest_')) return

  try {
    await supabase.functions.invoke('gcal-sync', {
      body: {
        action: 'create',
        focusSession: { startedAt, durationMs, taskTitle },
      },
    })
  } catch (err) {
    logError('useCalendarSync.sessionSync', err)
  }
}

export function useCalendarSync() {
  const calendarSyncEnabled = useStore(s => s.calendarSyncEnabled)
  const userId = useStore(s => s.userId)
  const nowPool = useStore(s => s.nowPool)
  const nextPool = useStore(s => s.nextPool)
  const somedayPool = useStore(s => s.somedayPool)

  // Track previous task state for diff detection
  const prevTaskMapRef = useRef<Map<string, { status: string; dueDate: string | null; dueTime: string | null; title: string; googleEventId?: string | null }>>(new Map())
  const initializedRef = useRef(false)
  const syncQueueRef = useRef<Array<{ action: 'create' | 'update' | 'delete'; task: Task }>>([])
  const processingRef = useRef(false)

  const processQueue = useCallback(async () => {
    if (processingRef.current || syncQueueRef.current.length === 0) return
    processingRef.current = true

    while (syncQueueRef.current.length > 0) {
      const item = syncQueueRef.current.shift()!
      const eventId = await callGcalSync(item.action, item.task)

      // Update store with googleEventId if we got one from create
      if (eventId && item.action === 'create') {
        useStore.getState().updateTask(item.task.id, {} as never)
        // We can't easily set googleEventId through updateTask since it's not in the partial type
        // The edge function already stored it in the DB — it'll sync back on next useTaskSync
      }
    }

    processingRef.current = false
  }, [])

  useEffect(() => {
    if (!calendarSyncEnabled || !userId || userId.startsWith('guest_')) return

    const allTasks = [...nowPool, ...nextPool, ...somedayPool]
    const currentMap = new Map(
      allTasks.map(t => [t.id, {
        status: t.status,
        dueDate: t.dueDate,
        dueTime: t.dueTime,
        title: t.title,
        googleEventId: t.googleEventId,
      }])
    )

    // Skip first render — just capture the initial state
    if (!initializedRef.current) {
      prevTaskMapRef.current = currentMap
      initializedRef.current = true
      return
    }

    const prev = prevTaskMapRef.current

    // Detect changes
    for (const task of allTasks) {
      if (!shouldSync(task)) continue

      const prevState = prev.get(task.id)

      if (!prevState) {
        // New task — create event
        if (task.status === 'active') {
          syncQueueRef.current.push({ action: 'create', task })
        }
      } else if (prevState.status === 'active' && task.status === 'completed') {
        // Completed — delete event
        syncQueueRef.current.push({ action: 'delete', task })
      } else if (
        task.status === 'active' &&
        (prevState.dueDate !== task.dueDate ||
         prevState.dueTime !== task.dueTime ||
         prevState.title !== task.title)
      ) {
        // Updated — update event
        syncQueueRef.current.push({ action: 'update', task })
      }
    }

    // Check for deleted tasks
    for (const [id, prevState] of prev) {
      if (!currentMap.has(id) && prevState.status === 'active') {
        // Task was removed — delete from calendar
        const deletedTask = { id, googleEventId: prevState.googleEventId } as Task
        syncQueueRef.current.push({ action: 'delete', task: deletedTask })
      }
    }

    prevTaskMapRef.current = currentMap

    // Process queued syncs
    if (syncQueueRef.current.length > 0) {
      void processQueue()
    }
  }, [calendarSyncEnabled, userId, nowPool, nextPool, somedayPool, processQueue])
}
