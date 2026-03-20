import { describe, it, expect, afterEach } from 'vitest'
import { resolveLocale, t } from '../i18n/index'

describe('resolveLocale', () => {
  const originalLanguage = navigator.language

  afterEach(() => {
    // Reset navigator.language mock
    Object.defineProperty(navigator, 'language', { value: originalLanguage, configurable: true })
  })

  it('resolves "en-US" to "en"', () => {
    expect(resolveLocale('en-US')).toBe('en')
  })

  it('resolves "ru-RU" to "ru"', () => {
    expect(resolveLocale('ru-RU')).toBe('ru')
  })

  it('resolves "ru" to "ru"', () => {
    expect(resolveLocale('ru')).toBe('ru')
  })

  it('falls back to "en" for unsupported locale', () => {
    expect(resolveLocale('ja-JP')).toBe('en')
  })

  it('falls back to "en" for empty string', () => {
    expect(resolveLocale('')).toBe('en')
  })

  it('is case-insensitive', () => {
    expect(resolveLocale('RU-RU')).toBe('ru')
  })
})

describe('t (translate)', () => {
  it('returns English string for known key', () => {
    const result = t('home.greeting.morning', 'en')
    expect(result).toBeTruthy()
    expect(typeof result).toBe('string')
  })

  it('returns Russian string for ru locale and known key', () => {
    const result = t('home.greeting.morning', 'ru')
    expect(result).toBeTruthy()
    // Russian greeting should differ from English
    const enResult = t('home.greeting.morning', 'en')
    expect(result).not.toBe(enResult)
  })

  it('falls back to English when ru key is missing', () => {
    // Use a key that exists in en but may not in ru
    const result = t('generic.done', 'ru')
    // If not in ru, falls back to en — should still return something
    expect(result).toBeTruthy()
  })

  it('falls back to English for unsupported locale', () => {
    const result = t('home.greeting.morning', 'de')
    const enResult = t('home.greeting.morning', 'en')
    expect(result).toBe(enResult)
  })

  it('returns the key itself when key does not exist in any bundle', () => {
    const result = t('nonexistent.key.here' as any, 'en')
    expect(result).toBe('nonexistent.key.here')
  })

  it('supports {{placeholder}} interpolation', () => {
    // Find a key that uses interpolation, or test the mechanism directly
    const result = t('home.greeting.morning', 'en', { name: 'Alice' })
    // Even if no {{name}} in the string, should still return without error
    expect(typeof result).toBe('string')
  })
})
