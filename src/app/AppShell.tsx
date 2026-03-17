import { useState, useEffect, useRef, useCallback } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { BottomNav } from './BottomNav'
import { useStore } from '@/store'
import { useMotion } from '@/shared/hooks/useMotion'
import { InstallBanner } from '@/shared/ui/InstallBanner'

// ── S-7 Anti-scroll friction nudge ────────────────────────────────────────────
// Non-blocking: shows 5 s then disappears on its own.
function SessionFrictionNudge({ onDismiss }: { onDismiss: () => void }) {
  useEffect(() => {
    const id = setTimeout(onDismiss, 5000)
    return () => clearTimeout(id)
  }, [onDismiss])
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="fixed bottom-20 left-1/2 z-40 -translate-x-1/2 px-4 py-2.5 rounded-2xl flex items-center gap-2"
      style={{
        maxWidth: 320, width: '90%',
        background: 'rgba(123,114,255,0.15)',
        border: '1px solid rgba(123,114,255,0.30)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <span className="text-base">⏱️</span>
      <p className="text-[12px] flex-1 leading-snug" style={{ color: '#C8C0FF' }}>
        Your focus session is still running 🌱
      </p>
      <button onClick={onDismiss} className="text-[10px] px-2 py-0.5 rounded-lg shrink-0" style={{ color: '#7B72FF' }}>
        Got it
      </button>
    </motion.div>
  )
}

export function AppShell() {
  const sessionPhase = useStore(s => s.sessionPhase)
  const isInFocus = sessionPhase === 'flow' || sessionPhase === 'struggle' || sessionPhase === 'release'
  const { shouldAnimate, t } = useMotion()
  const location = useLocation()
  const prevPathRef = useRef(location.pathname)

  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [showBackOnline, setShowBackOnline] = useState(false)
  const [showFriction, setShowFriction] = useState(false)
  const dismissFriction = useCallback(() => setShowFriction(false), [])

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

  return (
    <div className="flex flex-col h-full max-w-[480px] mx-auto relative">
      {/* Skip navigation link — keyboard users jump past bottom nav to main content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-medium focus:bg-[#7B72FF] focus:text-white"
      >
        Skip to main content
      </a>
      <main id="main-content" className="flex-1 overflow-y-auto pb-[calc(64px+env(safe-area-inset-bottom))]">
        {/* Offline status indicator — top of content area */}
        <AnimatePresence>
          {(!isOnline || showBackOnline) && (
            <motion.div
              initial={shouldAnimate ? { height: 0, opacity: 0 } : {}}
              animate={{ height: 'auto', opacity: 1 }}
              exit={shouldAnimate ? { height: 0, opacity: 0 } : {}}
              transition={t()}
              className="overflow-hidden text-center text-xs py-1.5 px-4 sticky top-0 z-20"
              style={{
                background: isOnline
                  ? 'rgba(78,205,196,0.15)'
                  : 'rgba(245,158,11,0.15)',
                color: isOnline ? '#4ECDC4' : '#F59E0B',
              }}
            >
              {isOnline
                ? 'Back online — changes synced ✓'
                : 'Offline — changes saved locally'}
            </motion.div>
          )}
        </AnimatePresence>
        <Outlet />
      </main>
      {/* S-7 friction nudge — shown when navigating away from active session */}
      <AnimatePresence>
        {showFriction && <SessionFrictionNudge onDismiss={dismissFriction} />}
      </AnimatePresence>

      {/* Hide bottom nav + install nudge during deep focus phases */}
      {!isInFocus && <BottomNav />}
      {!isInFocus && <InstallBanner />}
    </div>
  )
}
