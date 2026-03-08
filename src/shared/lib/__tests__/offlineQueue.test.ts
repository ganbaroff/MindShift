import { describe, it, expect, vi } from 'vitest'
import { enqueue, queueSize, flushQueue } from '../offlineQueue'

// localStorage is provided by jsdom; cleared in global setup afterEach.

const QUEUE_KEY = 'ms_offline_queue'

function readQueue() {
  return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]') as object[]
}

describe('offlineQueue — enqueue', () => {
  it('adds one item to empty queue', () => {
    enqueue('tasks', { id: 'task-1', title: 'Hello' }, 'user-1')
    expect(queueSize()).toBe(1)
  })

  it('persists to localStorage', () => {
    enqueue('tasks', { id: 'task-1' }, 'user-1')
    const q = readQueue()
    expect(q).toHaveLength(1)
  })

  it('stores correct table and data', () => {
    enqueue('focus_sessions', { id: 'sess-1', duration_ms: 90000 }, 'user-1')
    const [item] = readQueue() as { table: string; data: object; attempts: number }[]
    expect(item.table).toBe('focus_sessions')
    expect(item.data).toMatchObject({ id: 'sess-1', duration_ms: 90000 })
    expect(item.attempts).toBe(0)
  })

  it('stores userId on the item', () => {
    enqueue('tasks', { id: 't1' }, 'user-abc')
    const [item] = readQueue() as { userId: string }[]
    expect(item.userId).toBe('user-abc')
  })

  it('accumulates multiple items', () => {
    enqueue('tasks', { id: 't1' }, 'u1')
    enqueue('tasks', { id: 't2' }, 'u1')
    enqueue('tasks', { id: 't3' }, 'u1')
    expect(queueSize()).toBe(3)
  })

  it('drops oldest item when at MAX_QUEUE_SIZE (50)', () => {
    // Fill to capacity
    for (let i = 0; i < 50; i++) {
      enqueue('tasks', { id: `t${i}` }, 'u1')
    }
    expect(queueSize()).toBe(50)

    // One more → should drop oldest, keep 50
    enqueue('tasks', { id: 't99' }, 'u1')
    expect(queueSize()).toBe(50)

    // Newest item should be present
    const q = readQueue() as { data: { id: string } }[]
    expect(q[q.length - 1].data.id).toBe('t99')
  })
})

describe('offlineQueue — queueSize', () => {
  it('returns 0 on empty queue', () => {
    expect(queueSize()).toBe(0)
  })

  it('returns correct count after enqueueing', () => {
    enqueue('tasks', { id: 't1' }, 'u1')
    enqueue('tasks', { id: 't2' }, 'u1')
    expect(queueSize()).toBe(2)
  })
})

describe('offlineQueue — flushQueue', () => {
  it('clears queue when all items succeed', async () => {
    enqueue('tasks', { id: 't1' }, 'u1')
    enqueue('tasks', { id: 't2' }, 'u1')

    const mockSupabase = {
      from: vi.fn(() => ({
        upsert: vi.fn().mockResolvedValue({ error: null }),
      })),
    }

    await flushQueue(mockSupabase as never)
    expect(queueSize()).toBe(0)
  })

  it('retains items that fail (increments attempts)', async () => {
    enqueue('tasks', { id: 't1' }, 'u1')

    const mockSupabase = {
      from: vi.fn(() => ({
        upsert: vi.fn().mockResolvedValue({ error: new Error('Network error') }),
      })),
    }

    await flushQueue(mockSupabase as never)
    expect(queueSize()).toBe(1)

    const [item] = readQueue() as { attempts: number }[]
    expect(item.attempts).toBe(1)
  })

  it('discards items that exceed MAX_RETRIES (5)', async () => {
    enqueue('tasks', { id: 't1' }, 'u1')

    const mockSupabase = {
      from: vi.fn(() => ({
        upsert: vi.fn().mockResolvedValue({ error: new Error('Permanent error') }),
      })),
    }

    // Flush 5 times → item should survive (attempts 1→4)
    for (let i = 0; i < 4; i++) {
      await flushQueue(mockSupabase as never)
    }
    expect(queueSize()).toBe(1)

    // 5th failure → attempts = 5 → item discarded
    await flushQueue(mockSupabase as never)
    expect(queueSize()).toBe(0)
  })

  it('is a no-op on empty queue', async () => {
    const mockSupabase = {
      from: vi.fn(() => ({
        upsert: vi.fn(),
      })),
    }
    await flushQueue(mockSupabase as never)
    expect(mockSupabase.from).not.toHaveBeenCalled()
  })

  it('handles mixed success/failure correctly', async () => {
    enqueue('tasks', { id: 'ok' }, 'u1')
    enqueue('tasks', { id: 'fail' }, 'u1')

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

    await flushQueue(mockSupabase as never)
    expect(queueSize()).toBe(1)  // only the failed item remains
    const [remaining] = readQueue() as { data: { id: string } }[]
    expect(remaining.data.id).toBe('fail')
  })
})
