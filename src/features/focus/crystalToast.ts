/**
 * Crystal-earned toast (EGAP-5 first cross-face moment, 2026-04-19)
 *
 * Pure function that decides whether to fire the "AURA charged" toast after
 * a focus session completes. Extracted from useFocusSession so the branching
 * can be unit-tested without rendering the entire hook tree.
 *
 * Atlas is NOT the subject of the toast copy per the v0Laura vision:
 * Atlas is felt, not named. VOLAURA is named as the destination because
 * the user brand-recognizes it.
 *
 * Dual-accent border (MindShift left, VOLAURA right) realizes DESIGN-MANIFESTO
 * Principle 4 "Cross-Face Moments Are First-Class" — the only cross-face
 * moment shipped in v1.0, earning its Principle 4 keep.
 */

import type { toast as SonnerToast } from 'sonner'

/** Minimal i18n surface we need — mirrors i18next's t() API. */
export interface CrystalToastI18n {
  t: (key: string, options?: { count?: number }) => string
}

/** Minimal toast surface we need — mirrors sonner's toast.success signature. */
export type CrystalToastFn = (
  headline: string,
  options: {
    description: string
    action: { label: string; onClick: () => void }
    duration: number
    style: Record<string, string>
  },
) => void

/** Default navigation target when the user taps the toast action. */
export const CRYSTAL_TOAST_DEEP_LINK = 'https://volaura.app/aura'

/**
 * Fire the crystal-earned toast if and only if the VOLAURA bridge
 * confirmed the crystal landed (`ok === true`) AND the amount is positive.
 *
 * Returns `true` if the toast fired, `false` otherwise. The boolean is used
 * only by tests; callers in production ignore it.
 */
export function maybeShowCrystalToast(
  ok: boolean,
  crystals: number,
  i18n: CrystalToastI18n,
  toastFn: CrystalToastFn,
  openLink: (url: string) => void = (url) => {
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener')
    }
  },
): boolean {
  if (!ok) return false
  if (crystals <= 0) return false
  if (!Number.isFinite(crystals)) return false

  toastFn(i18n.t('focus.crystalsEarnedHeadline', { count: crystals }), {
    description: i18n.t('focus.crystalsEarnedDesc'),
    action: {
      label: i18n.t('focus.crystalsEarnedCta'),
      onClick: () => openLink(CRYSTAL_TOAST_DEEP_LINK),
    },
    duration: 5000,
    style: {
      background:
        'linear-gradient(90deg, rgba(123,114,255,0.15), rgba(108,99,255,0.15))',
      borderLeft: '3px solid var(--color-face-accent)',
      borderRight: '3px solid #6C63FF',
    },
  })

  return true
}

/** Production wiring helper: binds the real sonner `toast.success` to our signature. */
export function buildCrystalToastFn(
  success: typeof SonnerToast.success,
): CrystalToastFn {
  return (headline, options) => {
    success(headline, options)
  }
}
