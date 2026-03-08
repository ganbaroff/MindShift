import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { useStore } from '@/store'

export function AppShell() {
  const sessionPhase = useStore(s => s.sessionPhase)
  const isInFocus = sessionPhase === 'flow' || sessionPhase === 'struggle' || sessionPhase === 'release'

  return (
    <div className="flex flex-col h-full max-w-[480px] mx-auto relative">
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>
      {/* Hide bottom nav during deep focus phases */}
      {!isInFocus && <BottomNav />}
    </div>
  )
}
