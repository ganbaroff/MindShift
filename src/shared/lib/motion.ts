/**
 * Centralized animation system — Research #2 (Motion Design for Neurodivergent Users)
 *
 * Two spring profiles (critically damped by default):
 *   SPRING          → stiffness 300, damping 30  (ζ≈1.0, zero bounce)
 *   SPRING_EXPRESSIVE → stiffness 260, damping 20  (ζ<1.0, dopamine celebrations only)
 *
 * Timing guide (all in seconds for Framer Motion):
 *   micro    0.15 s  →  100-200 ms  hover/tap/toggle
 *   standard 0.25 s  →  200-300 ms  menus, panels, modals
 *   reveal   0.40 s  →  300-500 ms  large reveals, screen transitions
 *
 * Rules enforced by research:
 *   • ease-out ONLY — objects decelerate to rest (mimics physical friction)
 *   • NEVER linear (mechanical) or ease-in (abrupt stop triggers startle)
 *   • No looping animation without user control
 *   • No animation > 1 s (break flow state for ADHD)
 *   • Contrast change during animation ≤ 30%
 */

import type { Transition } from 'motion/react'

// ── Spring configs ────────────────────────────────────────────────────────────

/**
 * STANDARD spring — use for every functional UI transition.
 * Critically damped (ζ ≈ 1.0): zero bounce, organic deceleration.
 * Works for: buttons, modals, menus, cards, panels, inputs.
 */
export const SPRING: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
}

/**
 * EXPRESSIVE spring — ONLY for milestone celebrations.
 * Slightly underdamped (ζ < 1.0): one small, satisfying bounce.
 * Use for: task completion, achievement unlock, level-up.
 * NEVER use for navigation or functional UI.
 */
export const SPRING_EXPRESSIVE: Transition = {
  type: 'spring',
  stiffness: 260,
  damping: 20,
}

/**
 * FADE — pure opacity transition.
 * Used when prefers-reduced-motion OR manual "Reduced stimulation" toggle is on.
 * Replaces all spatial animations (x/y slides, scale) with a clean fade.
 */
export const FADE: Transition = {
  duration: 0.2,
  ease: [0.0, 0.0, 0.2, 1.0],
}

/**
 * INSTANT — zero-duration, no perceptual motion.
 * For critical accessibility contexts where even fades are unwanted.
 */
export const INSTANT: Transition = {
  duration: 0,
}

// ── Duration constants (seconds) ──────────────────────────────────────────────

export const DURATION = {
  micro:    0.15,  // 150 ms — hover, toggle, tap, checkbox
  standard: 0.25,  // 250 ms — menus, modals, drawer panels
  reveal:   0.40,  // 400 ms — screen transitions, large content reveals
} as const

// ── Easing ────────────────────────────────────────────────────────────────────

export const EASE = {
  /** Standard ease-out — default for all enters */
  out:    [0.0, 0.0, 0.2, 1.0] as const,
  /** Gentler deceleration — for large spatial moves */
  gentle: [0.0, 0.0, 0.4, 1.0] as const,
} as const

// ── Stagger helper ────────────────────────────────────────────────────────────

/**
 * Returns per-item delay for staggered list animations.
 * Keeps stagger tight (50-80ms per item) so the list feels like a unit,
 * not individual items demanding attention.
 */
export const staggerDelay = (index: number, perItem = 0.06): number =>
  index * perItem

// ── Variant presets ───────────────────────────────────────────────────────────

/** Slide-up entry — for cards, toasts, bottom sheets */
export const slideUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -8 },
}

/** Fade-only entry — used when motion is reduced */
export const fadeOnly = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit:    { opacity: 0 },
}

/** Scale-in — for modals / popovers */
export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit:    { opacity: 0, scale: 0.97 },
}

/** Directional slide — for screen-level transitions */
export const slideHorizontal = (direction: 1 | -1) => ({
  initial: { opacity: 0, x: direction * 28 },
  animate: { opacity: 1, x: 0 },
  exit:    { opacity: 0, x: direction * -20 },
})
