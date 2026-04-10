import { describe, it, expect, vi, beforeEach } from 'vitest'

// Break circular: store → uiTone → i18n → useStore.getState() (before store is ready)
vi.mock('@/store', () => {
  const mockState = { userLocale: 'en', nowPool: [], nextPool: [], somedayPool: [] }
  const useStore = Object.assign(
    (selector: (s: typeof mockState) => unknown) => selector(mockState),
    { getState: () => mockState, subscribe: () => () => {} }
  )
  return { useStore }
})

import { computeUserBehaviorProfile } from '../useUserBehavior'
import type { FocusSessionRow } from '@/types/database'
import type { Task } from '@/types'

// -- Helpers -------------------------------------------------------------------

function makeSession(overrides: Partial<FocusSessionRow> = {}): FocusSessionRow {
  return {
    id: 'sess-' + Math.random(),
    user_id: 'user-1',
    started_at: new Date('2026-03-29T10:00:00Z').toISOString(),
    ended_at: null,
    duration_ms: 1_500_000, // 25 minutes
    phase_reached: null,
    energy_before: null,
    energy_after: null,
    audio_preset: null,
    task_id: null,
    ...overrides,
  }
}

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-' + Math.random(),
    title: 'Test task',
    status: 'active',
    difficulty: 2,
    estimatedMinutes: 25,
    createdAt: new Date().toISOString(),
    pool: 'now',
    position: 0,
    repeat: 'none',
    taskType: 'task',
    snoozeCount: 0,
    completedAt: null,
    parentTaskId: null,
    dueDate: null,
    dueTime: null,
    reminderSentAt: null,
    ...overrides,
  }
}

const emptyPools = { nowPool: [], nextPool: [], somedayPool: [] }

// -- Empty / zero state --------------------------------------------------------

describe('computeUserBehaviorProfile — empty sessions', () => {
  it('returns all zeros when no sessions', () => {
    const profile = computeUserBehaviorProfile([], emptyPools)
    expect(profile.totalSessions).toBe(0)
    expect(profile.avgSessionMinutes).toBe(0)
    expect(profile.flowRate).toBe(0)
    expect(profile.struggleDropRate).toBe(0)
    expect(profile.peakHour).toBeNull()
    expect(profile.avgEnergy).toBe(0)
    expect(profile.energyTrend).toBeNull()
    expect(profile.recentStruggles).toBeNull()
    expect(profile.completedToday).toBe(0)
  })
})

// -- avgSessionMinutes ---------------------------------------------------------

describe('avgSessionMinutes', () => {
  it('computes average from duration_ms values', () => {
    const sessions = [
      makeSession({ duration_ms: 1_200_000 }), // 20 min
      makeSession({ duration_ms: 1_800_000 }), // 30 min
    ]
    const profile = computeUserBehaviorProfile(sessions, emptyPools)
    expect(profile.avgSessionMinutes).toBe(25) // (20+30)/2
  })

  it('ignores null and zero duration_ms', () => {
    const sessions = [
      makeSession({ duration_ms: null }),
      makeSession({ duration_ms: 0 }),
      makeSession({ duration_ms: 3_000_000 }), // 50 min
    ]
    const profile = computeUserBehaviorProfile(sessions, emptyPools)
    expect(profile.avgSessionMinutes).toBe(50)
  })

  it('rounds to 1 decimal place', () => {
    const sessions = [
      makeSession({ duration_ms: 1_000_000 }), // 16.666... min
    ]
    const profile = computeUserBehaviorProfile(sessions, emptyPools)
    expect(profile.avgSessionMinutes).toBe(16.7)
  })

  it('returns 0 when all durations are null', () => {
    const sessions = [makeSession({ duration_ms: null }), makeSession({ duration_ms: null })]
    const profile = computeUserBehaviorProfile(sessions, emptyPools)
    expect(profile.avgSessionMinutes).toBe(0)
  })
})

// -- flowRate & struggleDropRate -----------------------------------------------

