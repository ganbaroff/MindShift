/**
 * Offline Task Queue
 *
 * Stores failed Supabase writes in localStorage and retries them
 * when the network comes back or the app regains visibility.
 *
 * Pattern ported from MindFlow's retry-queue concept, adapted for MindShift.
 *
 * Storage key: 'ms_offline_queue_{userId}' (per-user namespace)
 * Max retries per item: 5 (after that, user is notified + item dropped)
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { logError, logInfo } from '@/shared/lib/logger'

// -- Types ---------------------------------------------------------------------

export interface QueueItem {
  id: string
  table: string
  data: Record<string, unknown>
  userId: string
  createdAt: string
  attempts: number
}

const QUEUE_KEY_PREFIX = 'ms_offline_queue'
const MAX_RETRIES = 5
const MAX_QUEUE_SIZE = 50   // guard against localStorage bloat

// -- Key helper (per-user namespace) ------------------------------------------

function queueKey(userId?: string): string {
  return userId ? `${QUEUE_KEY_PREFIX}_${userId}` : QUEUE_KEY_PREFIX
}

// -- Read / Write helpers ------------------------------------------------------

function getQueue(userId?: string): QueueItem[] {
  try {
    const raw = localStorage.getItem(queueKey(userId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as QueueItem[]) : []
  } catch {
    // Self-heal corrupted JSON — clear the key so next enqueue can start fresh
    try { localStorage.removeItem(queueKey(userId)) } catch { /* ignore */ }
    return []
  }
}

function saveQueue(q: QueueItem[], userId?: string): void {
  try {
    if (q.length === 0) {
      localStorage.removeItem(queueKey(userId))
    } else {
      localStorage.setItem(queueKey(userId), JSON.stringify(q))
    }
  } catch (err) {
    logError('offlineQueue.saveQueue', err)
  }
}

// -- Public API ----------------------------------------------------------------

/**
 * Callback for when items are permanently dropped after MAX_RETRIES.
 * Set this from the app layer to surface a toast notification.
 */
export let onItemsDropped: ((count: number) => void) | null = null

export function setOnItemsDropped(cb: ((count: number) => void) | null): void {
  onItemsDropped = cb
}

/**
 * Add a failed DB write to the retry queue.
 * Call this inside a Supabase `catch` block.
 */
export function enqueue(
  table: string,
  data: Record<string, unknown>,
  userId: string,
): void {
  const q = getQueue(userId)
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
  saveQueue(q, userId)
  logInfo('offlineQueue.enqueue', { table, queueSize: q.length })
}

/**
 * How many items are waiting to be flushed.
 */
export function queueSize(userId?: string): number {
  return getQueue(userId).length
}

/**
 * Try to flush all queued items to Supabase.
 * Items that succeed are removed. Items that fail increment their attempt counter.
 * Items that exceed MAX_RETRIES trigger a user notification + are discarded.
 *
 * Call this from:
 * - `window online` event
 * - `document visibilitychange` (visible → app foregrounded)
 * - App boot (catches items queued in a previous session)
 */
export async function flushQueue(supabase: SupabaseClient, userId?: string): Promise<void> {
  const q = getQueue(userId)
  if (!q.length) return

  logInfo('offlineQueue.flush', { count: q.length })

  const remaining: QueueItem[] = []
  let droppedCount = 0

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
        droppedCount++
        logError('offlineQueue.maxRetriesExceeded', err, {
          id: item.id,
          table: item.table,
          attempts: item.attempts,
        })
      }
    }
  }

  saveQueue(remaining, userId)

  // Notify user about permanently dropped items — never lose data silently
  if (droppedCount > 0 && onItemsDropped) {
    onItemsDropped(droppedCount)
  }
}

/**
 * Migrate legacy non-namespaced queue items to user-specific key.
 * Call once during app boot after auth.
 */
export function migrateLegacyQueue(userId: string): void {
  try {
    const legacyRaw = localStorage.getItem(QUEUE_KEY_PREFIX)
    if (!legacyRaw) return

    const legacy = JSON.parse(legacyRaw) as QueueItem[]
    if (!Array.isArray(legacy) || legacy.length === 0) {
      localStorage.removeItem(QUEUE_KEY_PREFIX)
      return
    }

    // Only migrate items belonging to this user
    const userItems = legacy.filter(item => item.userId === userId)
    const otherItems = legacy.filter(item => item.userId !== userId)

    if (userItems.length > 0) {
      const existing = getQueue(userId)
      saveQueue([...existing, ...userItems], userId)
    }

    // Keep items from other users in legacy key, or remove if empty
    if (otherItems.length > 0) {
      localStorage.setItem(QUEUE_KEY_PREFIX, JSON.stringify(otherItems))
    } else {
      localStorage.removeItem(QUEUE_KEY_PREFIX)
    }

    logInfo('offlineQueue.migrateLegacy', { migrated: userItems.length, kept: otherItems.length })
  } catch {
    // Migration failure is non-critical
  }
}
