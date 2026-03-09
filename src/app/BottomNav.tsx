import { useLocation, useNavigate } from 'react-router-dom'
import { Home, Timer, ListTodo, Music, TrendingUp } from 'lucide-react'
import { motion } from 'motion/react'
import { cn } from '@/shared/lib/cn'

const NAV_ITEMS = [
  { path: '/',         icon: Home,       label: 'Home'     },
  { path: '/tasks',    icon: ListTodo,   label: 'Tasks'    },
  { path: '/focus',    icon: Timer,      label: 'Focus'    },
  { path: '/audio',    icon: Music,      label: 'Audio'    },
  { path: '/progress', icon: TrendingUp, label: 'Progress' },
] as const

export function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-50"
      style={{
        background: 'rgba(26, 29, 46, 0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(108, 99, 255, 0.15)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex items-center justify-around px-2 py-2">
        {NAV_ITEMS.map(({ path, icon: Icon, label }) => {
          const active = location.pathname === path
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={cn(
                'flex flex-col items-center gap-0.5 min-w-[44px] min-h-[44px] px-3 py-1.5 rounded-xl transition-all duration-150',
                active
                  ? 'text-primary'
                  : 'text-muted hover:text-text'
              )}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
            >
              {active && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute inset-0 rounded-xl"
                  style={{ background: 'rgba(108, 99, 255, 0.12)' }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-[10px] font-medium leading-none">{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