describe('flowRate and struggleDropRate', () => {
  it('computes flowRate correctly', () => {
    const sessions = [
      makeSession({ phase_reached: 'flow' }),
      makeSession({ phase_reached: 'flow' }),
      makeSession({ phase_reached: 'struggle' }),
      makeSession({ phase_reached: 'release' }),
    ]
    const profile = computeUserBehaviorProfile(sessions, emptyPools)
    expect(profile.flowRate).toBe(0.5) // 2/4
  })

  it('computes struggleDropRate correctly', () => {
    const sessions = [
      makeSession({ phase_reached: 'struggle' }),
      makeSession({ phase_reached: 'struggle' }),
      makeSession({ phase_reached: 'flow' }),
      makeSession({ phase_reached: 'flow' }),
    ]
    const profile = computeUserBehaviorProfile(sessions, emptyPools)
    expect(profile.struggleDropRate).toBe(0.5) // 2/4
  })

  it('returns 0 for both when no phase data', () => {
    const sessions = [makeSession({ phase_reached: null }), makeSession({ phase_reached: null })]
    const profile = computeUserBehaviorProfile(sessions, emptyPools)
    expect(profile.flowRate).toBe(0)
    expect(profile.struggleDropRate).toBe(0)
  })

  it('rounds to 2 decimal places', () => {
    const sessions = [
      makeSession({ phase_reached: 'flow' }),
      makeSession({ phase_reached: 'struggle' }),
      makeSession({ phase_reached: 'struggle' }),
    ]
    const profile = computeUserBehaviorProfile(sessions, emptyPools)
    expect(profile.flowRate).toBe(0.33)
    expect(profile.struggleDropRate).toBe(0.67)
  })
})

// -- peakHour ------------------------------------------------------------------

describe('peakHour', () => {
  /** Build an ISO string where new Date(iso).getHours() === localHour */
  function isoAtLocalHour(localHour: number, minuteOffset = 0): string {
    const d = new Date()
    d.setHours(localHour, minuteOffset, 0, 0)
    return d.toISOString()
  }

  it('returns the most frequent hour', () => {
    const sessions = [
      makeSession({ started_at: isoAtLocalHour(9, 0) }),
      makeSession({ started_at: isoAtLocalHour(9, 30) }),
      makeSession({ started_at: isoAtLocalHour(14, 0) }),
    ]
    const profile = computeUserBehaviorProfile(sessions, emptyPools)
    // hour 9 appears twice, hour 14 appears once
    expect(profile.peakHour).toBe(9)
  })

  it('returns null with no sessions', () => {
    const profile = computeUserBehaviorProfile([], emptyPools)
    expect(profile.peakHour).toBeNull()
  })

  it('returns the only hour with a single session', () => {
    const sessions = [makeSession({ started_at: isoAtLocalHour(14) })]
    const profile = computeUserBehaviorProfile(sessions, emptyPools)
    expect(profile.peakHour).toBe(14)
  })
})

// -- avgEnergy -----------------------------------------------------------------

describe('avgEnergy', () => {
  it('prefers energy_after over energy_before', () => {
    const sessions = [
      makeSession({ energy_before: 2, energy_after: 4 }),
      makeSession({ energy_before: 1, energy_after: 3 }),
    ]
    const profile = computeUserBehaviorProfile(sessions, emptyPools)
    expect(profile.avgEnergy).toBe(3.5) // (4+3)/2
  })

  it('falls back to energy_before when energy_after is null', () => {
    const sessions = [
      makeSession({ energy_before: 3, energy_after: null }),
      makeSession({ energy_before: 5, energy_after: null }),
    ]
    const profile = computeUserBehaviorProfile(sessions, emptyPools)
    expect(profile.avgEnergy).toBe(4) // (3+5)/2
  })

  it('returns 0 when no energy data', () => {
    const sessions = [makeSession({ energy_before: null, energy_after: null })]
    const profile = computeUserBehaviorProfile(sessions, emptyPools)
    expect(profile.avgEnergy).toBe(0)
  })
})

// -- energyTrend ---------------------------------------------------------------

