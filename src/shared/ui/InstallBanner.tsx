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

export function InstallBanner() {
  const { state, install, dismiss } = useInstallPrompt()

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
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 80 }}
          transition={{ type: 'spring', damping: 24, stiffness: 260 }}
          role="banner"
          aria-label="Install MindShift as an app"
          className="fixed bottom-24 left-0 right-0 z-40 px-4 pointer-events-none"
        >
          <div
            className="max-w-[480px] mx-auto rounded-2xl px-4 py-3 flex items-start gap-3 pointer-events-auto"
            style={{
              background: 'linear-gradient(135deg, #252840 0%, #1A1D2E 100%)',
              border: '1px solid rgba(108,99,255,0.35)',
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
                  <p className="text-sm font-semibold" style={{ color: '#E8E8F0' }}>
                    Install MindShift
                  </p>
                  <p className="text-xs mt-0.5 leading-relaxed" style={{ color: '#8B8BA7' }}>
                    Works offline · No browser bar · Feels native
                  </p>
                  <button
                    onClick={handleInstall}
                    className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95"
                    style={{ background: '#6C63FF', color: '#fff' }}
                  >
                    <Download size={13} />
                    Install app
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold" style={{ color: '#E8E8F0' }}>
                    Add to Home Screen
                  </p>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: '#8B8BA7' }}>
                    Tap{' '}
                    <span
                      className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded"
                      style={{ background: '#2D3150', color: '#E8E8F0' }}
                    >
                      <Share size={10} />
                      Share
                    </span>
                    , then{' '}
                    <span
                      className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded"
                      style={{ background: '#2D3150', color: '#E8E8F0' }}
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
              className="flex-shrink-0 p-1 rounded-lg transition-colors mt-0.5"
              style={{ color: '#8B8BA7' }}
            >
              <X size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
