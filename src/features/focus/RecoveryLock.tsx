/**
 * RecoveryLock — suggested 10-min rest after a 90-min+ focus session.
 *
 * Non-punitive: this is a suggestion, NOT a hard gate. Bypass is always visible.
 * Research: forcibly interrupting ADHD hyperfocus causes irritation + shame spiral.
 */

import { memo, useState } from 'react'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useMotion } from '@/shared/hooks/useMotion'
import { ShareCard } from '@/shared/ui/ShareCard'
import type { SessionPhase } from '@/types'

interface RecoveryLockProps {
  recoverySeconds: number
  onBypass: () => void
  sessionMinutes?: number
  sessionPhase?: SessionPhase
}

export const RecoveryLock = memo(function RecoveryLock({
  recoverySeconds, onBypass, sessionMinutes = 0, sessionPhase,
}: RecoveryLockProps) {
  const { shouldAnimate, t: transition } = useMotion()
  const { t } = useTranslation()
  const [showShareCard, setShowShareCard] = useState(false)
  const rm = Math.floor(recoverySeconds / 60)
  const rs = recoverySeconds % 60

  const suggestions = [
    t('focus.drinkWater'),
    t('focus.lookAway'),
    t('focus.deepBreaths'),
    t('focus.stretchNeck'),
  ]

  return (
    // Soft recovery suggestion (NOT a hard lock)
    <div
      className="flex flex-col items-center justify-center min-h-screen px-6 text-center"
      style={{ background: 'var(--color-bg)' }}
    >
      <motion.div
        initial={shouldAnimate ? { opacity: 0, scale: 0.9 } : {}}
        animate={{ opacity: 1, scale: 1 }}
        transition={transition()}
        className="flex flex-col items-center"
      >
        <div className="text-5xl mb-6">🌿</div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-teal)' }}>
          {t('focus.recoveryTitle')}
        </h2>
        <p className="text-sm mb-6 max-w-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
          {t('focus.recoveryDesc')}
        </p>

        {/* Gentle suggestions */}
        <div
          className="w-full max-w-xs mb-6 p-4 rounded-2xl text-left"
          style={{ background: 'var(--color-surface-card)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-muted)' }}>{t('focus.trySuggestions')}</p>
          {suggestions.map(s => (
            <p key={s} className="text-sm mb-1.5" style={{ color: 'var(--color-text-primary)' }}>· {s}</p>
          ))}
        </div>

        {/* Timer — informational, not a gate */}
        <div
          role="timer"
          aria-live="polite"
          aria-atomic="true"
          aria-label={`${t('focus.suggestedRest')}: ${rm} minutes ${rs} seconds remaining`}
          className="px-8 py-3 rounded-2xl mb-6"
          style={{ background: 'var(--color-surface-card)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p className="font-mono text-2xl font-bold" style={{ color: 'var(--color-teal)' }}>
            {rm}:{rs.toString().padStart(2, '0')}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{t('focus.suggestedRest')}</p>
        </div>

        {/* Focus Proof — share card (past vulnerability window, ethically safe) */}
        {sessionMinutes > 0 && (
          <button
            onClick={() => setShowShareCard(true)}
            className="mb-4 text-xs px-4 py-1.5 rounded-xl focus-visible:ring-2 focus-visible:ring-[var(--color-teal)] focus-visible:outline-none"
            style={{
              background: 'rgba(78,205,196,0.08)',
              border: '1px solid rgba(78,205,196,0.2)',
              color: 'var(--color-teal)',
            }}
          >
            {t('focus.shareFocusProof')}
          </button>
        )}

        {/* Continue anyway — hyperfocus support */}
        <button
          onClick={onBypass}
          className="text-xs px-5 py-2 rounded-xl transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:outline-none"
          style={{
            background: 'transparent',
            border: '1px solid var(--color-border-subtle)',
            color: 'var(--color-text-muted)',
          }}
          aria-label={t('focus.bypassRecovery')}
        >
          {t('focus.keepGoingBypass')}
        </button>
      </motion.div>

      {/* Focus Proof share card sheet */}
      {showShareCard && (
        <ShareCard
          emoji={sessionPhase === 'flow' ? '🌊' : sessionPhase === 'release' ? '🌿' : '🌱'}
          title={
            sessionPhase === 'flow'
              ? t('focus.proofTitleFlow', { min: sessionMinutes })
              : t('focus.proofTitleSteady', { min: sessionMinutes })
          }
          subtitle={t('focus.proofSubtitle')}
          stat={`${sessionMinutes} min`}
          onClose={() => setShowShareCard(false)}
        />
      )}
    </div>
  )
})
