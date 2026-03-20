/**
 * EmptyState — reusable empty state component with large emoji, title, subtitle,
 * and optional action button. Subtle fade-in animation gated by useMotion().
 */

import { motion } from 'motion/react'
import { useMotion } from '@/shared/hooks/useMotion'

interface EmptyStateProps {
  emoji: string
  title: string
  subtitle?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ emoji, title, subtitle, action }: EmptyStateProps) {
  const { shouldAnimate, t } = useMotion()

  return (
    <motion.div
      initial={shouldAnimate ? { opacity: 0, y: 12 } : false}
      animate={shouldAnimate ? { opacity: 1, y: 0 } : false}
      transition={shouldAnimate ? t() : { duration: 0 }}
      className="flex flex-col items-center justify-center py-12 px-6 text-center"
    >
      <span className="text-[48px] mb-3" role="img">{emoji}</span>
      <h3
        className="text-[17px] font-semibold mb-1"
        style={{ color: '#E8E8F0' }}
      >
        {title}
      </h3>
      {subtitle && (
        <p
          className="text-[13px] max-w-[260px]"
          style={{ color: '#8B8BA7' }}
        >
          {subtitle}
        </p>
      )}
      {action && (
        <motion.button
          whileTap={shouldAnimate ? { scale: 0.97 } : undefined}
          onClick={action.onClick}
          className="mt-4 px-5 py-2.5 rounded-xl text-[14px] font-medium focus-visible:ring-2 focus-visible:ring-offset-2"
          style={{
            backgroundColor: 'rgba(78,205,196,0.15)',
            border: '1px solid rgba(78,205,196,0.35)',
            color: '#4ECDC4',
          }}
          aria-label={action.label}
        >
          {action.label}
        </motion.button>
      )}
    </motion.div>
  )
}
