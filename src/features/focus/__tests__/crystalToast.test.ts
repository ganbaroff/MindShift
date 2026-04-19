/**
 * Unit tests for the EGAP-5 crystal-earned toast branching (2026-04-19).
 *
 * Covers Design-Atlas REV2 Track 3 Step 4 guards:
 *   • Fires on (ok=true, crystals>0).
 *   • Silent on (ok=false, _).
 *   • Silent on (_, crystals=0).
 *   • Silent on (_, crystals<0) and (_, NaN) — defensive, don't lie about
 *     nothing landing in AURA.
 *   • Deep-link opens the VOLAURA AURA page.
 *   • i18n keys passed through with count for pluralization.
 *   • Dual-accent border + gradient applied per Manifesto Principle 4.
 */

import { describe, it, expect, vi } from 'vitest'
import {
  maybeShowCrystalToast,
  CRYSTAL_TOAST_DEEP_LINK,
  type CrystalToastI18n,
  type CrystalToastFn,
} from '../crystalToast'

function buildI18n(): CrystalToastI18n {
  return {
    t: vi.fn((key: string, opts?: { count?: number }) => {
      if (opts && typeof opts.count === 'number') {
        return `${key}[count=${opts.count}]`
      }
      return key
    }),
  }
}

describe('maybeShowCrystalToast', () => {
  it('fires when ok=true and crystals>0', () => {
    const toastFn = vi.fn()
    const i18n = buildI18n()
    const fired = maybeShowCrystalToast(true, 30, i18n, toastFn as unknown as CrystalToastFn)

    expect(fired).toBe(true)
    expect(toastFn).toHaveBeenCalledTimes(1)
    expect(i18n.t).toHaveBeenCalledWith('focus.crystalsEarnedHeadline', { count: 30 })
    expect(i18n.t).toHaveBeenCalledWith('focus.crystalsEarnedDesc')
    expect(i18n.t).toHaveBeenCalledWith('focus.crystalsEarnedCta')
  })

  it('is silent when ok=false (crystal did not land in AURA)', () => {
    const toastFn = vi.fn()
    const fired = maybeShowCrystalToast(false, 30, buildI18n(), toastFn as unknown as CrystalToastFn)

    expect(fired).toBe(false)
    expect(toastFn).not.toHaveBeenCalled()
  })

  it('is silent when crystals=0 (nothing to celebrate)', () => {
    const toastFn = vi.fn()
    const fired = maybeShowCrystalToast(true, 0, buildI18n(), toastFn as unknown as CrystalToastFn)

    expect(fired).toBe(false)
    expect(toastFn).not.toHaveBeenCalled()
  })

  it('is silent when crystals<0 (defensive — bad data should never toast)', () => {
    const toastFn = vi.fn()
    const fired = maybeShowCrystalToast(true, -5, buildI18n(), toastFn as unknown as CrystalToastFn)

    expect(fired).toBe(false)
    expect(toastFn).not.toHaveBeenCalled()
  })

  it('is silent when crystals is NaN (defensive)', () => {
    const toastFn = vi.fn()
    const fired = maybeShowCrystalToast(true, NaN, buildI18n(), toastFn as unknown as CrystalToastFn)

    expect(fired).toBe(false)
    expect(toastFn).not.toHaveBeenCalled()
  })

  it('dual-accent border present on the fired toast (Manifesto Principle 4)', () => {
    const toastFn = vi.fn()
    maybeShowCrystalToast(true, 15, buildI18n(), toastFn as unknown as CrystalToastFn)

    const options = toastFn.mock.calls[0][1] as {
      style: Record<string, string>
    }
    expect(options.style.borderLeft).toContain('var(--color-face-accent)')
    expect(options.style.borderRight).toContain('#6C63FF')
    expect(options.style.background).toContain('linear-gradient')
  })

  it('action.onClick opens the VOLAURA AURA deep-link', () => {
    const toastFn = vi.fn()
    const openLink = vi.fn()
    maybeShowCrystalToast(
      true,
      10,
      buildI18n(),
      toastFn as unknown as CrystalToastFn,
      openLink,
    )

    const options = toastFn.mock.calls[0][1] as {
      action: { onClick: () => void }
    }
    options.action.onClick()

    expect(openLink).toHaveBeenCalledWith(CRYSTAL_TOAST_DEEP_LINK)
    expect(CRYSTAL_TOAST_DEEP_LINK).toBe('https://volaura.app/aura')
  })

  it('duration is 5000ms (matches Design-Atlas spec)', () => {
    const toastFn = vi.fn()
    maybeShowCrystalToast(true, 10, buildI18n(), toastFn as unknown as CrystalToastFn)

    const options = toastFn.mock.calls[0][1] as { duration: number }
    expect(options.duration).toBe(5000)
  })
})
