/**
 * CoachMark — Progressive disclosure tooltip (Research #4)
 *
 * Shows a dismissible hint card above the bottom nav.
 * Renders only once per hintId (persisted in store.seenHints).
 * Non-modal: never blocks interaction.
 */

import { motion, AnimatePresence } from 'motion/react'
import { X } from 'lucide-react'
import { useStore } from '@/store'
import { useMotion } from '@/shared/hooks/useMotion'

interface Props {
  hintId: string
  emoji: string
  message: string
}

export function CoachMark({ hintId, emoji, message }: Props) {
  const { seenHints, markHintSeen } = useStore()
  const { shouldAnimate, t } = useMotion()

  const seen = seenHints.includes(hintId)

  return (
    <AnimatePresence>
      {!seen && (
        <motion.div
          key={hintId}
          initial={shouldAnimate ? { opacity: 0, y: 12 } : {}}
          animate={{ opacity: 1, y: 0 }}
          exit={shouldAnimate ? { opacity: 0, y: 8 } : { opacity: 0 }}
          transition={t()}
          className="fixed bottom-[76px] left-1/2 -translate-x-1/2 w-full max-w-[420px] px-4 z-40 pointer-events-none"
        >
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-2xl pointer-events-auto"
            style={{
              background: 'var(--color-primary-alpha)',
              border: '1.5px solid var(--color-border-accent)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              boxShadow: '0 4px 20px rgba(123, 114, 255, 0.08)',
            }}
          >
            <span className="text-xl flex-shrink-0">{emoji}</span>
            <p className="flex-1 text-sm leading-snug" style={{ color: 'var(--color-text)' }}>
              {message}
            </p>
            <button
              onClick={() => markHintSeen(hintId)}
              className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full transition-opacity hover:opacity-80"
              style={{ color: 'var(--color-muted)' }}
              aria-label="Dismiss tip"
            >
              <X size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
