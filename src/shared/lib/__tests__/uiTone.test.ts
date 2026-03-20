import { describe, it, expect } from 'vitest'
import { deriveUITone, getToneCopy, getDensity } from '../uiTone'
import type { UITone } from '../uiTone'

describe('deriveUITone', () => {
  // Gen Z detection
  it('returns gen_z for minimal + high emotional reactivity', () => {
    expect(deriveUITone('minimal', 'high', null)).toBe('gen_z')
  })

  it('returns gen_z for minimal + often time-blind + launch mode', () => {
    expect(deriveUITone('minimal', null, 'often', null, 'launch')).toBe('gen_z')
  })

  // Millennial detection
  it('returns millennial for system + rarely time-blind', () => {
    expect(deriveUITone('system', null, 'rarely')).toBe('millennial')
  })

  it('returns millennial for system + achiever psychotype', () => {
    expect(deriveUITone('system', null, null, 'achiever')).toBe('millennial')
  })

  it('returns millennial for system + planner psychotype', () => {
    expect(deriveUITone('system', null, null, 'planner')).toBe('millennial')
  })

  // Gen X detection
  it('returns gen_x for habit + steady emotional reactivity', () => {
    expect(deriveUITone('habit', 'steady', null)).toBe('gen_x')
  })

  it('returns gen_x for habit + maintain seasonal mode', () => {
    expect(deriveUITone('habit', null, null, null, 'maintain')).toBe('gen_x')
  })

  it('returns gen_x for habit + recover seasonal mode', () => {
    expect(deriveUITone('habit', null, null, null, 'recover')).toBe('gen_x')
  })

  // Neutral fallback
  it('returns neutral when no signals match', () => {
    expect(deriveUITone('minimal', null, null)).toBe('neutral')
  })

  it('returns neutral for unrecognized combinations', () => {
    expect(deriveUITone('system', 'high', 'often')).toBe('neutral')
  })
})

describe('getToneCopy', () => {
  const tones: UITone[] = ['gen_z', 'millennial', 'gen_x', 'neutral']

  tones.forEach(tone => {
    it(`returns copy object for ${tone}`, () => {
      const copy = getToneCopy(tone)
      expect(copy).toBeDefined()
      expect(typeof copy.mochiHey).toBe('string')
      expect(typeof copy.mochiGreat).toBe('string')
      expect(typeof copy.badgeUnlocked).toBe('function')
      expect(typeof copy.streakGoing).toBe('function')
    })
  })

  it('badgeUnlocked returns name in the string', () => {
    const copy = getToneCopy('gen_z')
    expect(copy.badgeUnlocked('First Seed')).toContain('First Seed')
  })

  it('streakGoing includes the day count', () => {
    const copy = getToneCopy('millennial')
    expect(copy.streakGoing(5)).toContain('5')
  })
})

describe('getDensity', () => {
  it('returns compact for gen_z', () => {
    expect(getDensity('gen_z')).toBe('compact')
  })

  it('returns rich for millennial', () => {
    expect(getDensity('millennial')).toBe('rich')
  })

  it('returns normal for gen_x', () => {
    expect(getDensity('gen_x')).toBe('normal')
  })

  it('returns normal for neutral', () => {
    expect(getDensity('neutral')).toBe('normal')
  })
})
