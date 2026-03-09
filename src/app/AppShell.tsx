import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { useStore } from '@/store'
import { InstallBanner } from '@/shared/ui/InstallBanner'

export function AppShell() {
  const sessionPhase = useStore(s => s.sessionPhase)
  const isInFocus = sessionPhase === 'flow' || sessionPhase === 'struggle' || sessionPhase === 'release'

  return (
    <div className="flex flex-col h-full max-w-[480px] mx-auto relative">
      {/* Skip navigation link — keyboard users jump past bottom nav to main content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-medium"
        style={{ background: '#7B72FF', color: '#fff' }}
      >
        Skip to main content
      </a>
      <main id="main-content" className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>
      {/* Hide bottom nav + install nudge during deep focus phases */}
      {!isInFocus && <BottomNav />}
      {!isInFocus && <InstallBanner />}
    </div>
  )
}