describe('energyTrend', () => {
  it('returns null with fewer than 2 sessions with energy_after', () => {
    const sessions = [makeSession({ energy_after: 3 })]
    const profile = computeUserBehaviorProfile(sessions, emptyPools)
    expect(profile.energyTrend).toBeNull()
  })

  it('returns null with 0 sessions with energy_after', () => {
    const sessions = [makeSession({ energy_after: null }), makeSession({ energy_after: null })]
    const profile = computeUserBehaviorProfile(sessions, emptyPools)
    expect(profile.energyTrend).toBeNull()
  })

  it('detects improving trend (delta > 0.5) with 10+ sessions', () => {
    // 10 sessions sorted by time: first 5 avg=2, last 5 avg=4 → delta=+2
    const base = new Date('2026-03-20T10:00:00Z').getTime()
    const sessions = Array.from({ length: 10 }, (_, i) =>
      makeSession({
        started_at: new Date(base + i * 3_600_000).toISOString(),
        energy_after: i < 5 ? 2 : 4,
      })
    )
    const profile = computeUserBehaviorProfile(sessions, emptyPools)
    expect(profile.energyTrend).toBe('improving')
  })

  it('detects declining trend (delta < -0.5) with 10+ sessions', () => {
    const base = new Date('2026-03-20T10:00:00Z').getTime()
    const sessions = Array.from({ length: 10 }, (_, i) =>
      makeSession({
        started_at: new Date(base + i * 3_600_000).toISOString(),
        energy_after: i < 5 ? 4 : 2,
      })
    )
    const profile = computeUserBehaviorProfile(sessions, emptyPools)
    expect(profile.energyTrend).toBe('declining')
  })

  it('detects stable trend (|delta| ≤ 0.5) with 10+ sessions', () => {
    const base = new Date('2026-03-20T10:00:00Z').getTime()
    const sessions = Array.from({ length: 10 }, (_, i) =>
      makeSession({
        started_at: new Date(base + i * 3_600_000).toISOString(),
        energy_after: 3,
      })
    )
    const profile = computeUserBehaviorProfile(sessions, emptyPools)
    expect(profile.energyTrend).toBe('stable')
  })

  it('uses basic comparison with 2–9 sessions', () => {
    // With 9 sessions: slice(0, 5) vs slice(-5) overlap only at session 4 (index 4).
    // Values: [1,1,1,1,1, 5,5,5,5] — avgFirst(0..4)=1.4, avgLast(4..8)=4.2 → delta>0.5 → improving
    const base = new Date('2026-03-20T10:00:00Z').getTime()
    const sessions = Array.from({ length: 9 }, (_, i) =>
      makeSession({
        started_at: new Date(base + i * 3_600_000).toISOString(),
        energy_after: i < 5 ? 1 : 5,
      })
    )
    const profile = computeUserBehaviorProfile(sessions, emptyPools)
    expect(profile.energyTrend).toBe('improving')
  })
})

// -- completedToday ------------------------------------------------------------

describe('completedToday', () => {
  let todayISO: string

  beforeEach(() => {
    todayISO = new Date().toISOString().slice(0, 10)
  })

  it('counts tasks completed today with taskType=task', () => {
    const pools = {
      nowPool: [
        makeTask({ status: 'completed', taskType: 'task', completedAt: `${todayISO}T09:00:00Z` }),
      ],
      nextPool: [
        makeTask({ status: 'completed', taskType: 'task', completedAt: `${todayISO}T11:00:00Z` }),
      ],
      somedayPool: [],
    }
    const profile = computeUserBehaviorProfile([], pools)
    expect(profile.completedToday).toBe(2)
  })

  it('excludes non-task types (reminders, ideas)', () => {
    const pools = {
      nowPool: [
        makeTask({ status: 'completed', taskType: 'reminder', completedAt: `${todayISO}T09:00:00Z` }),
        makeTask({ status: 'completed', taskType: 'idea', completedAt: `${todayISO}T09:00:00Z` }),
        makeTask({ status: 'completed', taskType: 'task', completedAt: `${todayISO}T09:00:00Z` }),
      ],
      nextPool: [],
      somedayPool: [],
    }
    const profile = computeUserBehaviorProfile([], pools)
    expect(profile.completedToday).toBe(1)
  })

  it('excludes tasks completed on a different day', () => {
    const pools = {
      nowPool: [
        makeTask({ status: 'completed', taskType: 'task', completedAt: '2026-03-28T09:00:00Z' }),
      ],
      nextPool: [],
      somedayPool: [],
    }
    const profile = computeUserBehaviorProfile([], pools)
    expect(profile.completedToday).toBe(0)
  })

  it('excludes active tasks', () => {
    const pools = {
      nowPool: [
        makeTask({ status: 'active', taskType: 'task', completedAt: `${todayISO}T09:00:00Z` }),
      ],
      nextPool: [],
      somedayPool: [],
    }
    const profile = computeUserBehaviorProfile([], pools)
    expect(profile.completedToday).toBe(0)
  })

  it('excludes tasks with null completedAt', () => {
    const pools = {
      nowPool: [
        makeTask({ status: 'completed', taskType: 'task', completedAt: undefined }),
      ],
      nextPool: [],
      somedayPool: [],
    }
    const profile = computeUserBehaviorProfile([], pools)
    expect(profile.completedToday).toBe(0)
  })
})

