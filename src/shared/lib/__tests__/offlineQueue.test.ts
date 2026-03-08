import { describe, it, expect, vi, beforeEach } from 'vitest'
import { enqueue, queueSize, flushQueue, setOnItemsDropped, migrateLegacyQueue } from '../offlineQueue'

// localStorage is provided by jsdom; cleared in global setup afterEach.

const USER_ID = 'user-1'
const QUEUE_KEY = `ms_offline_queue_${USER_ID}`
const LEGACY_KEY = 'ms_offline_queue'

function readQueue() {
  return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]') as object[]
}

beforeEach(() => {
  localStorage.clear()
  setOnItemsDropped(null)
})

describe('offlineQueue — enqueue', () => {
  it('adds one item to empty queue', () => {
    enqueue('tasks', { id: 'task-1', title: 'Hello' }, USER_ID)
    expect(queueSize(USER_ID)).toBe(1)
  })

  it('persists to localStorage with user-namespaced key', () => {
    enqueue('tasks', { id: 'task-1' }, USER_ID)
    const q = readQueue()
    expect(q).toHaveLength(1)
    // Legacy key should be empty
    expect(localStorage.getItem(LEGACY_KEY)).toBeNull()
  })

  it('stores correct table and data', () => {
    enqueue('focus_sessions', { id: 'sess-1', duration_ms: 90000 }, USER_ID)
    const [item] = readQueue() as { table: string; data: object; attempts: number }[]
    expect(item.table).toBe('focus_sessions')
    expect(item.data).toMatchObject({ id: 'sess-1', duration_ms: 90000 })
    expect(item.attempts).toBe(0)
  })

  it('stores userId on the item', () => {
    enqueue('tasks', { id: 't1' }, 'user-abc')
    const q = JSON.parse(localStorage.getItem('ms_offline_queue_user-abc') ?? '[]') as { userId: string }[]
    expect(q[0].userId).toBe('user-abc')
  })

  it('isolates queues per user', () => {
    enqueue('tasks', { id: 't1' }, 'user-A')
    enqueue('tasks', { id: 't2' }, 'user-B')
    expect(queueSize('user-A')).toBe(1)
    expect(queueSize('user-B')).toBe(1)
  })

  it('accumulates multiple items', () => {
    enqueue('tasks', { id: 't1' }, USER_ID)
    enqueue('tasks', { id: 't2' }, USER_ID)
    enqueue('tasks', { id: 't3' }, USER_ID)
    expect(queueSize(USER_ID)).toBe(3)
  })

  it('drops oldest item when at MAX_QUEUE_SIZE (50)', () => {
    // Fill to capacity
    for (let i = 0; i < 50; i++) {
      enqueue('tasks', { id: `t${i}` }, USER_ID)
    }
    expect(queueSize(USER_ID)).toBe(50)

    // One more → should drop oldest, keep 50
    enqueue('tasks', { id: 't99' }, USER_ID)
    expect(queueSize(USER_ID)).toBe(50)

    // Newest item should be present
    const q = readQueue() as { data: { id: string } }[]
    expect(q[q.length - 1].data.id).toBe('t99')
  })
})

describe('offlineQueue — queueSize', () => {
  it('returns 0 on empty queue', () => {
    expect(queueSize(USER_ID)).toBe(0)
  })

  it('returns correct count after enqueueing', () => {
    enqueue('tasks', { id: 't1' }, USER_ID)
    enqueue('tasks', { id: 't2' }, USER_ID)
    expect(queueSize(USER_ID)).toBe(2)
  })
})

