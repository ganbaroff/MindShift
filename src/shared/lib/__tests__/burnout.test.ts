import { describe, it, expect } from 'vitest'
import { computeBurnoutScore, getBurnoutTier, deriveBehaviors } from '../burnout'

// -- computeBurnoutScore ------------------------------------------------------

describe('computeBurnoutScore', () => {
  it('returns 0 for all-zero inputs', () => {
    expect(computeBurnoutScore({
      snoozeRatio: 0, completionDecay: 0, sessionDecay: 0, energyDecay: 0,
    })).toBe(0)
  })

  it('returns 100 for all-maxed inputs', () => {
    expect(computeBurnoutScore({
      snoozeRatio: 1, completionDecay: 1, sessionDecay: 1, energyDecay: 1,
    })).toBe(100)
  })

  it('clamps values above 1', () => {
    expect(computeBurnoutScore({
      snoozeRatio: 2, completionDecay: 3, sessionDecay: 5, energyDecay: 10,
    })).toBe(100)
  })

  it('clamps negative values to 0', () => {
    expect(computeBurnoutScore({
      snoozeRatio: -1, completionDecay: -0.5, sessionDecay: -2, energyDecay: -1,
    })).toBe(0)
  })

  it('weights correctly (snooze 30%, completion 30%, session 25%, energy 15%)', () => {
    // Only snooze at 1.0 → 0.30 * 100 = 30
    expect(computeBurnoutScore({
      snoozeRatio: 1, completionDecay: 0, sessionDecay: 0, energyDecay: 0,
    })).toBe(30)

    // Only completion at 1.0 → 0.30 * 100 = 30
    expect(computeBurnoutScore({
      snoozeRatio: 0, completionDecay: 1, sessionDecay: 0, energyDecay: 0,
    })).toBe(30)

    // Only session at 1.0 → 0.25 * 100 = 25
    expect(computeBurnoutScore({
      snoozeRatio: 0, completionDecay: 0, sessionDecay: 1, energyDecay: 0,
    })).toBe(25)

    // Only energy at 1.0 → 0.15 * 100 = 15
    expect(computeBurnoutScore({
      snoozeRatio: 0, completionDecay: 0, sessionDecay: 0, energyDecay: 1,
    })).toBe(15)
  })

  it('rounds to nearest integer', () => {
    // 0.5 * 0.30 = 0.15 → 15
    expect(computeBurnoutScore({
      snoozeRatio: 0.5, completionDecay: 0, sessionDecay: 0, energyDecay: 0,
    })).toBe(15)
  })
})

// -- getBurnoutTier -----------------------------------------------------------

describe('getBurnoutTier', () => {
  it('returns healthy for score 0', () => {
    expect(getBurnoutTier(0)).toBe('healthy')
  })

  it('returns healthy for score 40 (boundary)', () => {
    expect(getBurnoutTier(40)).toBe('healthy')
  })

  it('returns caution for score 41', () => {
    expect(getBurnoutTier(41)).toBe('caution')
  })

  it('returns caution for score 65 (boundary)', () => {
    expect(getBurnoutTier(65)).toBe('caution')
  })

  it('returns burnout for score 66', () => {
    expect(getBurnoutTier(66)).toBe('burnout')
  })

  it('returns burnout for score 100', () => {
    expect(getBurnoutTier(100)).toBe('burnout')
  })
})

// -- deriveBehaviors ----------------------------------------------------------

describe('deriveBehaviors', () => {
  it('returns all zeros when no activity', () => {
    const result = deriveBehaviors({
      snoozedCount: 0, activeCount: 0,
      recentCompletedPerDay: 0, avgCompletedPerDay: 0,
      recentSessionMinutes: 0, avgSessionMinutes: 0,
      recentAvgEnergy: 0,
    })
    expect(result.snoozeRatio).toBe(0)
    expect(result.completionDecay).toBe(0)
    expect(result.sessionDecay).toBe(0)
    expect(result.energyDecay).toBe(0)
  })

  it('computes snoozeRatio correctly', () => {
    const result = deriveBehaviors({
      snoozedCount: 3, activeCount: 10,
      recentCompletedPerDay: 0, avgCompletedPerDay: 0,
      recentSessionMinutes: 0, avgSessionMinutes: 0,
      recentAvgEnergy: 0,
    })
    expect(result.snoozeRatio).toBeCloseTo(0.3)
  })

  it('computes completionDecay when recent drops vs average', () => {
    const result = deriveBehaviors({
      snoozedCount: 0, activeCount: 5,
      recentCompletedPerDay: 1, avgCompletedPerDay: 4,  // 75% drop
      recentSessionMinutes: 30, avgSessionMinutes: 30,
      recentAvgEnergy: 3,
    })
    expect(result.completionDecay).toBeCloseTo(0.75)
  })

  it('computes sessionDecay when recent drops vs average', () => {
    const result = deriveBehaviors({
      snoozedCount: 0, activeCount: 5,
      recentCompletedPerDay: 2, avgCompletedPerDay: 2,
      recentSessionMinutes: 10, avgSessionMinutes: 40,  // 75% drop
      recentAvgEnergy: 3,
    })
    expect(result.sessionDecay).toBeCloseTo(0.75)
  })

  it('computes energyDecay: energy 1 = max decay, energy 5 = no decay', () => {
    const lowEnergy = deriveBehaviors({
      snoozedCount: 0, activeCount: 5,
      recentCompletedPerDay: 2, avgCompletedPerDay: 2,
      recentSessionMinutes: 30, avgSessionMinutes: 30,
      recentAvgEnergy: 1,
    })
    expect(lowEnergy.energyDecay).toBe(1)

    const highEnergy = deriveBehaviors({
      snoozedCount: 0, activeCount: 5,
      recentCompletedPerDay: 2, avgCompletedPerDay: 2,
      recentSessionMinutes: 30, avgSessionMinutes: 30,
      recentAvgEnergy: 5,
    })
    expect(highEnergy.energyDecay).toBe(0)
  })

  it('completionDecay never goes negative (recent > avg)', () => {
    const result = deriveBehaviors({
      snoozedCount: 0, activeCount: 5,
      recentCompletedPerDay: 5, avgCompletedPerDay: 2,  // improving
      recentSessionMinutes: 30, avgSessionMinutes: 30,
      recentAvgEnergy: 3,
    })
    expect(result.completionDecay).toBe(0)
  })
})
