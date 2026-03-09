import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { X } from 'lucide-react'

const CONSENT_KEY = 'ms_cookie_consent'
const CONSENT_VERSION = '2026-03'

/**
 * CookieBanner — shown once on first visit, dismissed permanently.
 *
 * Uses cookieless analytics so no consent is legally required for analytics
 * (EU ePrivacy / GDPR). We show the notice anyway for transparency.
 * Only stores one localStorage key: ms_cookie_consent.
 *
 * Does NOT block usage — ADHD-friendly, purely informational.
 */
export function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CONSENT_KEY)
      if (!stored) setVisible(true)
    } catch {
      // localStorage unavailable (private mode on some browsers) — skip banner
    }
  }, [])

  const dismiss = () => {
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify({
        accepted: true,
        version: CONSENT_VERSION,
        at: new Date().toISOString(),
      }))
    } catch {
      // ignore
    }
    setVisible(false)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="region"
          aria-label="Cookie notice"
          className="fixed left-3 right-3 z-50 rounded-xl px-3.5 py-2.5 flex items-center gap-2.5"
          style={{
            // Sit above the BottomNav (≈64 px) + iOS safe area + 8 px breathing room
            bottom: 'calc(64px + env(safe-area-inset-bottom) + 8px)',
            background: 'rgba(22,25,40,0.95)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(45,49,80,0.6)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            maxWidth: 400,
            margin: '0 auto',
          }}
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 200 }}
        >
          <div className="flex-1 min-w-0">
            <p className="text-[11px] leading-relaxed" style={{ color: '#7B7B95' }}>
              We use localStorage &{' '}
              <strong style={{ color: '#9B9BB0' }}>cookieless</strong> analytics.{' '}
              <Link
                to="/cookie-policy"
                className="underline decoration-dotted"
                style={{ color: '#7B72FF' }}
                onClick={dismiss}
              >
                Learn more
              </Link>
            </p>
          </div>
          <button
            onClick={dismiss}
            aria-label="Dismiss cookie notice"
            className="shrink-0 p-1 rounded-lg transition-colors hover:bg-white/5"
            style={{ color: '#6B7280' }}
          >
            <X size={14} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