describe('offlineQueue — flushQueue', () => {
  it('clears queue when all items succeed', async () => {
    enqueue('tasks', { id: 't1' }, USER_ID)
    enqueue('tasks', { id: 't2' }, USER_ID)

    const mockSupabase = {
      from: vi.fn(() => ({
        upsert: vi.fn().mockResolvedValue({ error: null }),
      })),
    }

    await flushQueue(mockSupabase as never, USER_ID)
    expect(queueSize(USER_ID)).toBe(0)
    // localStorage key should be removed when empty
    expect(localStorage.getItem(QUEUE_KEY)).toBeNull()
  })

  it('retains items that fail (increments attempts)', async () => {
    enqueue('tasks', { id: 't1' }, USER_ID)

    const mockSupabase = {
      from: vi.fn(() => ({
        upsert: vi.fn().mockResolvedValue({ error: new Error('Network error') }),
      })),
    }

    await flushQueue(mockSupabase as never, USER_ID)
    expect(queueSize(USER_ID)).toBe(1)

    const [item] = readQueue() as { attempts: number }[]
    expect(item.attempts).toBe(1)
  })

  it('discards items that exceed MAX_RETRIES (5) and notifies callback', async () => {
    enqueue('tasks', { id: 't1' }, USER_ID)

    const onDropped = vi.fn()
    setOnItemsDropped(onDropped)

    const mockSupabase = {
      from: vi.fn(() => ({
        upsert: vi.fn().mockResolvedValue({ error: new Error('Permanent error') }),
      })),
    }

    // Flush 4 times → item should survive (attempts 1→4)
    for (let i = 0; i < 4; i++) {
      await flushQueue(mockSupabase as never, USER_ID)
    }
    expect(queueSize(USER_ID)).toBe(1)
    expect(onDropped).not.toHaveBeenCalled()

    // 5th failure → attempts = 5 → item discarded + callback fired
    await flushQueue(mockSupabase as never, USER_ID)
    expect(queueSize(USER_ID)).toBe(0)
    expect(onDropped).toHaveBeenCalledWith(1)
  })

  it('is a no-op on empty queue', async () => {
    const mockSupabase = {
      from: vi.fn(() => ({
        upsert: vi.fn(),
      })),
    }
    await flushQueue(mockSupabase as never, USER_ID)
    expect(mockSupabase.from).not.toHaveBeenCalled()
  })

  it('handles mixed success/failure correctly', async () => {
    enqueue('tasks', { id: 'ok' }, USER_ID)
    enqueue('tasks', { id: 'fail' }, USER_ID)

    let callCount = 0
    const mockSupabase = {
      from: vi.fn(() => ({
        upsert: vi.fn().mockImplementation(() => {
          // First call succeeds, second fails
          callCount++
          return Promise.resolve({ error: callCount === 2 ? new Error('fail') : null })
        }),
      })),
    }

    await flushQueue(mockSupabase as never, USER_ID)
    expect(queueSize(USER_ID)).toBe(1)  // only the failed item remains
    const [remaining] = readQueue() as { data: { id: string } }[]
    expect(remaining.data.id).toBe('fail')
  })
})

describe('offlineQueue — migrateLegacyQueue', () => {
  it('migrates items from legacy key to user-namespaced key', () => {
    const legacyItems = [
      { id: 'q1', table: 'tasks', data: { id: 't1' }, userId: USER_ID, createdAt: '2026-01-01', attempts: 0 },
      { id: 'q2', table: 'tasks', data: { id: 't2' }, userId: USER_ID, createdAt: '2026-01-02', attempts: 0 },
    ]
    localStorage.setItem(LEGACY_KEY, JSON.stringify(legacyItems))

    migrateLegacyQueue(USER_ID)

    expect(queueSize(USER_ID)).toBe(2)
    expect(localStorage.getItem(LEGACY_KEY)).toBeNull()
  })

  it('only migrates items belonging to current user', () => {
    const legacyItems = [
      { id: 'q1', table: 'tasks', data: { id: 't1' }, userId: USER_ID, createdAt: '2026-01-01', attempts: 0 },
      { id: 'q2', table: 'tasks', data: { id: 't2' }, userId: 'other-user', createdAt: '2026-01-02', attempts: 0 },
    ]
    localStorage.setItem(LEGACY_KEY, JSON.stringify(legacyItems))

    migrateLegacyQueue(USER_ID)

    expect(queueSize(USER_ID)).toBe(1)
    // Other user's items stay in legacy key
    const remaining = JSON.parse(localStorage.getItem(LEGACY_KEY)!) as object[]
    expect(remaining).toHaveLength(1)
  })

  it('is a no-op when legacy key is empty', () => {
    migrateLegacyQueue(USER_ID)
    expect(queueSize(USER_ID)).toBe(0)
  })
})
