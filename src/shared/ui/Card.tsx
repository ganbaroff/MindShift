/**
 * Card — surface container primitive
 *
 * Replaces the ~20+ repeated pattern:
 *   className="... rounded-2xl ..."
 *   style={{ background: '#1E2136', border: '1px solid rgba(255,255,255,0.06)' }}
 *
 * All colors are CSS variables — calm mode desaturation works automatically.
 *
 * Props:
 *   elevated  — uses --color-elevated (#252840) instead of --color-card (#1E2136)
 *   accent    — tints the border with a semantic color
 *   glass     — adds backdrop-filter blur (for banners/overlays)
 *   onClick   — makes the card interactive (adds cursor-pointer + tap affordance)
 */

import { type CSSProperties, type ReactNode } from 'react'

const ACCENT_BORDER: Record<string, string> = {
  primary: 'var(--color-border-accent)',
  teal:    'var(--color-border-teal)',
  gold:    'var(--color-border-gold)',
}

interface CardProps {
  children:  ReactNode
  elevated?: boolean
  accent?:   'primary' | 'teal' | 'gold'
  glass?:    boolean
  className?: string
  style?:    CSSProperties
  onClick?:  () => void
}

export function Card({
  children,
  elevated = false,
  accent,
  glass = false,
  className = '',
  style,
  onClick,
}: CardProps) {
  const bg     = elevated ? 'var(--color-elevated)' : 'var(--color-card)'
  const border = accent ? ACCENT_BORDER[accent] : 'var(--color-border-subtle)'

  const baseStyle: CSSProperties = {
    background:     bg,
    border:         `1px solid ${border}`,
    borderRadius:   '1rem',   // rounded-2xl
    ...(glass && { backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }),
    ...(onClick && { cursor: 'pointer' }),
    ...style,
  }

  return (
    <div
      className={className}
      style={baseStyle}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick() } : undefined}
    >
      {children}
    </div>
  )
}
