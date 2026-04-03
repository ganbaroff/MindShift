/**
 * FeatureHint — gentle, non-intrusive coach mark for first-time feature discovery.
 *
 * Shows once per feature (tracked via seenHints in store).
 * Auto-dismisses after 6 seconds. Tap to dismiss immediately.
 * ADHD-safe: never blocks interaction, no urgency, calm teal tint.
 */

import { useEffect, useState, memo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useMotion } from '@/shared/hooks/useMotion'
import { useStore } from '@/store'

interface FeatureHintProps {
  id: string
  text: string
  icon?: string
  /** Delay before showing (ms). Default 1000. */
  delay?: number
}

function FeatureHintInner({ id, text, icon, delay = 1000 }: FeatureHintProps) {
  const seenHints = useStore(s => s.seenHints)
  const markHintSeen = useStore(s => s.markHintSeen)
  const { shouldAnimate, t } = useMotion()
  const [visible, setVisible] = useState(false)

  const alreadySeen = seenHints.includes(id)

  useEffect(() => {
    if (alreadySeen) return
    const show = setTimeout(() => setVisible(true), delay)
    const auto = setTimeout(() => {
      setVisible(false)
      markHintSeen(id)
    }, delay + 6000)
    return () => { clearTimeout(show); clearTimeout(auto) }
  }, [id, alreadySeen, delay, markHintSeen])

  const handleDismiss = () => {
    setVisible(false)
    markHintSeen(id)
  }

  if (alreadySeen) return null

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          onClick={handleDismiss}
          initial={shouldAnimate ? { opacity: 0, y: 6, scale: 0.95 } : false}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={shouldAnimate ? { opacity: 0, y: -4, scale: 0.95 } : {}}
          transition={t()}
          className="w-full px-3 py-2 rounded-xl text-left cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--color-teal)]"
          style={{
            background: 'rgba(78,205,196,0.08)',
            border: '1px solid rgba(78,205,196,0.15)',
          }}
          aria-label="Dismiss hint"
        >
          <p className="text-[12px] leading-relaxed" style={{ color: 'var(--color-teal)' }}>
            {icon && <span className="mr-1">{icon}</span>}
            {text}
          </p>
        </motion.button>
      )}
    </AnimatePresence>
  )
}

export const FeatureHint = memo(FeatureHintInner)
