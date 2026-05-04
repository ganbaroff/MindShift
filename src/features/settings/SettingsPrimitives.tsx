/**
 * SettingsPrimitives — shared UI building blocks for Settings
 *
 * Section, Chip, Toggle used across all settings section components.
 */

import { motion } from 'motion/react'
import { useMotion } from '@/shared/hooks/useMotion'

export function Section({ label, children }: { label: string; children: React.ReactNode }) {
  const { shouldAnimate } = useMotion()
  return (
    <motion.div
      initial={shouldAnimate ? { opacity: 0, y: 12 } : false}
      animate={shouldAnimate ? { opacity: 1, y: 0 } : false}
      className="rounded-2xl p-3"
      style={{ backgroundColor: 'var(--color-surface-card)' }}
    >
      <p className="text-[11px] uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
      {children}
    </motion.div>
  )
}

export function Chip({
  selected, onClick, emoji, label,
}: {
  selected: boolean
  onClick: () => void
  emoji: string
  label: string
}) {
  const { shouldAnimate } = useMotion()
  return (
    <motion.button
      whileTap={shouldAnimate ? { scale: 0.97 } : undefined}
      onClick={onClick}
      aria-pressed={selected}
      className="flex-1 h-9 rounded-full flex items-center justify-center gap-1 text-[13px] font-medium focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:outline-none"
      style={{
        backgroundColor: selected ? 'rgba(123,114,255,0.15)' : 'var(--color-surface-raised)',
        borderWidth: selected ? 1.5 : 1,
        borderStyle: 'solid',
        borderColor: selected ? 'var(--color-primary)' : 'var(--color-border-subtle)',
        color: selected ? 'var(--color-primary)' : 'var(--color-text-muted)',
      }}
    >
      {emoji} {label}
    </motion.button>
  )
}

export function Toggle({
  checked, onChange, label, hint,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  hint?: string
}) {
  const { shouldAnimate } = useMotion()
  return (
    <button onClick={() => onChange(!checked)} aria-pressed={checked} aria-label={label} className="flex items-center justify-between w-full gap-3 rounded-xl focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:outline-none">
      <span className="flex flex-col items-start text-left">
        <span className="text-[14px]" style={{ color: 'var(--color-text-primary)' }}>{label}</span>
        {hint && <span className="text-[11px] mt-0.5 leading-snug" style={{ color: 'var(--color-text-muted)' }}>{hint}</span>}
      </span>
      <div
        className="w-11 h-6 rounded-full p-0.5 transition-colors"
        style={{ backgroundColor: checked ? 'var(--color-primary)' : 'var(--color-surface-raised)' }}
      >
        <motion.div
          animate={{ x: checked ? 20 : 0 }}
          transition={shouldAnimate ? undefined : { duration: 0 }}
          className="w-5 h-5 rounded-full"
          style={{ backgroundColor: '#FFFFFF' }}
        />
      </div>
    </button>
  )
}
