import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { BottomNav } from './BottomNav'
import { useStore } from '@/store'
import { useMotion } from '@/shared/hooks/useMotion'
import { InstallBanner } from '@/shared/ui/InstallBanner'

export function AppShell() {
  const sessionPhase = useStore(s => s.sessionPhase)
  const isInFocus = sessionPhase === 'flow' || sessionPhase === 'struggle' || sessionPhase === 'release'
  const { shouldAnimate, t } = useMotion()

  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [showBackOnline, setShowBackOnline] = useState(false)

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
      {/* Hide bottom nav + install nudge during deep focus phases */}
      {!isInFocus && <BottomNav />}
      {!isInFocus && <InstallBanner />}
    </div>
  )
}
