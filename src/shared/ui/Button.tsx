import { motion } from 'motion/react'
import { cn } from '@/shared/lib/cn'
import type { ReactNode, MouseEventHandler } from 'react'

// ── Explicit, conflict-free Button props ──────────────────────────────────────
// We don't spread all HTMLButtonElement props onto motion.button to avoid
// type conflicts between React DOM handlers and Framer Motion handlers.

interface ButtonProps {
  children?: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  className?: string
  type?: 'button' | 'submit' | 'reset'
  onClick?: MouseEventHandler<HTMLButtonElement>
  'aria-label'?: string
  'aria-expanded'?: boolean
  'aria-pressed'?: boolean
  form?: string
  name?: string
  value?: string
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  children,
  disabled,
  type = 'button',
  onClick,
  ...ariaProps
}: ButtonProps) {
  const base = 'relative inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 select-none disabled:opacity-50 disabled:cursor-not-allowed'

  const variants = {
    primary:   'bg-primary text-white hover:opacity-90 shadow-lg shadow-primary/20',
    secondary: 'bg-secondary/15 text-secondary border border-secondary/30 hover:bg-secondary/25',
    ghost:     'bg-transparent text-muted border border-border hover:text-text hover:border-primary/40',
    danger:    'bg-warning/15 text-warning border border-warning/30 hover:bg-warning/25',
  }

  const sizes = {
    sm: 'h-8 px-3 text-xs gap-1.5',
    md: 'h-11 px-4 text-sm gap-2 min-w-[44px]',
    lg: 'h-14 px-6 text-base gap-2.5',
  }

  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      transition={{ duration: 0.15 }}
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      type={type}
      onClick={onClick}
      aria-label={ariaProps['aria-label']}
      aria-expanded={ariaProps['aria-expanded']}
      aria-pressed={ariaProps['aria-pressed']}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : children}
    </motion.button>
  )
}
