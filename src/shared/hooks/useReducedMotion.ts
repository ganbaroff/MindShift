/**
 * Combined reduced motion hook.
 *
 * Respects BOTH:
 * 1. OS-level `prefers-reduced-motion` (via Framer Motion)
 * 2. App-level `reducedStimulation` toggle (via Zustand store)
 *
 * Returns true if EITHER source requests reduced motion.
 * Use this instead of Framer Motion's useReducedMotion() directly.
 */
import { useReducedMotion as useFramerReducedMotion } from 'motion/react'
import { useStore } from '@/store'

export function useReducedMotion(): boolean {
  const osReduced = useFramerReducedMotion()
  const appReduced = useStore(s => s.reducedStimulation)
  return !!(osReduced || appReduced)
}
