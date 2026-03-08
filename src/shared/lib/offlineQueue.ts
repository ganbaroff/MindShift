/**
 * Offline Task Queue
 *
 * Stores failed Supabase writes in localStorage and retries them
 * when the network comes back or the app regains visibility.
 *
 * Pattern ported from MindFlow's retry-queue concept, adapted for MindShift.
 *
 * Storage key: 'ms_offline_queue'
 * Max retries per item: 5 (after that, silently dropped to avoid stale loops)
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { logError, logInfo } from '@/shared/lib/logger'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface QueueItem {
  id: string
  table: string
  data: Record<string, unknown>
  userId: string
  createdAt: string
  attempts: number
}

const QUEUE_KEY = 'ms_offline_queue'
const MAX_RETRIES = 5
const MAX_QUEUE_SIZE = 50   // guard against localStorage bloat

// ── Read / Write helpers ──────────────────────────────────────────────────────

function getQueue(): QueueItem[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as QueueItem[]) : []
  } catch {
    return []
  }
}

function saveQueue(q: QueueItem[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q))
  } catch (err) {
    logError('offlineQueue.saveQueue', err)
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Add a failed DB write to the retry queue.
 * Call this inside a Supabase `catch` block.
 */
export function enqueue(
  table: string,
  data: Record<string, unknown>,
  userId: string,
): void {
  const q = getQueue()
  if (q.length >= MAX_QUEUE_SIZE) {
    // Drop oldest entry to make room — prefer freshest data
    q.shift()
  }
  q.push({
    id: crypto.randomUUID(),
    table,
    data,
    userId,
    createdAt: new Date().toISOString(),
    attempts: 0,
  })
  saveQueue(q)
  logInfo('offlineQueue.enqueue', { table, queueSize: q.length })
}

/**
 * How many items are waiting to be flushed.
 */
export function queueSize(): number {
  return getQueue().length
}

/**
 * Try to flush all queued items to Supabase.
 * Items that succeed are removed. Items that fail increment their attempt counter.
 * Items that exceed MAX_RETRIES are silently discarded.
 *
 * Call this from:
 * - `window online` event
 * - `document visibilitychange` (visible → app foregrounded)
 * - App boot (catches items queued in a previous session)
 */
export async function flushQueue(supabase: SupabaseClient): Promise<void> {
  const q = getQueue()
  if (!q.length) return

  logInfo('offlineQueue.flush', { count: q.length })

  const remaining: QueueItem[] = []

  for (const item of q) {
    try {
      const { error } = await supabase
        .from(item.table)
        .upsert(item.data as never, { onConflict: 'id' })
      if (error) throw error
      // ✅ success — drop from queue
      logInfo('offlineQueue.flushed', { id: item.id, table: item.table })
    } catch (err) {
      item.attempts++
      if (item.attempts < MAX_RETRIES) {
        remaining.push(item)
      } else {
        logError('offlineQueue.maxRetriesExceeded', err, {
          id: item.id,
          table: item.table,
          attempts: item.attempts,
        })
      }
    }
  }

  saveQueue(remaining)
}
