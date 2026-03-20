import { describe, it, expect } from 'vitest'
import { getNowPoolMax, APP_MODE_CONFIG, SEASONAL_MODE_CONFIG } from '../constants'
import type { SeasonalMode } from '../constants'

describe('getNowPoolMax', () => {
  // Default app mode pool limits
  it('returns 3 for minimal mode (default)', () => {
    expect(getNowPoolMax('minimal', 'maintain')).toBe(3)
  })

  it('returns 3 for habit mode (default)', () => {
    expect(getNowPoolMax('habit', 'maintain')).toBe(3)
  })

  it('returns 5 for system mode (default)', () => {
    expect(getNowPoolMax('system', 'maintain')).toBe(5)
  })

  // Seasonal overrides
  it('launch mode overrides to 5 regardless of appMode', () => {
    expect(getNowPoolMax('minimal', 'launch')).toBe(5)
    expect(getNowPoolMax('habit', 'launch')).toBe(5)
    expect(getNowPoolMax('system', 'launch')).toBe(5)
  })

  it('recover mode overrides to 2 regardless of appMode', () => {
    expect(getNowPoolMax('minimal', 'recover')).toBe(2)
    expect(getNowPoolMax('habit', 'recover')).toBe(2)
    expect(getNowPoolMax('system', 'recover')).toBe(2)
  })

  it('maintain mode defers to appMode (null override)', () => {
    expect(SEASONAL_MODE_CONFIG.maintain.nowPoolMaxOverride).toBeNull()
    expect(getNowPoolMax('minimal', 'maintain')).toBe(APP_MODE_CONFIG.minimal.nowPoolMax)
    expect(getNowPoolMax('system', 'maintain')).toBe(APP_MODE_CONFIG.system.nowPoolMax)
  })

  it('sandbox mode defers to appMode (null override)', () => {
    expect(SEASONAL_MODE_CONFIG.sandbox.nowPoolMaxOverride).toBeNull()
    expect(getNowPoolMax('minimal', 'sandbox')).toBe(APP_MODE_CONFIG.minimal.nowPoolMax)
    expect(getNowPoolMax('system', 'sandbox')).toBe(APP_MODE_CONFIG.system.nowPoolMax)
  })

  // Exhaustive matrix — every combination
  it('handles all 12 combinations (3 modes × 4 seasons)', () => {
    const modes = ['minimal', 'habit', 'system'] as const
    const seasons: SeasonalMode[] = ['launch', 'maintain', 'recover', 'sandbox']

    for (const mode of modes) {
      for (const season of seasons) {
        const result = getNowPoolMax(mode, season)
        expect(result).toBeGreaterThanOrEqual(2)
        expect(result).toBeLessThanOrEqual(5)
      }
    }
  })
})
