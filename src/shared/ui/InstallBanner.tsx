// ── InstallBanner ─────────────────────────────────────────────────────────────
// Contextual "install the app" nudge — appears once, dismissed forever.
//
// Android/Chrome → native install sheet via beforeinstallprompt.
// iOS/Safari     → step-by-step Share → Add to Home Screen instructions.
// Already installed or dismissed → renders nothing.

import { motion, AnimatePresence } from 'motion/react'
import { X, Share, Plus, Download } from 'lucide-react'
import { useInstallPrompt } from '@/shared/hooks/useInstallPrompt'
import { hapticTap } from '@/shared/lib/haptic'
import { useMotion } from '@/shared/hooks/useMotion'

export function InstallBanner() {
  const { state, install, dismiss } = useInstallPrompt()
  const { t, shouldAnimate } = useMotion()

  const handleInstall = () => {
    hapticTap()
    void install()
  }

  const handleDismiss = () => {
    hapticTap()
    dismiss()
  }

  const visible = state === 'android' || state === 'ios'

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={shouldAnimate ? { opacity: 0, y: 80 } : false}
          animate={shouldAnimate ? { opacity: 1, y: 0 } : { opacity: 1 }}
          exit={shouldAnimate ? { opacity: 0, y: 80 } : { opacity: 0 }}
          transition={t()}
          role="banner"
          aria-label="Install MindShift as an app"
          className="fixed left-0 right-0 z-40 px-4 pointer-events-none bottom-[calc(64px+env(safe-area-inset-bottom))]"
        >
          <div
            className="max-w-[480px] mx-auto rounded-2xl px-4 py-3 flex items-start gap-3 pointer-events-auto"
            style={{
              background: 'linear-gradient(135deg, var(--color-elevated) 0%, var(--color-card) 100%)',
              border: '1px solid var(--color-border-accent)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
            }}
          >
            {/* App icon */}
            <img
              src="/icon-192.png"
              alt=""
              aria-hidden
              width={44}
              height={44}
              className="rounded-xl flex-shrink-0 mt-0.5"
            />

            {/* Text */}
            <div className="flex-1 min-w-0">
              {state === 'android' ? (
                <>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                    Install MindShift
                  </p>
                  <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--color-muted)' }}>
                    Works offline · No browser bar · Full screen
                  </p>
                  <button
                    onClick={handleInstall}
                    className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95"
                    style={{ background: 'var(--color-primary)', color: '#fff' }}
                  >
                    <Download size={13} />
                    Install app
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                    Add to Home Screen
                  </p>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--color-muted)' }}>
                    Tap{' '}
                    <span
                      className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded"
                      style={{ background: 'var(--color-elevated)', color: 'var(--color-text)' }}
                    >
                      <Share size={10} />
                      Share
                    </span>
                    , then{' '}
                    <span
                      className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded"
                      style={{ background: 'var(--color-elevated)', color: 'var(--color-text)' }}
                    >
                      <Plus size={10} />
                      Add to Home Screen
                    </span>
                    . Opens like a real app — no browser bar.
                  </p>
                </>
              )}
            </div>

            {/* Dismiss */}
            <button
              onClick={handleDismiss}
              aria-label="Dismiss install banner"
              className="flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors"
              style={{ color: 'var(--color-muted)' }}
            >
              <X size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
