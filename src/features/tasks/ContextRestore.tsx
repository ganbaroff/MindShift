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

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useMotion } from '@/shared/hooks/useMotion'
import { useStore } from '@/store'
import { logEvent } from '@/shared/lib/logger'

// Re-export utils so existing call-sites (tests, etc.) don't break
// eslint-disable-next-line react-refresh/only-export-components
export { writeLastActive, shouldShowContextRestore } from './contextRestoreUtils'

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  onDismiss: () => void
  /** S-5 Ghosting Grace — true if user was in a Focus Room within the last 24h */
  wasRecentlyInRoom?: boolean
  lastRoomCode?: string | null
}

export function ContextRestore({ onDismiss, wasRecentlyInRoom, lastRoomCode }: Props) {
  const nowPool = useStore(s => s.nowPool)
  const { shouldAnimate, t: transition } = useMotion()
  const { t } = useTranslation()

  // Show up to 2 active NOW tasks — cognitive load limit
  const activeTasks = nowPool.filter(task => task.status === 'active').slice(0, 2)

  useEffect(() => {
    logEvent('context_restore_shown', {
      active_tasks: activeTasks.length,
      ghosting_grace_shown: wasRecentlyInRoom ? 1 : 0,
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
          transition={{ ...transition(), delay: 0.1 }}
          onClick={e => e.stopPropagation()}
          className="rounded-3xl p-5"
          style={{
            background: 'var(--color-surface-card)',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 -8px 40px rgba(123, 114, 255, 0.08)',
          }}
        >
          {/* Header */}
          <div className="mb-4">
            <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: 'var(--color-primary)' }}>
              {t('contextRestore.whereWereWe')}
            </p>
            <p className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
              {activeTasks.length > 0
                ? t('contextRestore.hadInProgress')
                : t('contextRestore.allCaughtUp')}
            </p>
          </div>

          {/* S-5 Ghosting Grace — warm Focus Room re-entry card */}
          {wasRecentlyInRoom && lastRoomCode && (
            <div
              className="flex items-start gap-3 px-3 py-2.5 rounded-xl mb-4"
              style={{
                background: 'rgba(78, 205, 196, 0.08)',
                border: '1px solid rgba(78, 205, 196, 0.2)',
              }}
            >
              <span className="text-base mt-0.5" aria-hidden="true">🤝</span>
              <div>
                <p className="text-sm font-medium leading-snug" style={{ color: 'var(--color-text-primary)' }}>
                  {t('contextRestore.roomReEntry')}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  {t('contextRestore.roomReEntryBody', { code: lastRoomCode })}
                </p>
              </div>
            </div>
          )}

          {/* Task list — externalize working memory */}
          {activeTasks.length > 0 && (
            <div className="flex flex-col gap-2 mb-5">
              {activeTasks.map(task => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                  style={{ background: 'var(--color-surface-raised)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <span className="text-sm font-medium flex-1 leading-snug" style={{ color: 'var(--color-text-primary)' }}>
                    {task.title}
                  </span>
                  <span className="text-xs flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>
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
              className="flex-1 py-3 rounded-2xl font-semibold text-sm focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none"
              style={{ background: 'var(--color-primary)', color: '#FFFFFF' }}
            >
              {activeTasks.length > 0 ? t('contextRestore.diveBack') : t('contextRestore.letsGo')}
            </button>
            <button
              onClick={onDismiss}
              className="px-4 py-3 rounded-2xl text-sm focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:outline-none"
              style={{ background: 'var(--color-surface-raised)', border: '1px solid rgba(255,255,255,0.06)', color: 'var(--color-text-muted)' }}
            >
              {t('contextRestore.maybeLater')}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