// -- recentStruggles -----------------------------------------------------------

describe('recentStruggles', () => {
  it('returns null when no struggle patterns', () => {
    // High flow rate, long sessions, no declining energy
    const sessions = Array.from({ length: 10 }, (_, i) =>
      makeSession({
        phase_reached: 'flow',
        duration_ms: 1_800_000, // 30 min
        energy_after: 4,
        started_at: new Date(Date.now() + i * 3_600_000).toISOString(),
      })
    )
    const profile = computeUserBehaviorProfile(sessions, emptyPools)
    expect(profile.recentStruggles).toBeNull()
  })

  it('includes struggle message when struggleDropRate > 0.5', () => {
    const sessions = Array.from({ length: 10 }, () =>
      makeSession({ phase_reached: 'struggle' })
    )
    const profile = computeUserBehaviorProfile(sessions, emptyPools)
    expect(profile.recentStruggles).toContain('ends sessions before reaching release')
  })

  it('includes short session message when avgSessionMinutes < 10 and > 0', () => {
    const sessions = [
      makeSession({ duration_ms: 300_000 }), // 5 min
      makeSession({ duration_ms: 420_000 }), // 7 min
    ]
    const profile = computeUserBehaviorProfile(sessions, emptyPools)
    expect(profile.recentStruggles).toContain('short')
  })

  it('includes low flow message when flowRate < 0.1 and totalSessions > 5', () => {
    const sessions = Array.from({ length: 6 }, (_, i) =>
      makeSession({ phase_reached: i === 0 ? 'struggle' : null })
    )
    // All null except one struggle → flowRate = 0 for sessions with phase data
    const profile = computeUserBehaviorProfile(sessions, emptyPools)
    expect(profile.flowRate).toBe(0)
    expect(profile.recentStruggles).toContain('deep flow')
  })

  it('includes energy declining message when energyTrend is declining', () => {
    const base = new Date('2026-03-20T10:00:00Z').getTime()
    const sessions = Array.from({ length: 10 }, (_, i) =>
      makeSession({
        started_at: new Date(base + i * 3_600_000).toISOString(),
        energy_after: i < 5 ? 5 : 1, // sharp decline
      })
    )
    const profile = computeUserBehaviorProfile(sessions, emptyPools)
    expect(profile.recentStruggles).toContain('declining')
  })

  it('combines multiple struggles with semicolons', () => {
    const base = new Date('2026-03-20T10:00:00Z').getTime()
    const sessions = Array.from({ length: 10 }, (_, i) =>
      makeSession({
        started_at: new Date(base + i * 3_600_000).toISOString(),
        phase_reached: 'struggle',
        duration_ms: 300_000, // 5 min
        energy_after: i < 5 ? 5 : 1, // declining
      })
    )
    const profile = computeUserBehaviorProfile(sessions, emptyPools)
    // Should contain multiple struggle messages separated by '; '
    expect(profile.recentStruggles).toContain('; ')
  })
})

// -- totalSessions -------------------------------------------------------------

describe('totalSessions', () => {
  it('returns total session count regardless of phase data', () => {
    const sessions = [
      makeSession({ phase_reached: null }),
      makeSession({ phase_reached: 'flow' }),
      makeSession({ phase_reached: 'struggle' }),
    ]
    const profile = computeUserBehaviorProfile(sessions, emptyPools)
    expect(profile.totalSessions).toBe(3)
  })
})
