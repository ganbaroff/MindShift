/**
 * MonthlyIntentionStep — one-word intention input + quick-pick chips.
 *
 * Step 2 of MonthlyReflection. Extracted to keep parent under 400 lines.
 */

import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import type { MotionAPI } from '@/shared/hooks/useMotion'

const INTENTION_SUGGESTIONS = [
  'Flow 🌊', 'Steady 🌱', 'Bold 🔥', 'Rest 🌙',
  'Create ✨', 'Finish 🎯', 'Connect 💙', 'Explore 🗺️',
]

interface MonthlyIntentionStepProps {
  monthName: string
  intention: string
  onIntentionChange: (val: string) => void
  motionTransition: MotionAPI['t']
  onNext: () => void
}

export function MonthlyIntentionStep({
  monthName, intention, onIntentionChange, motionTransition, onNext,
}: MonthlyIntentionStepProps) {
  const { t } = useTranslation()

  return (
    <motion.div
      key="intention"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ ...motionTransition(), duration: 0.35 }}
      className="flex flex-col gap-5"
    >
      <div className="text-center">
        <p className="text-4xl mb-3">🌅</p>
        <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {t('monthly.oneWord', { month: monthName })}
        </h2>
        <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>
          {t('monthly.whatFeel')}
        </p>
      </div>

      <input
        value={intention}
        onChange={e => onIntentionChange(e.target.value.slice(0, 30))}
        onKeyDown={e => { if (e.key === 'Enter') onNext() }}
        placeholder={t('monthly.intentionPlaceholder')}
        autoFocus
        className="w-full rounded-2xl px-4 py-3 text-base text-center outline-none transition-all duration-200"
        style={{
          background: 'var(--color-surface-card)',
          border: '1px solid rgba(255,255,255,0.06)',
          color: 'var(--color-text-primary)',
          caretColor: '#4ECDC4',
        }}
        onFocus={e => { e.currentTarget.style.borderColor = '#4ECDC4' }}
        onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }}
      />

      <div className="flex flex-wrap gap-2 justify-center">
        {INTENTION_SUGGESTIONS.map(s => (
          <button
            key={s}
            type="button"
            onClick={() => onIntentionChange(s.split(' ')[0])}
            aria-label={`Set intention: ${s.split(' ')[0]}`}
            className="text-xs px-3 py-1.5 rounded-xl transition-all duration-150"
            style={{
              background: intention.startsWith(s.split(' ')[0]) ? 'rgba(78,205,196,0.15)' : 'var(--color-surface-card)',
              border: `1px solid ${intention.startsWith(s.split(' ')[0]) ? 'var(--color-teal)' : 'var(--color-border-subtle)'}`,
              color: intention.startsWith(s.split(' ')[0]) ? 'var(--color-teal)' : 'var(--color-text-muted)',
            }}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <button
          onClick={onNext}
          className="w-full py-4 rounded-2xl font-semibold text-base transition-all duration-200"
          style={{
            background: intention.trim() ? 'var(--color-teal)' : 'var(--color-surface-raised)',
            color: intention.trim() ? 'var(--color-bg)' : 'var(--color-text-muted)',
          }}
          aria-label="Set monthly intention"
        >
          {intention.trim() ? `${t('monthly.intentionSet', { month: monthName, intention: intention.trim() })} 🌱` : t('monthly.setIntentionBtn')}
        </button>
        <button
          onClick={onNext}
          className="w-full py-3 text-sm"
          style={{ color: 'var(--color-text-muted)' }}
          aria-label="Skip monthly reflection"
        >
          Skip
        </button>
      </div>
    </motion.div>
  )
}
