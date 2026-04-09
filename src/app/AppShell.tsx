import { lazy, Suspense, useState, useEffect, useRef, useCallback } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary'
import { BottomNav } from './BottomNav'
import { useStore } from '@/store'
import { useMotion } from '@/shared/hooks/useMotion'
import { useDeadlineReminders } from '@/shared/hooks/useDeadlineReminders'
import { usePushSubscription } from '@/shared/hooks/usePushSubscription'
import { usePendingSessionRecovery } from '@/shared/hooks/usePendingSessionRecovery'
import { InstallBanner } from '@/shared/ui/InstallBanner'
import { Mascot } from '@/shared/ui/Mascot'

const LazyMochiChat = lazy(() =>
  import('@/features/mochi/MochiChat').then(m => ({ default: m.MochiChat }))
)

// ── S-7 Anti-scroll friction nudge ────────────────────────────────────────────
// Non-blocking: shows 5 s then disappears on its own.
// If user has an If-Then rule, shows that instead of generic copy (Research #16).
function SessionFrictionNudge({ onDismiss }: { onDismiss: () => void }) {
  const { t } = useTranslation()
  const ifThenRules = useStore(s => s.ifThenRules)
  const firstRule = ifThenRules[0]

  useEffect(() => {
    const id = setTimeout(onDismiss, 5000)
    return () => clearTimeout(id)
  }, [onDismiss])

  // WCAG 2.1.1: keyboard users can dismiss with Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onDismiss() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onDismiss])
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="fixed left-1/2 z-40 -translate-x-1/2 px-4 py-2.5 rounded-2xl flex items-center gap-2"
      style={{
        bottom: 'calc(80px + env(safe-area-inset-bottom))',
        maxWidth: 480, width: '90%',
        background: 'rgba(123,114,255,0.15)',
        border: '1px solid rgba(123,114,255,0.30)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <span className="text-base">⏱️</span>
      <p className="text-[12px] flex-1 leading-snug" style={{ color: 'var(--color-primary-light)' }}>
        {firstRule
          ? `${firstRule.when} → ${firstRule.will}`
          : t('appShell.sessionRunning')}
      </p>
      <button onClick={onDismiss} className="text-[10px] px-2 py-0.5 rounded-lg shrink-0 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:outline-none" style={{ color: 'var(--color-primary)' }}>
        {t('appShell.gotIt')}
      </button>
    </motion.div>
  )
}

export function AppShell() {
  const sessionPhase = useStore(s => s.sessionPhase)
  const isInFocus = sessionPhase === 'flow' || sessionPhase === 'struggle' || sessionPhase === 'release'
  const mochiChatOpenCount = useStore(s => s.mochiChatOpenCount)
  const incrementMochiChatOpen = useStore(s => s.incrementMochiChatOpen)
  const { shouldAnimate, t: transition } = useMotion()
  const { t } = useTranslation()
  const location = useLocation()
  const prevPathRef = useRef(location.pathname)

  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [showBackOnline, setShowBackOnline] = useState(false)
  const [showFriction, setShowFriction] = useState(false)
  const [mochiChatOpen, setMochiChatOpen] = useState(false)
  const dismissFriction = useCallback(() => setShowFriction(false), [])

  const showMochiPulse = mochiChatOpenCount < 3

  // Deadline reminders — gentle, tone-aware nudges for upcoming due dates
  useDeadlineReminders()
  // Push subscription — persists Web Push sub to Supabase for background reminders
  usePushSubscription()
  // Pending session recovery — toasts if a session was interrupted by tab close
  usePendingSessionRecovery()

  // S-7: detect navigation away from /focus while session is active
  useEffect(() => {
    const prev = prevPathRef.current
    const curr = location.pathname
    prevPathRef.current = curr
    if (prev === '/focus' && curr !== '/focus' && isInFocus) {
      setShowFriction(true)
    }
  }, [location.pathname, isInFocus])

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setShowBackOnline(true)
      setTimeout(() => setShowBackOnline(false), 2500)
    }
    const handleOffline = () => {
      setIsOnline(false)
      setShowBackOnline(false)
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleMochiOpen = useCallback(() => {
    setMochiChatOpen(true)
    incrementMochiChatOpen()
  }, [incrementMochiChatOpen])

  const handleMochiClose = useCallback(() => {
    setMochiChatOpen(false)
  }, [])

  return (
    <div className="flex flex-col h-full max-w-[480px] mx-auto relative sm:my-0 sm:rounded-none md:shadow-lg md:border-x md:border-[rgba(255,255,255,0.04)]">
      {/* Skip navigation link — keyboard users jump past bottom nav to main content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-medium focus:bg-[#7B72FF] focus:text-white"
      >
        {t('nav.skipToContent', 'Skip to main content')}
      </a>
      <main id="main-content" className="flex-1 overflow-y-auto pb-[calc(64px+env(safe-area-inset-bottom))]">
        {/* Offline status indicator — top of content area */}
        <AnimatePresence>
          {(!isOnline || showBackOnline) && (
            <motion.div
              initial={shouldAnimate ? { height: 0, opacity: 0 } : {}}
              animate={{ height: 'auto', opacity: 1 }}
              exit={shouldAnimate ? { height: 0, opacity: 0 } : {}}
              transition={transition()}
              className="overflow-hidden text-center text-xs py-1.5 px-4 sticky top-0 z-20"
              style={{
                background: isOnline
                  ? 'rgba(78,205,196,0.15)'
                  : 'rgba(245,158,11,0.15)',
                color: isOnline ? 'var(--color-teal)' : 'var(--color-gold)',
              }}
            >
              {isOnline
                ? t('appShell.backOnline')
                : t('appShell.offline')}
            </motion.div>
          )}
        </AnimatePresence>
        <Outlet />
      </main>
      {/* S-7 friction nudge — shown when navigating away from active session */}
      <AnimatePresence>
        {showFriction && <SessionFrictionNudge onDismiss={dismissFriction} />}
      </AnimatePresence>

      {/* Mochi chat FAB — visible when not in active focus session */}
      {!isInFocus && (
        <motion.button
          onClick={handleMochiOpen}
          className="fixed z-30 rounded-full focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
          style={{
            right: 16,
            bottom: 'calc(176px + env(safe-area-inset-bottom))',
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            background: 'var(--color-surface-raised)',
            padding: 6,
          }}
          aria-label="Chat with Mochi"
          initial={shouldAnimate ? { scale: 0, opacity: 0 } : {}}
          animate={{ scale: 1, opacity: 1 }}
          transition={shouldAnimate ? { type: 'spring', delay: 0.5, damping: 15 } : { duration: 0 }}
        >
          <Mascot state="idle" size={40} label="Mochi" />
          {/* Pulse hint for first 3 opens — gated by useMotion */}
          {shouldAnimate && showMochiPulse && (
            <motion.div
              className="absolute inset-0 rounded-full motion-reduce:animate-none"
              style={{ border: '2px solid rgba(78,205,196,0.5)' }}
              animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
        </motion.button>
      )}

      {/* Mochi chat overlay — lazy loaded, isolated so crashes don't collapse the shell */}
      {mochiChatOpen && (
        <ErrorBoundary fallback={null}>
          <Suspense fallback={null}>
            <LazyMochiChat open={mochiChatOpen} onClose={handleMochiClose} />
          </Suspense>
        </ErrorBoundary>
      )}

      {/* Hide bottom nav + install nudge during deep focus phases */}
      {!isInFocus && <BottomNav />}
      {!isInFocus && <InstallBanner />}
    </div>
  )
}
