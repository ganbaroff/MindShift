/**
 * FocusHardStop — 120-min hard stop half-sheet
 *
 * Research #2: >2h continuous focus = diminishing returns.
 * Offers rest or an opt-out for hyperfocus flow states.
 *
 * Extracted from FocusScreen.tsx.
 */

import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useMotion } from '@/shared/hooks/useMotion'

interface FocusHardStopProps {
  onEndAndRest: () => void
  onKeepGoing: () => void
}

export function FocusHardStop({ onEndAndRest, onKeepGoing }: FocusHardStopProps) {
  const { shouldAnimate, t: motionT } = useMotion()
  const { t } = useTranslation()

  return (
    <div
      className="flex flex-col items-center justify-end min-h-screen px-6 pb-12"
      style={{ background: 'rgba(15,17,23,0.92)' }}
    >
      <motion.div
        initial={shouldAnimate ? { opacity: 0, y: 40 } : {}}
        animate={{ opacity: 1, y: 0 }}
        transition={motionT()}
        className="w-full max-w-xs flex flex-col items-center text-center"
        style={{
          background: 'var(--color-card)',
          border: '1px solid var(--color-border-accent)',
          borderRadius: 24,
          padding: '32px 24px',
        }}
      >
        <div className="text-5xl mb-4">🧘</div>
        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
          {t('focus.twoHours')}
        </h2>
        <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--color-muted)' }}>
          {t('focus.twoHoursDesc')}
        </p>

        <button
          onClick={onEndAndRest}
          className="w-full py-3.5 rounded-2xl font-semibold text-sm mb-3 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:outline-none"
          style={{
            background: 'linear-gradient(135deg, #7B72FF, #8B7FF7)',
            color: 'white',
            boxShadow: '0 8px 24px rgba(123,114,255,0.28)',
          }}
        >
          {t('focus.endAndRest')}
        </button>

        <button
          onClick={onKeepGoing}
          className="text-xs px-5 py-2.5 rounded-xl transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:outline-none"
          style={{
            background: 'transparent',
            border: '1px solid var(--color-border-subtle)',
            color: 'var(--color-muted)',
          }}
        >
          {t('focus.letMeKeepGoing')}
        </button>
      </motion.div>
    </div>
  )
}
