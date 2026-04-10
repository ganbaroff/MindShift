/**
 * IfThenCard — Implementation Intentions for ADHD follow-through
 *
 * Research #3.3: "When [situation], I will [action]" plans improve
 * ADHD task initiation by 2-3× (Gollwitzer & Sheeran, 2006).
 *
 * Rules stored in Zustand (persisted). Max 3 to avoid overwhelm.
 * Shown in FocusSetup above the Start button.
 */

import { useState, useId } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useMotion } from '@/shared/hooks/useMotion'
import { useStore } from '@/store'

export function IfThenCard() {
  const { t } = useTranslation()
  const { shouldAnimate } = useMotion()
  const { ifThenRules, addIfThenRule, removeIfThenRule } = useStore()

  const [showForm, setShowForm] = useState(false)
  const [whenText, setWhenText] = useState('')
  const [willText, setWillText] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const whenId = useId()
  const willId = useId()

  const canAdd = ifThenRules.length < 3
  const hasRules = ifThenRules.length > 0

  const handleSave = () => {
    const when = whenText.trim()
    const will = willText.trim()
    if (!when || !will) {
      setFormError('Both fields are required')
      return
    }
    setFormError(null)
    addIfThenRule({ when, will })
    setWhenText('')
    setWillText('')
    setShowForm(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSave()
    }
    if (e.key === 'Escape') {
      setShowForm(false)
      setWhenText('')
      setWillText('')
    }
  }

  // Nothing to show if no rules and form is hidden
  if (!hasRules && !showForm) {
    return (
      <div className="mx-5 mb-3">
        <button
          onClick={() => setShowForm(true)}
          className="text-[12px] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:outline-none rounded"
          style={{ color: 'var(--color-text-muted)' }}
        >
          + {t('focus.addIntention')}
        </button>
      </div>
    )
  }

  return (
    <div className="mx-5 mb-4">
      {/* Existing rules */}
      <AnimatePresence>
        {hasRules && (
          <motion.div
            initial={shouldAnimate ? { opacity: 0, height: 0 } : false}
            animate={shouldAnimate ? { opacity: 1, height: 'auto' } : false}
            exit={shouldAnimate ? { opacity: 0, height: 0 } : undefined}
            className="mb-2 space-y-1.5"
          >
            {ifThenRules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-start gap-2 px-3 py-2 rounded-xl"
                style={{ background: 'rgba(78,205,196,0.06)', border: '1px solid rgba(78,205,196,0.12)' }}
              >
                <span className="text-[10px] mt-0.5 flex-shrink-0" style={{ color: 'var(--color-teal)' }}>⚡</span>
                <p className="flex-1 text-[12px] leading-snug" style={{ color: 'var(--color-text-primary)' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>{t('focus.intentionWhen')} </span>
                  {rule.when}
                  <span style={{ color: 'var(--color-text-muted)' }}>{', '}{t('focus.intentionWill')} </span>
                  {rule.will}
                </p>
                <button
                  onClick={() => removeIfThenRule(rule.id)}
                  aria-label={t('focus.removeIntention')}
                  className="flex-shrink-0 text-[14px] leading-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:outline-none rounded"
                  style={{ color: 'var(--color-text-muted)', opacity: 0.5 }}
                >
                  ×
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={shouldAnimate ? { opacity: 0, height: 0 } : false}
            animate={shouldAnimate ? { opacity: 1, height: 'auto' } : false}
            exit={shouldAnimate ? { opacity: 0, height: 0 } : undefined}
            className="space-y-2 mb-2"
          >
            <div className="flex items-center gap-2">
              <label htmlFor={whenId} className="text-[11px] w-16 flex-shrink-0 text-right" style={{ color: 'var(--color-text-muted)' }}>
                {t('focus.intentionWhen')}
              </label>
              <input
                id={whenId}
                autoFocus
                type="text"
                value={whenText}
                onChange={e => { setWhenText(e.target.value); setFormError(null) }}
                onKeyDown={handleKeyDown}
                placeholder={t('focus.intentionWhenPlaceholder')}
                maxLength={60}
                aria-invalid={formError ? 'true' : undefined}
                className="flex-1 h-8 rounded-xl px-2.5 text-[12px] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:outline-none"
                style={{
                  background: 'var(--color-surface-raised)',
                  color: 'var(--color-text-primary)',
                  border: '1px solid rgba(78,205,196,0.15)',
                }}
              />
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor={willId} className="text-[11px] w-16 flex-shrink-0 text-right" style={{ color: 'var(--color-text-muted)' }}>
                {t('focus.intentionWill')}
              </label>
              <input
                id={willId}
                type="text"
                value={willText}
                onChange={e => { setWillText(e.target.value); setFormError(null) }}
                onKeyDown={handleKeyDown}
                placeholder={t('focus.intentionWillPlaceholder')}
                maxLength={60}
                className="flex-1 h-8 rounded-xl px-2.5 text-[12px] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:outline-none"
                style={{
                  background: 'var(--color-surface-raised)',
                  color: 'var(--color-text-primary)',
                  border: '1px solid rgba(78,205,196,0.15)',
                }}
              />
            </div>
            {formError && (
              <p role="alert" aria-live="assertive" className="text-[11px]" style={{ color: 'var(--color-gold)' }}>
                {formError}
              </p>
            )}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setShowForm(false); setWhenText(''); setWillText('') }}
                className="px-3 py-1 rounded-lg text-[11px] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:outline-none"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={!whenText.trim() || !willText.trim()}
                className="px-3 py-1 rounded-lg text-[11px] font-medium disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:outline-none"
                style={{ background: 'rgba(78,205,196,0.15)', color: 'var(--color-teal)' }}
              >
                {t('common.save')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add more link */}
      {!showForm && canAdd && hasRules && (
        <button
          onClick={() => setShowForm(true)}
          className="text-[11px] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:outline-none rounded"
          style={{ color: 'var(--color-text-muted)' }}
        >
          + {t('focus.addIntention')}
        </button>
      )}
    </div>
  )
}
