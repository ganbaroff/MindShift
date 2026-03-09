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
          className="fixed bottom-20 left-4 right-4 z-50 rounded-2xl px-4 py-3 flex items-start gap-3"
          style={{
            background: '#1A1D2E',
            border: '1px solid #2D3150',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            maxWidth: 480,
            margin: '0 auto',
          }}
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 200 }}
        >
          <div className="flex-1 min-w-0">
            <p className="text-xs leading-relaxed" style={{ color: '#8B8BA7' }}>
              We use localStorage for app functionality and{' '}
              <strong style={{ color: '#E8E8F0' }}>cookieless</strong> analytics that never
              identify you.{' '}
              <Link
                to="/cookie-policy"
                className="underline"
                style={{ color: '#6C63FF' }}
                onClick={dismiss}
              >
                Learn more
              </Link>
            </p>
          </div>
          <button
            onClick={dismiss}
            aria-label="Dismiss cookie notice"
            className="shrink-0 p-1 rounded-lg transition-colors"
            style={{ color: '#8B8BA7' }}
          >
            <X size={16} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
