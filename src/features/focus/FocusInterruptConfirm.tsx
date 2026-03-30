/**
 * FocusInterruptConfirm — "Are you sure you want to leave?" screen
 *
 * Extracted from FocusScreen.tsx.
 */

import { useTranslation } from 'react-i18next'

interface FocusInterruptConfirmProps {
  elapsedMin: number
  onResume: () => void
  onConfirmStop: () => void
}

export function FocusInterruptConfirm({ elapsedMin, onResume, onConfirmStop }: FocusInterruptConfirmProps) {
  const { t } = useTranslation()

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen px-6 text-center"
      style={{ background: 'var(--color-bg)' }}
    >
      <div className="text-4xl mb-4">⏸️</div>
      <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
        {t('focus.leaveSession')}
      </h2>
      <p className="text-sm mb-8 max-w-xs leading-relaxed" style={{ color: 'var(--color-muted)' }}>
        {t('focus.focusedFor', { min: elapsedMin })}
      </p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={onResume}
          aria-label="Resume focus session"
          className="w-full py-3.5 rounded-2xl font-semibold text-sm transition-all duration-200"
          style={{
            background: 'var(--color-primary-alpha)',
            border: '1.5px solid var(--color-primary)',
            color: 'var(--color-primary)',
          }}
        >
          {t('focus.keepGoing')}
        </button>
        <button
          onClick={onConfirmStop}
          aria-label="End focus session"
          className="w-full py-3 rounded-2xl font-medium text-sm transition-all duration-200"
          style={{
            background: 'transparent',
            border: '1px solid var(--color-border-subtle)',
            color: 'var(--color-muted)',
          }}
        >
          {t('focus.endSession')}
        </button>
      </div>
    </div>
  )
}
