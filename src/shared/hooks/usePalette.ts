/**
 * usePalette — Research #8: Color Psychology for ADHD
 *
 * Returns semantic color tokens, desaturated when reducedStimulation is active.
 *
 * Calm Mode rules (§6):
 *   - Desaturate accent colors → low-arousal pastels
 *   - Remove glow/shadow effects (glowAlpha → 0)
 *   - Maintain legibility — contrast ratios stay WCAG AA compliant
 *   - Keep structural colors (surface, border, text) unchanged
 *
 * Normal Mode uses the full ADHD-optimized palette:
 *   - Teal  (#4ECDC4) — easy, calm, primary CTA
 *   - Indigo (#6C63FF) — medium, steady, navigation
 *   - Gold  (#F59E0B) — hard tasks, carry-over (APCA amber — warmer than #FFE66D, safer for RSD)
 *
 * Note: #FFE66D (neon yellow) is kept ONLY for festive/celebration contexts
 * (confetti, level-up stars, XP burst) where excitement is intentional.
 * Task-context colors use #F59E0B (amber) to avoid luminance-induced eye strain.
 */

import { useStore } from '@/store'

export interface Palette {
  // Accent colors
  primary:     string   // indigo — primary action, navigation
  teal:        string   // teal  — easy tasks, CTA, positive
  gold:        string   // gold  — hard tasks, achievements, carry-over
  // Glow multiplier — 0 in calm mode (removes radial/box shadows)
  glowAlpha:   number   // 0.0–1.0; multiply against glow opacity values
  // Convenience: should gradients be simplified to flat fills?
  flatMode:    boolean
}

// ── Full saturation (normal mode) ─────────────────────────────────────────────
const NORMAL: Palette = {
  primary:   '#7B72FF',   // WCAG AA: 5.0:1 on #0F1117 (was #6C63FF — 4.37:1)
  teal:      '#4ECDC4',
  gold:      '#F59E0B',   // Research #8: amber replaces neon yellow #FFE66D — APCA Lc ~68
  glowAlpha: 1.0,
  flatMode:  false,
}

// ── Desaturated (calm / reduced-stimulation mode) ─────────────────────────────
// Hue preserved, saturation reduced ~50%, lightness slightly lowered
// to maintain legibility while reducing arousal.
const CALM: Palette = {
  primary:   '#7878B8',   // muted indigo-slate — WCAG AA: 4.63:1 on #0F1117 (was #6060A0 — 3.31:1)
  teal:      '#4A8A87',   // muted teal-sage
  gold:      '#8C6A10',   // muted amber (desaturated #F59E0B)
  glowAlpha: 0.0,         // no glows in calm mode — pure shape signal
  flatMode:  true,
}

// ── Light mode palettes ───────────────────────────────────────────────────────
// Accents darkened for APCA contrast on warm ivory #F5F3EE background
const LIGHT: Palette = {
  primary:   '#6C63FF',
  teal:      '#0EA89E',
  gold:      '#D97706',
  glowAlpha: 0.5,         // subtle glows on light backgrounds
  flatMode:  false,
}

const LIGHT_CALM: Palette = {
  primary:   '#8080B8',
  teal:      '#4A8A87',
  gold:      '#9A7520',
  glowAlpha: 0.0,
  flatMode:  true,
}

export function usePalette(): Palette {
  const reducedStimulation = useStore(s => s.reducedStimulation)
  const userTheme = useStore(s => s.userTheme)
  const isLight = userTheme === 'light' ||
    (userTheme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches)

  if (isLight) return reducedStimulation ? LIGHT_CALM : LIGHT
  return reducedStimulation ? CALM : NORMAL
}
