import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { X } from 'lucide-react'
import { useMotion } from '@/shared/hooks/useMotion'

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
  const { t: transition, shouldAnimate } = useMotion()
  const { t } = useTranslation()

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
            background: 'var(--color-glass-dark)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid var(--color-banner-border)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            maxWidth: 400,
            margin: '0 auto',
          }}
          initial={shouldAnimate ? { y: 40, opacity: 0 } : false}
          animate={shouldAnimate ? { y: 0, opacity: 1 } : { opacity: 1 }}
          exit={shouldAnimate ? { y: 40, opacity: 0 } : { opacity: 0 }}
          transition={transition()}
        >
          <div className="flex-1 min-w-0">
            <p className="text-[10px] sm:text-[11px] leading-relaxed" style={{ color: 'var(--color-text-subtle)' }}>
              {t('cookie.message')}{' '}
              <strong style={{ color: 'var(--color-muted)' }}>{t('cookie.noTracking')}</strong>{' '}
              <Link
                to="/cookie-policy"
                className="underline decoration-dotted focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1E2136] rounded-sm"
                style={{ color: 'var(--color-primary)' }}
                onClick={dismiss}
              >
                {t('cookie.learnMore')}
              </Link>
            </p>
          </div>
          <button
            onClick={dismiss}
            aria-label="Dismiss cookie notice"
            className="shrink-0 p-1 rounded-lg transition-colors hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1E2136]"
            style={{ color: 'var(--color-text-subtle)' }}
          >
            <X size={14} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
