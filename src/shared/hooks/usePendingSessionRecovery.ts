/**
 * usePendingSessionRecovery
 *
 * On first mount, checks localStorage for a `ms_pending_session` snapshot
 * written by useFocusSession's beforeunload handler (tab close during session).
 *
 * If found, shows a non-blocking toast offering to resume:
 *   - "Resume" → navigates to /focus (task pre-selected via store)
 *   - Dismiss   → silently clears the snapshot
 *
 * Runs once per app load. Never blocks the UI.
 */

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useStore } from '@/store'

const PENDING_KEY = 'ms_pending_session'

interface PendingSession {
  taskId:     string | null
  startedAt:  string
  elapsedMs:  number
  phase:      string
}

function formatElapsed(ms: number): string {
  const min = Math.round(ms / 60_000)
  if (min < 1) return 'just started'
  if (min === 1) return '1 min in'
  return `${min} min in`
}

export function usePendingSessionRecovery(): void {
  const navigate = useNavigate()
  const nowPool  = useStore(s => s.nowPool)
  const nextPool = useStore(s => s.nextPool)

  useEffect(() => {
    const raw = localStorage.getItem(PENDING_KEY)
    if (!raw) return

    // Always clean up — even if parsing fails
    let pending: PendingSession | null = null
    try {
      pending = JSON.parse(raw) as PendingSession
    } catch {
      localStorage.removeItem(PENDING_KEY)
      return
    }
    localStorage.removeItem(PENDING_KEY)

    if (!pending) return

    // Find the task title for context in the toast
    const allTasks = [...nowPool, ...nextPool]
    const task = pending.taskId ? allTasks.find(t => t.id === pending!.taskId) : null
    const taskLabel = task?.title
      ? `"${task.title.slice(0, 35)}${task.title.length > 35 ? '…' : ''}"`
      : 'your last task'

    const elapsed = formatElapsed(pending.elapsedMs)

    toast(`Session was interrupted — ${elapsed} on ${taskLabel}`, {
      duration: 12_000,
      action: {
        label: 'Go to Focus',
        onClick: () => navigate('/focus'),
      },
    })
  // Run once on mount — pools are read synchronously from store snapshot
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
