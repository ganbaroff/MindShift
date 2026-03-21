import { useLocation, useNavigate } from 'react-router-dom'
import { Sun, Timer, ListTodo, CalendarDays, Settings } from 'lucide-react'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useMotion } from '@/shared/hooks/useMotion'
import { usePalette } from '@/shared/hooks/usePalette'
import { cn } from '@/shared/lib/cn'

const NAV_ITEMS = [
  { path: '/today',     icon: Sun,          labelKey: 'nav.today'    },
  { path: '/tasks',     icon: ListTodo,     labelKey: 'nav.tasks'    },
  { path: '/focus',     icon: Timer,        labelKey: 'nav.focus'    },
  { path: '/calendar',  icon: CalendarDays, labelKey: 'nav.upcoming' },
  { path: '/settings',  icon: Settings,     labelKey: 'nav.settings' },
] as const

export function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const { shouldAnimate, t: transition } = useMotion()
  const { t } = useTranslation()
  const palette = usePalette()

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-30"
      style={{
        background: 'var(--color-glass-dark)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(123, 114, 255, 0.15)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex items-center justify-around px-2 py-2">
        {NAV_ITEMS.map(({ path, icon: Icon, labelKey }) => {
          const active = location.pathname === path
          const label = t(labelKey)
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={cn(
                'relative flex flex-col items-center gap-0.5 min-w-[44px] min-h-[44px] px-3 py-1.5 rounded-xl transition-all duration-150',
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
                  style={{
                    background: `${palette.primary}1E`,   // 12% alpha
                    // Research #8: no glow in calm mode (glowAlpha = 0)
                    boxShadow: palette.glowAlpha > 0
                      ? `0 0 12px ${palette.primary}26`   // 15% alpha glow
                      : 'none',
                  }}
                  transition={shouldAnimate ? transition() : { duration: 0 }}
                />
              )}
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-[11px] font-medium leading-none">{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
