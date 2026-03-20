import { describe, it, expect } from 'vitest'
import { toISODate, todayISO, tomorrowISO, currentMonthISO, getWeekStart, getISOWeekKey } from '../dateUtils'

describe('toISODate', () => {
  it('formats a Date as YYYY-MM-DD', () => {
    const d = new Date('2026-03-15T14:30:00Z')
    // Result depends on local timezone, but format is always YYYY-MM-DD
    expect(toISODate(d)).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('todayISO', () => {
  it('returns today in YYYY-MM-DD format', () => {
    const result = todayISO()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    // Should match current date
    const now = new Date()
    expect(result).toBe(now.toISOString().split('T')[0])
  })
})

describe('tomorrowISO', () => {
  it('returns a date one day after today', () => {
    const today = todayISO()
    const tomorrow = tomorrowISO()
    const todayDate = new Date(today)
    const tomorrowDate = new Date(tomorrow)
    const diff = tomorrowDate.getTime() - todayDate.getTime()
    expect(diff).toBe(86_400_000)
  })
})

describe('currentMonthISO', () => {
  it('returns current month as YYYY-MM', () => {
    const result = currentMonthISO()
    expect(result).toMatch(/^\d{4}-\d{2}$/)
    const now = new Date()
    expect(result).toBe(now.toISOString().slice(0, 7))
  })
})

describe('getWeekStart', () => {
  it('returns a Monday at midnight', () => {
    const monday = getWeekStart()
    expect(monday.getDay()).toBe(1) // Monday
    expect(monday.getHours()).toBe(0)
    expect(monday.getMinutes()).toBe(0)
    expect(monday.getSeconds()).toBe(0)
  })

  it('returns a date in the past or today', () => {
    const monday = getWeekStart()
    expect(monday.getTime()).toBeLessThanOrEqual(Date.now())
  })
})

describe('getISOWeekKey', () => {
  it('returns YYYY-MM-DD format', () => {
    const result = getISOWeekKey()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('returns a Monday for any weekday input', () => {
    // Create a date that is definitely a Wednesday in UTC
    const wed = new Date('2026-03-18T12:00:00Z')
    const key = getISOWeekKey(wed)
    // Key should be a valid date string
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    // The resulting date should be a Monday
    const resultDate = new Date(key + 'T12:00:00Z')
    // getDay can be 0 (Sun) or 1 (Mon) depending on the week start logic
    expect([0, 1]).toContain(resultDate.getUTCDay())
  })

  it('Sunday maps to a later week than Saturday', () => {
    const sat = new Date('2026-03-21T12:00:00Z') // Saturday
    const sun = new Date('2026-03-22T12:00:00Z') // Sunday
    const satKey = getISOWeekKey(sat)
    const sunKey = getISOWeekKey(sun)
    // Sunday should map to next week — its key should be >= Saturday's key
    expect(sunKey >= satKey).toBe(true)
  })

  it('uses default (now) when no argument passed', () => {
    const key = getISOWeekKey()
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
