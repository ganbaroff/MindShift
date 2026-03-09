import { describe, it, expect } from 'vitest'
import { cn } from '../cn'

describe('cn — classname utility', () => {
  it('joins two class names with a space', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('filters out false values', () => {
    // eslint-disable-next-line no-constant-binary-expression
    expect(cn('a', false && 'b', 'c')).toBe('a c')
  })

  it('filters out undefined', () => {
    expect(cn('a', undefined, 'b')).toBe('a b')
  })

  it('filters out empty strings', () => {
    expect(cn('a', '', 'b')).toBe('a b')
  })

  it('returns empty string when all args are falsy', () => {
    expect(cn(false, undefined, '')).toBe('')
  })

  it('handles single class', () => {
    expect(cn('only')).toBe('only')
  })

  it('handles no arguments', () => {
    expect(cn()).toBe('')
  })
})
