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

// -- formatBurnoutCell (render-layer em-dash policy, 2026-04-19) ---------------

import { formatBurnoutCell, EMPTY_BURNOUT_GLYPH } from '../burnout'

describe('formatBurnoutCell', () => {
  it('returns em-dash and a11y-empty key when score is undefined', () => {
    const r = formatBurnoutCell(undefined)
    expect(r.value).toBe(EMPTY_BURNOUT_GLYPH)
    expect(r.value).toBe('\u2014')
    expect(r.a11yKey).toBe('progress.burnoutScoreEmptyA11y')
    expect(r.isEmpty).toBe(true)
  })

  it('returns em-dash when score is NaN', () => {
    const r = formatBurnoutCell(NaN)
    expect(r.value).toBe(EMPTY_BURNOUT_GLYPH)
    expect(r.a11yKey).toBe('progress.burnoutScoreEmptyA11y')
    expect(r.isEmpty).toBe(true)
  })

  it('returns em-dash when score is Infinity', () => {
    const r = formatBurnoutCell(Infinity)
    expect(r.value).toBe(EMPTY_BURNOUT_GLYPH)
    expect(r.isEmpty).toBe(true)
  })

  it('returns em-dash when score is -Infinity', () => {
    const r = formatBurnoutCell(-Infinity)
    expect(r.value).toBe(EMPTY_BURNOUT_GLYPH)
    expect(r.isEmpty).toBe(true)
  })

  it('returns em-dash when score is null', () => {
    const r = formatBurnoutCell(null)
    expect(r.value).toBe(EMPTY_BURNOUT_GLYPH)
    expect(r.isEmpty).toBe(true)
  })

  it('returns em-dash when score is a non-number type', () => {
    expect(formatBurnoutCell('42').isEmpty).toBe(true)
    expect(formatBurnoutCell({} as unknown).isEmpty).toBe(true)
    expect(formatBurnoutCell([] as unknown).isEmpty).toBe(true)
  })

  it('returns numeric string and standard label for a real finite score', () => {
    const r = formatBurnoutCell(42)
    expect(r.value).toBe('42')
    expect(r.a11yKey).toBe('progress.burnoutScoreLabel')
    expect(r.isEmpty).toBe(false)
  })

  it('passes 0 through as a real score (0 is honest data, not absence)', () => {
    const r = formatBurnoutCell(0)
    expect(r.value).toBe('0')
    expect(r.a11yKey).toBe('progress.burnoutScoreLabel')
    expect(r.isEmpty).toBe(false)
  })

  it('rounds fractional scores to integer', () => {
    expect(formatBurnoutCell(7.5).value).toBe('8')
    expect(formatBurnoutCell(7.4).value).toBe('7')
    expect(formatBurnoutCell(99.9).value).toBe('100')
  })
})

// -- Locale a11y contract ------------------------------------------------------
//
// Asserts that each supported locale has a non-empty burnoutScoreEmptyA11y
// translation so screen readers never fall back to the key name or English.

import enTranslations from '@/locales/en.json'
import ruTranslations from '@/locales/ru.json'
import azTranslations from '@/locales/az.json'
import deTranslations from '@/locales/de.json'
import esTranslations from '@/locales/es.json'
import trTranslations from '@/locales/tr.json'

describe('burnoutScoreEmptyA11y — i18n coverage', () => {
  const locales: Array<[string, { progress?: { burnoutScoreEmptyA11y?: string } }]> = [
    ['en', enTranslations],
    ['ru', ruTranslations],
    ['az', azTranslations],
    ['de', deTranslations],
    ['es', esTranslations],
    ['tr', trTranslations],
  ]

  for (const [locale, dict] of locales) {
    it(`${locale} has progress.burnoutScoreEmptyA11y`, () => {
      const value = dict.progress?.burnoutScoreEmptyA11y
      expect(value, `missing a11y translation for locale=${locale}`).toBeTruthy()
      expect(typeof value).toBe('string')
      expect(String(value).length).toBeGreaterThan(8)
    })
  }
})
