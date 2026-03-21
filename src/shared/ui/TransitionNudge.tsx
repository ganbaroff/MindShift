/**
 * TransitionNudge — shown after completing a task.
 *
 * "Done! Next: [task] — Focus →"
 * Auto-dismisses after 5 seconds. One-tap to start focus.
 * Prevents the "what now?" moment that causes ADHD users to leave.
 */

import { useEffect, memo } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { Play } from 'lucide-react'
import { useMotion } from '@/shared/hooks/useMotion'
import type { Task } from '@/types'

interface TransitionNudgeProps {
  nextTask: Task | null
  onFocus: () => void
  onDismiss: () => void
}

function TransitionNudgeInner({ nextTask, onFocus, onDismiss }: TransitionNudgeProps) {
  const { shouldAnimate, t: transition } = useMotion()
  const { t } = useTranslation()

  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  return (
    <motion.div
      initial={shouldAnimate ? { opacity: 0, y: 8 } : false}
      animate={{ opacity: 1, y: 0 }}
      exit={shouldAnimate ? { opacity: 0, y: -8 } : {}}
      transition={transition()}
      className="px-3 py-2.5 rounded-xl flex items-center gap-2"
      style={{
        background: 'rgba(78,205,196,0.10)',
        border: '1px solid rgba(78,205,196,0.20)',
      }}
    >
      <span className="text-[14px]">✅</span>
      <div className="flex-1 min-w-0">
        {nextTask ? (
          <p className="text-[12px] truncate" style={{ color: 'var(--color-text-primary)' }}>
            {t('transition.next', { title: '' })}<span style={{ color: 'var(--color-teal)' }}>{nextTask.title}</span>
          </p>
        ) : (
          <p className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
            {t('transition.allDone')}
          </p>
        )}
      </div>
      {nextTask && (
        <button
          onClick={onFocus}
          className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium focus-visible:ring-1 focus-visible:ring-[#4ECDC4]"
          style={{ background: 'rgba(78,205,196,0.15)', color: 'var(--color-teal)' }}
        >
          <Play size={10} fill="#4ECDC4" />
          {t('today.focus')}
        </button>
      )}
      <button
        onClick={onDismiss}
        className="shrink-0 text-[10px] px-1 focus-visible:ring-1 focus-visible:ring-[#7B72FF] rounded"
        style={{ color: 'var(--color-text-muted)' }}
        aria-label="Dismiss"
      >
        ✕
      </button>
    </motion.div>
  )
}

export const TransitionNudge = memo(TransitionNudgeInner)
