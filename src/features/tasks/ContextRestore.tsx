/**
 * ContextRestore — "Where Was I?" overlay (Research #1/#2: Focus Session Structure)
 *
 * Shown when the user returns after 30+ minutes of absence (but < 72h recovery threshold).
 * Purpose: reduce working memory load on return — externalize what they were doing.
 *
 * Design rules:
 * - Maximum 2 NOW pool tasks shown (ADHD capacity limit)
 * - Non-blocking: user can dismiss immediately
 * - Forward-looking copy — never "you left N minutes ago"
 * - Auto-dismisses if no active NOW tasks (nothing to restore)
 *
 * Utility helpers (writeLastActive, shouldShowContextRestore) live in
 * contextRestoreUtils.ts so App.tsx can import them eagerly without
 * pulling this component into the main bundle.
 */

import { motion, AnimatePresence } from 'motion/react'
import { useMotion } from '@/shared/hooks/useMotion'
import { useStore } from '@/store'

// Re-export utils so existing call-sites (tests, etc.) don't break
export { writeLastActive, shouldShowContextRestore } from './contextRestoreUtils'

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  onDismiss: () => void
}

export function ContextRestore({ onDismiss }: Props) {
  const nowPool = useStore(s => s.nowPool)
  const { shouldAnimate, t } = useMotion()

  // Show up to 2 active NOW tasks — cognitive load limit
  const activeTasks = nowPool.filter(t => t.status === 'active').slice(0, 2)

  return (
    <AnimatePresence>
      <motion.div
        initial={shouldAnimate ? { opacity: 0 } : {}}
        animate={{ opacity: 1 }}
        exit={shouldAnimate ? { opacity: 0 } : {}}
        className="fixed inset-0 z-40 flex flex-col justify-end px-4 pb-32"
        style={{ background: 'rgba(15, 17, 23, 0.75)', backdropFilter: 'blur(4px)' }}
        onClick={onDismiss}
      >
        <motion.div
          initial={shouldAnimate ? { y: 32, opacity: 0 } : {}}
          animate={{ y: 0, opacity: 1 }}
          transition={{ ...t(), delay: 0.1 }}
          onClick={e => e.stopPropagation()}
          className="rounded-3xl p-5"
          style={{
            background: '#1E2136',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 -8px 40px rgba(123, 114, 255, 0.08)',
          }}
        >
          {/* Header */}
          <div className="mb-4">
            <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: '#7B72FF' }}>
              Where were we?
            </p>
            <p className="text-base font-bold" style={{ color: '#E8E8F0' }}>
              {activeTasks.length > 0
                ? 'You had these in progress:'
                : "You're all caught up — ready for what's next?"}
            </p>
          </div>

          {/* Task list — externalize working memory */}
          {activeTasks.length > 0 && (
            <div className="flex flex-col gap-2 mb-5">
              {activeTasks.map(task => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                  style={{ background: '#252840', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <span className="text-sm font-medium flex-1 leading-snug" style={{ color: '#E8E8F0' }}>
                    {task.title}
                  </span>
                  <span className="text-xs flex-shrink-0" style={{ color: '#8B8BA7' }}>
                    ~{task.estimatedMinutes}m
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onDismiss}
              className="flex-1 py-3 rounded-2xl font-semibold text-sm"
              style={{ background: '#7B72FF', color: '#FFFFFF' }}
            >
              {activeTasks.length > 0 ? 'Dive back in →' : "Let's go →"}
            </button>
            <button
              onClick={onDismiss}
              className="px-4 py-3 rounded-2xl text-sm"
              style={{ background: '#252840', border: '1px solid rgba(255,255,255,0.06)', color: '#8B8BA7' }}
            >
              Maybe later
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
