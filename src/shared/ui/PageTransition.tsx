/**
 * PageTransition — shared wrapper for smooth tab transitions.
 *
 * Provides a subtle fade-in + slide-up on mount, gated by useMotion().
 * Used on the 4 main nav tabs (Home, Tasks, Progress, Settings).
 */

import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { useMotion } from '@/shared/hooks/useMotion'

interface PageTransitionProps {
  children: ReactNode
  /** Optional mount delay in seconds (default 0) */
  delay?: number
}

export function PageTransition({ children, delay = 0 }: PageTransitionProps) {
  const { shouldAnimate, t } = useMotion()

  return (
    <motion.div
      initial={shouldAnimate ? { opacity: 0, y: 10 } : false}
      animate={shouldAnimate ? { opacity: 1, y: 0 } : false}
      transition={shouldAnimate ? { ...t(), delay } : { duration: 0 }}
    >
      {children}
    </motion.div>
  )
}
