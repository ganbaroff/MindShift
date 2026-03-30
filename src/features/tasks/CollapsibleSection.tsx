/**
 * CollapsibleSection — animated collapsible pool section header
 *
 * Extracted from TasksPage.tsx.
 */

import { motion, AnimatePresence } from 'motion/react'
import { ChevronDown } from 'lucide-react'

interface CollapsibleSectionProps {
  label: string
  count: number
  open: boolean
  onToggle: () => void
  children: React.ReactNode
  labelColor?: string
  shouldAnimate?: boolean
}

export function CollapsibleSection({ label, count, open, onToggle, children, labelColor, shouldAnimate = true }: CollapsibleSectionProps) {
  return (
    <div>
      <motion.button
        whileTap={shouldAnimate ? { scale: 0.97 } : undefined}
        onClick={onToggle}
        aria-expanded={open}
        aria-label={`${open ? 'Collapse' : 'Expand'} ${label} section`}
        className="flex items-center gap-2 w-full py-1 focus-visible:ring-2 focus-visible:ring-ms-primary/50 focus-visible:outline-none rounded"
      >
        <span className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: labelColor || 'var(--color-text-muted)' }}>
          {label}
        </span>
        <span className="text-[11px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--color-surface-raised)', color: 'var(--color-text-muted)' }}>
          {count}
        </span>
        <ChevronDown
          size={14}
          className={`ml-auto transition-transform ${open ? 'rotate-180' : ''}`}
          style={{ color: 'var(--color-text-muted)' }}
        />
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={shouldAnimate ? { height: 0, opacity: 0 } : false}
            animate={shouldAnimate ? { height: 'auto', opacity: 1 } : false}
            exit={shouldAnimate ? { height: 0, opacity: 0 } : undefined}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
