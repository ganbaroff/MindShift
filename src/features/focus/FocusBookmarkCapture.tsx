/**
 * FocusBookmarkCapture — "Where did you leave off?" screen after stopping early
 *
 * Extracted from FocusScreen.tsx.
 */

import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useMotion } from '@/shared/hooks/useMotion'

interface FocusBookmarkCaptureProps {
  bookmarkText: string
  setBookmarkText: (v: string) => void
  onSave: () => void
  onSkip: () => void
}

export function FocusBookmarkCapture({ bookmarkText, setBookmarkText, onSave, onSkip }: FocusBookmarkCaptureProps) {
  const { shouldAnimate, t: motionT } = useMotion()
  const { t } = useTranslation()

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen px-6 text-center"
      style={{ background: 'var(--color-bg)' }}
    >
      <motion.div
        initial={shouldAnimate ? { opacity: 0, scale: 0.95 } : {}}
        animate={{ opacity: 1, scale: 1 }}
        transition={motionT()}
        className="flex flex-col items-center w-full max-w-xs"
      >
        <div className="text-4xl mb-4">📌</div>
        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
          {t('focus.parkProgress')}
        </h2>
        <p className="text-sm mb-6 leading-relaxed" style={{ color: 'var(--color-muted)' }}>
          {t('focus.parkProgressDesc')}
        </p>
        <input
          value={bookmarkText}
          onChange={e => setBookmarkText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && bookmarkText.trim()) onSave() }}
          placeholder={t('focus.parkPlaceholder')}
          autoFocus
          className="w-full px-4 py-3 rounded-xl text-sm outline-none mb-4"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text)' }}
        />
        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={onSave}
            disabled={!bookmarkText.trim()}
            className="w-full py-3.5 rounded-2xl font-semibold text-sm transition-all duration-200"
            style={{
              background: bookmarkText.trim() ? 'var(--color-primary-alpha)' : 'var(--color-card)',
              border: `1.5px solid ${bookmarkText.trim() ? 'var(--color-primary)' : 'var(--color-border-subtle)'}`,
              color: bookmarkText.trim() ? 'var(--color-primary)' : 'var(--color-muted)',
            }}
          >
            {t('focus.saveAndExit')}
          </button>
          <button
            onClick={onSkip}
            className="w-full py-3 rounded-2xl font-medium text-sm transition-all duration-200"
            style={{
              background: 'transparent',
              border: '1px solid var(--color-border-subtle)',
              color: 'var(--color-muted)',
            }}
          >
            {t('common.skip')}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
