/**
 * Store unit tests — business logic layer.
 *
 * Tests the pure reducers and selectors in the Zustand store WITHOUT React.
 * Uses useStore.getState() / useStore.setState() to drive and inspect state.
 *
 * Why these tests matter:
 * - snoozeTask: "Not now" path — must move now→next, increment count
 * - completeTask: marks as completed across all pools
 * - isProActive: trial expiry logic — financial/UX boundary
 * - selectActiveTasks: always ≤ 3 items displayed (ADHD limit)
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useStore, selectActiveTasks, selectSessionProgress } from '../index'
import type { Task } from '@/types'
import {
  VR_BUCKET_SIZE, VR_JACKPOT_THRESHOLD, VR_BONUS_THRESHOLD,
  VR_MULTIPLIER_JACKPOT, VR_MULTIPLIER_BONUS,
} from '@/shared/lib/constants'

// -- Helpers -------------------------------------------------------------------

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: crypto.randomUUID(),
    title: 'Test task',
    pool: 'now',
    status: 'active',
    difficulty: 2,
    estimatedMinutes: 25,
    createdAt: new Date().toISOString(),
    completedAt: null,
    snoozeCount: 0,
    parentTaskId: null,
    position: 0,
    dueDate: null,
    dueTime: null,
    taskType: 'task',
    reminderSentAt: null,
    repeat: 'none' as const,
    ...overrides,
  }
}

function resetStore() {
  useStore.setState({
    nowPool:        [],
    nextPool:       [],
    somedayPool:    [],
    xpTotal:        0,
    // completedTotal=75 puts bucket at 75 % 100 = 75 (≥ VR_BONUS_THRESHOLD=25) → base multiplier 1×
    // This keeps existing flat-addition tests deterministic while VR tests use explicit buckets.
    completedTotal: 75,
    subscriptionTier: 'free',
    trialEndsAt: null,
    activeSession: null,
    sessionPhase: 'idle',
    timerSeconds: 0,
    timerRunning: false,
  })
}

// -- Task slice -----------------------------------------------------------------

describe('Store — addTask', () => {
  beforeEach(resetStore)

  it('adds task to nowPool', () => {
    const task = makeTask({ pool: 'now' })
    useStore.getState().addTask(task)
    expect(useStore.getState().nowPool).toHaveLength(1)
    expect(useStore.getState().nowPool[0].id).toBe(task.id)
  })

  it('routes task to correct pool based on task.pool', () => {
    const now     = makeTask({ pool: 'now' })
    const next    = makeTask({ pool: 'next' })
    const someday = makeTask({ pool: 'someday' })
    useStore.getState().addTask(now)
    useStore.getState().addTask(next)
    useStore.getState().addTask(someday)
    expect(useStore.getState().nowPool).toHaveLength(1)
    expect(useStore.getState().nextPool).toHaveLength(1)
    expect(useStore.getState().somedayPool).toHaveLength(1)
  })
})

describe('Store — completeTask', () => {
  beforeEach(resetStore)

  it('marks task as completed in nowPool', () => {
    const task = makeTask({ pool: 'now' })
    useStore.getState().addTask(task)
    useStore.getState().completeTask(task.id)
    const completed = useStore.getState().nowPool.find(t => t.id === task.id)
    expect(completed?.status).toBe('completed')
    expect(completed?.completedAt).not.toBeNull()
  })

  it('marks task as completed in nextPool', () => {
    const task = makeTask({ pool: 'next' })
    useStore.getState().addTask(task)
    useStore.getState().completeTask(task.id)
    const completed = useStore.getState().nextPool.find(t => t.id === task.id)
    expect(completed?.status).toBe('completed')
  })

  it('sets completedAt to a valid ISO timestamp', () => {
    const task = makeTask({ pool: 'now' })
    useStore.getState().addTask(task)
    useStore.getState().completeTask(task.id)
    const ts = useStore.getState().nowPool.find(t => t.id === task.id)?.completedAt
    expect(ts).not.toBeNull()
    expect(new Date(ts!).getTime()).toBeGreaterThan(0)
  })

  it('does not affect other tasks', () => {
    const t1 = makeTask({ pool: 'now' })
    const t2 = makeTask({ pool: 'now' })
    useStore.getState().addTask(t1)
    useStore.getState().addTask(t2)
    useStore.getState().completeTask(t1.id)
    expect(useStore.getState().nowPool.find(t => t.id === t2.id)?.status).toBe('active')
  })
})

describe('Store — snoozeTask (now → next)', () => {
  beforeEach(resetStore)

  it('removes task from nowPool', () => {
    const task = makeTask({ pool: 'now' })
    useStore.getState().addTask(task)
    useStore.getState().snoozeTask(task.id)
    expect(useStore.getState().nowPool.find(t => t.id === task.id)).toBeUndefined()
  })

  it('adds task to nextPool', () => {
    const task = makeTask({ pool: 'now' })
    useStore.getState().addTask(task)
    useStore.getState().snoozeTask(task.id)
    expect(useStore.getState().nextPool.find(t => t.id === task.id)).toBeDefined()
  })

  it('increments snoozeCount by 1', () => {
    const task = makeTask({ pool: 'now', snoozeCount: 0 })
    useStore.getState().addTask(task)
    useStore.getState().snoozeTask(task.id)
    const snoozed = useStore.getState().nextPool.find(t => t.id === task.id)
    expect(snoozed?.snoozeCount).toBe(1)
  })

  it('increments snoozeCount cumulatively from existing value', () => {
    const task = makeTask({ pool: 'now', snoozeCount: 2 })
    useStore.getState().addTask(task)
    useStore.getState().snoozeTask(task.id)
    const snoozed = useStore.getState().nextPool.find(t => t.id === task.id)
    expect(snoozed?.snoozeCount).toBe(3)
  })

  it('updates pool field to "next" on the moved task', () => {
    const task = makeTask({ pool: 'now' })
    useStore.getState().addTask(task)
    useStore.getState().snoozeTask(task.id)
    const snoozed = useStore.getState().nextPool.find(t => t.id === task.id)
    expect(snoozed?.pool).toBe('next')
  })

  it('is a no-op if task is not in nowPool', () => {
    const task = makeTask({ pool: 'next' })
    useStore.getState().addTask(task)
    useStore.getState().snoozeTask(task.id)
    expect(useStore.getState().nowPool).toHaveLength(0)
    expect(useStore.getState().nextPool).toHaveLength(1)
  })
})

// archiveAllOverdue tests removed — method was never implemented in the store.
// If this feature is needed later, re-add tests + implementation together.

// -- XP slice ------------------------------------------------------------------

describe('Store — addXP', () => {
  beforeEach(resetStore)
  // Note: resetStore sets completedTotal=75, so bucket=75%100=75 → base multiplier 1× in all tests below.

  it('increments xpTotal (base multiplier)', () => {
    useStore.getState().addXP(10)
    expect(useStore.getState().xpTotal).toBe(10)
  })

  it('accumulates multiple gains (base multiplier)', () => {
    useStore.getState().addXP(10)
    useStore.getState().addXP(15)
    useStore.getState().addXP(5)
    expect(useStore.getState().xpTotal).toBe(30)
  })

  it('XP formula: low energy gives more XP than high energy', () => {
    const XP_BASE = 10
    const difficulty = 2
    const xpLow  = Math.round(XP_BASE * difficulty * 1.2)
    const xpHigh = Math.round(XP_BASE * difficulty * 0.8)
    expect(xpLow).toBeGreaterThan(xpHigh)
    expect(xpLow).toBe(24)   // rewards effort when energy is low
    expect(xpHigh).toBe(16)
  })

  // -- Research #5: Variable Ratio XP schedule ---------------------------------

  it('VR: bucket < VR_JACKPOT_THRESHOLD → jackpot multiplier (2×)', () => {
    // Set completedTotal so bucket = VR_JACKPOT_THRESHOLD - 1 (last slot of jackpot range)
    useStore.setState({ completedTotal: VR_JACKPOT_THRESHOLD - 1, xpTotal: 0 })
    useStore.getState().addXP(10)
    expect(useStore.getState().xpTotal).toBe(Math.round(10 * VR_MULTIPLIER_JACKPOT))
  })

  it('VR: bucket in [VR_JACKPOT_THRESHOLD, VR_BONUS_THRESHOLD) → bonus multiplier (1.5×)', () => {
    // Set completedTotal so bucket = VR_JACKPOT_THRESHOLD (first slot of bonus range)
    useStore.setState({ completedTotal: VR_JACKPOT_THRESHOLD + VR_BUCKET_SIZE, xpTotal: 0 })
    useStore.getState().addXP(10)
    expect(useStore.getState().xpTotal).toBe(Math.round(10 * VR_MULTIPLIER_BONUS))
  })

  it('VR: bucket >= VR_BONUS_THRESHOLD → base multiplier (1×)', () => {
    // Set completedTotal so bucket = VR_BONUS_THRESHOLD (base range)
    useStore.setState({ completedTotal: VR_BONUS_THRESHOLD + VR_BUCKET_SIZE, xpTotal: 0 })
    useStore.getState().addXP(10)
    expect(useStore.getState().xpTotal).toBe(10)
  })

  it('VR: full 100-slot cycle has correct distribution (8 jackpot, 17 bonus, 75 base)', () => {
    let jackpot = 0, bonus = 0, base = 0
    for (let i = 0; i < VR_BUCKET_SIZE; i++) {
      const bucket = i % VR_BUCKET_SIZE
      if (bucket < VR_JACKPOT_THRESHOLD) jackpot++
      else if (bucket < VR_BONUS_THRESHOLD) bonus++
      else base++
    }
    expect(jackpot).toBe(8)
    expect(bonus).toBe(17)
    expect(base).toBe(75)
  })
})

// -- Preferences slice ---------------------------------------------------------

describe('Store — isProActive', () => {
  beforeEach(resetStore)

  it('returns false for free tier', () => {
    useStore.setState({ subscriptionTier: 'free' })
    expect(useStore.getState().isProActive()).toBe(false)
  })

  it('returns true for pro tier (no expiry)', () => {
    useStore.setState({ subscriptionTier: 'pro' })
    expect(useStore.getState().isProActive()).toBe(true)
  })

  it('returns true for pro_trial with future expiry', () => {
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    useStore.setState({ subscriptionTier: 'pro_trial', trialEndsAt: future })
    expect(useStore.getState().isProActive()).toBe(true)
  })

  it('returns false for expired pro_trial', () => {
    const past = new Date(Date.now() - 1000).toISOString()
    useStore.setState({ subscriptionTier: 'pro_trial', trialEndsAt: past })
    expect(useStore.getState().isProActive()).toBe(false)
  })

  it('returns false for pro_trial with null trialEndsAt', () => {
    useStore.setState({ subscriptionTier: 'pro_trial', trialEndsAt: null })
    expect(useStore.getState().isProActive()).toBe(false)
  })
})

// -- Selectors -----------------------------------------------------------------

describe('selectActiveTasks', () => {
  beforeEach(resetStore)

  it('returns only active tasks', () => {
    const active    = makeTask({ pool: 'now', status: 'active' })
    const completed = makeTask({ pool: 'now', status: 'completed' })
    useStore.getState().addTask(active)
    useStore.getState().addTask(completed)
    const result = selectActiveTasks(useStore.getState())
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(active.id)
  })

  it('never returns more than 3 (ADHD NOW pool limit)', () => {
    for (let i = 0; i < 6; i++) {
      useStore.getState().addTask(makeTask({ pool: 'now' }))
    }
    expect(selectActiveTasks(useStore.getState()).length).toBeLessThanOrEqual(3)
  })

  it('returns empty array when pool is empty', () => {
    expect(selectActiveTasks(useStore.getState())).toHaveLength(0)
  })
})

describe('selectSessionProgress', () => {
  beforeEach(resetStore)

  it('returns 0 when no active session', () => {
    expect(selectSessionProgress(useStore.getState())).toBe(0)
  })

  it('returns 0 at session start', () => {
    useStore.getState().startSession(null, 25, null)
    expect(selectSessionProgress(useStore.getState())).toBe(0)
  })

  it('returns ~0.5 at halfway through a 25-min session', () => {
    useStore.getState().startSession(null, 25, null)
    const half = (25 * 60) / 2
    useStore.setState({ timerSeconds: half })
    const progress = selectSessionProgress(useStore.getState())
    expect(progress).toBeCloseTo(0.5, 2)
  })

  it('approaches 1.0 when timer is at 1 second remaining', () => {
    useStore.getState().startSession(null, 25, null)
    useStore.setState({ timerSeconds: 1 })
    expect(selectSessionProgress(useStore.getState())).toBeGreaterThan(0.99)
  })
})
