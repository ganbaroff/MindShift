/**
 * SocialFeedbackCard — S-9 Post-social cool-down ritual
 *
 * Shown in NatureBuffer after sessions where user was in a Focus Room.
 * Single-tap 3-option reaction: 👍 / 😐 / 👎
 * No detailed feedback — prevents overthinking and RSD analysis-paralysis.
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useMotion } from '@/shared/hooks/useMotion'
import { logEvent } from '@/shared/lib/logger'

const SOCIAL_OPTIONS = [
  { key: 'good', emoji: '👍' } as const,
  { key: 'okay', emoji: '😐' } as const,
  { key: 'hard', emoji: '👎' } as const,
]

export function SocialFeedbackCard() {
  const { shouldAnimate, t: transition } = useMotion()
  const { t } = useTranslation()
  const [pick, setPick] = useState<string | null>(null)

  return (
    <AnimatePresence>
      <motion.div
        initial={shouldAnimate ? { opacity: 0, y: 12 } : {}}
        animate={{ opacity: 1, y: 0 }}
        transition={transition()}
        className="w-full max-w-xs mb-4 p-3 rounded-2xl"
        style={{ background: 'var(--color-surface-card)', border: '1px solid rgba(78,205,196,0.2)' }}
      >
        <p className="text-xs font-medium mb-3 text-center" style={{ color: 'var(--color-teal)' }}>
          {t('focus.socialFeedbackTitle')}
        </p>
        <div className="flex gap-2">
          {SOCIAL_OPTIONS.map(({ key, emoji }) => {
            const label = t(`focus.socialFeedback${key.charAt(0).toUpperCase() + key.slice(1)}` as Parameters<typeof t>[0])
            return (
              <button
                key={key}
                onClick={() => {
                  setPick(key)
                  logEvent('social_session_feedback', { rating: key })
                }}
                className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl text-xs transition-all duration-150 focus-visible:ring-2 focus-visible:ring-[var(--color-teal)] focus-visible:outline-none"
                style={{
                  background: pick === key ? 'rgba(78,205,196,0.15)' : 'var(--color-surface-raised)',
                  border: `1px solid ${pick === key ? 'rgba(78,205,196,0.4)' : 'rgba(255,255,255,0.06)'}`,
                  color: pick === key ? 'var(--color-teal)' : 'var(--color-text-muted)',
                }}
                aria-pressed={pick === key}
                aria-label={label}
              >
                <span className="text-base leading-none">{emoji}</span>
                <span className="text-[10px] leading-tight text-center">{label}</span>
              </button>
            )
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
