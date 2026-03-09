import { describe, it, expect } from 'vitest'
import {
  RECOVERY_THRESHOLD_HOURS,
  NOW_POOL_MAX,
  NEXT_POOL_MAX,
  PHASE_STRUGGLE_MINUTES,
  PHASE_RELEASE_MINUTES,
  MAX_SESSION_MINUTES,
  RECOVERY_LOCK_MINUTES,
  XP_BASE,
  XP_ENERGY_MULTIPLIER_LOW,
  XP_ENERGY_MULTIPLIER_HIGH,
  TIMER_PRESETS,
  AUDIO_DEFAULT_VOLUME,
  AUDIO_WARNING_VOLUME,
  AUDIO_HARD_LIMIT,
  NATURE_BUFFER_SECONDS,
  HPF_CUTOFF_HZ,
} from '../constants'

describe('constants — invariant sanity checks', () => {
  // ── Recovery
  it('recovery threshold is 72 hours — Research #7: RSD peaks at 3+ days', () => {
    expect(RECOVERY_THRESHOLD_HOURS).toBe(72)
  })

  // ── Task pools (ADHD capacity limits)
  it('now pool max is 3 — ADHD research limit', () => {
    expect(NOW_POOL_MAX).toBe(3)
  })

  it('next pool max is larger than now pool', () => {
    expect(NEXT_POOL_MAX).toBeGreaterThan(NOW_POOL_MAX)
  })

  // ── Focus phases (Research #2: neuroscience three-phase model)
  it('struggle phase ends at 7 minutes — attention ramp-up period', () => {
    expect(PHASE_STRUGGLE_MINUTES).toBe(7)
  })

  it('release/flow threshold is at 15 minutes', () => {
    expect(PHASE_RELEASE_MINUTES).toBe(15)
  })

  it('struggle < release — phases are ordered correctly', () => {
    expect(PHASE_STRUGGLE_MINUTES).toBeLessThan(PHASE_RELEASE_MINUTES)
  })

  it('max session is capped at 90 minutes (mandatory recovery after)', () => {
    expect(MAX_SESSION_MINUTES).toBe(90)
  })

  it('recovery lock is positive and shorter than max session', () => {
    expect(RECOVERY_LOCK_MINUTES).toBeGreaterThan(0)
    expect(RECOVERY_LOCK_MINUTES).toBeLessThan(MAX_SESSION_MINUTES)
  })

  // ── XP system
  it('XP base is positive', () => {
    expect(XP_BASE).toBeGreaterThan(0)
  })

  it('low-energy multiplier gives bonus (> 1.0)', () => {
    expect(XP_ENERGY_MULTIPLIER_LOW).toBeGreaterThan(1.0)
  })

  it('high-energy multiplier is less than low-energy multiplier', () => {
    expect(XP_ENERGY_MULTIPLIER_HIGH).toBeLessThan(XP_ENERGY_MULTIPLIER_LOW)
  })

  it('XP at low energy > XP at high energy for same task', () => {
    const task = { difficulty: 2 }
    const xpLow  = XP_BASE * task.difficulty * XP_ENERGY_MULTIPLIER_LOW
    const xpHigh = XP_BASE * task.difficulty * XP_ENERGY_MULTIPLIER_HIGH
    expect(xpLow).toBeGreaterThan(xpHigh)
  })

  // ── Timer
  it('timer presets include 25-minute Pomodoro', () => {
    expect(TIMER_PRESETS).toContain(25)
  })

  it('timer presets are sorted ascending', () => {
    const sorted = [...TIMER_PRESETS].sort((a, b) => a - b)
    expect([...TIMER_PRESETS]).toEqual(sorted)
  })

  it('all timer presets are within session max', () => {
    for (const p of TIMER_PRESETS) {
      expect(p).toBeLessThanOrEqual(MAX_SESSION_MINUTES)
    }
  })

  // ── Audio
  it('default volume is within 0–1 range', () => {
    expect(AUDIO_DEFAULT_VOLUME).toBeGreaterThan(0)
    expect(AUDIO_DEFAULT_VOLUME).toBeLessThan(AUDIO_HARD_LIMIT)
  })

  it('warning volume is above default (warns when too loud)', () => {
    expect(AUDIO_WARNING_VOLUME).toBeGreaterThan(AUDIO_DEFAULT_VOLUME)
  })

  it('hard limit is 1.0 — Gain API max safe value', () => {
    expect(AUDIO_HARD_LIMIT).toBeLessThanOrEqual(1.0)
  })

  it('nature buffer is 2 minutes (120 seconds)', () => {
    expect(NATURE_BUFFER_SECONDS).toBe(120)
  })

  it('HPF cutoff is 60 Hz — sub-bass protection', () => {
    expect(HPF_CUTOFF_HZ).toBe(60)
  })
})
