/**
 * useMotion — central hook for animation-aware components.
 *
 * Combines two motion-reduction signals:
 *   1. OS-level  `prefers-reduced-motion` media query (via Framer Motion)
 *   2. In-app    `reducedStimulation` toggle in Settings
 *
 * When either is true → spatial animations (x/y/scale) collapse to opacity fades.
 * Components should NEVER check prefers-reduced-motion directly; use this hook.
 *
 * Usage:
 *   const { t, shouldAnimate, slideUp } = useMotion()
 *   <motion.div {...slideUp} transition={t()} />
 *
 *   // Celebration (task complete):
 *   <motion.div transition={t('expressive')} />
 */

import { useReducedMotion } from 'motion/react'
import { useStore } from '@/store'
import {
  SPRING, SPRING_EXPRESSIVE, FADE, INSTANT, DURATION, EASE,
  slideUp as _slideUp, fadeOnly, scaleIn as _scaleIn,
  slideHorizontal as _slideHorizontal,
} from '@/shared/lib/motion'
import type { Transition } from 'motion/react'

type TransitionMode = 'standard' | 'expressive'

/**
 * Loose variant preset type — covers both spatial (x/y/scale) and
 * fade-only variants so TypeScript accepts fadeOnly as a fallback for
 * slideUp / scaleIn / slideHorizontal when motion is reduced.
 */
type VariantPreset = {
  initial: Record<string, number>
  animate: Record<string, number>
  exit:    Record<string, number>
}

export interface MotionAPI {
  /** True when animations should play. False → pure opacity fades only. */
  shouldAnimate: boolean

  /**
   * t() — pick the right transition for the current motion preference.
   *   'standard'   → SPRING (default, critically damped)
   *   'expressive' → SPRING_EXPRESSIVE (celebration only — minor bounce)
   * When motion is reduced → always returns INSTANT.
   */
  t: (mode?: TransitionMode) => Transition

  /** Raw spring for standard UI (use via t() instead when possible) */
  spring: Transition

  /** Raw expressive spring (celebration) */
  springExpressive: Transition

  /** Fade transition — 200ms ease-out */
  fade: Transition

  /** Zero-duration instant */
  instant: Transition

  /** Duration constants in seconds */
  duration: typeof DURATION

  /** Easing curves */
  ease: typeof EASE

  /**
   * Variant presets — automatically switch between spatial and fade variants
   * based on current motion preference.
   */
  slideUp:        VariantPreset
  fadeOnly:       VariantPreset
  scaleIn:        VariantPreset
  slideHorizontal: (dir: 1 | -1) => VariantPreset
}

export function useMotion(): MotionAPI {
  const osReduced         = useReducedMotion()     // OS prefers-reduced-motion
  const storeReduced      = useStore(s => s.reducedStimulation) // in-app toggle
  const shouldAnimate     = !osReduced && !storeReduced

  const t = (mode: TransitionMode = 'standard'): Transition => {
    if (!shouldAnimate) return INSTANT
    return mode === 'expressive' ? SPRING_EXPRESSIVE : SPRING
  }

  // Spatial variants collapse to fades when motion is reduced
  const slideUpVariant   = shouldAnimate ? _slideUp   : fadeOnly
  const scaleInVariant   = shouldAnimate ? _scaleIn   : fadeOnly
  const slideHorizVariant = (dir: 1 | -1) =>
    shouldAnimate ? _slideHorizontal(dir) : fadeOnly

  return {
    shouldAnimate,
    t,
    spring:           shouldAnimate ? SPRING          : INSTANT,
    springExpressive: shouldAnimate ? SPRING_EXPRESSIVE : INSTANT,
    fade:             shouldAnimate ? FADE             : INSTANT,
    instant:          INSTANT,
    duration:         DURATION,
    ease:             EASE,
    slideUp:          slideUpVariant,
    fadeOnly,
    scaleIn:          scaleInVariant,
    slideHorizontal:  slideHorizVariant,
  }
}
