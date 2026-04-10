/**
 * Mochi — MindShift's focus mascot
 *
 * A soft, round creature that acts as a non-verbal emotional anchor.
 * Research basis: Finch's virtual pet model, Connector psychotype "body double" concept.
 * No images — pure SVG + Framer Motion for offline-first, fast load.
 *
 * States:
 *   idle        — gentle float, neutral expression
 *   focused     — narrowed eyes, purple glow (body double mode)
 *   celebrating — bouncy jump, sparkle stars, big smile
 *   resting     — closed crescent eyes, reduced motion
 *   low-energy  — slightly droopy, softer palette
 */

import { motion, AnimatePresence } from 'motion/react'
import { useMotion } from '@/shared/hooks/useMotion'

export type MascotState = 'idle' | 'focused' | 'celebrating' | 'resting' | 'low-energy' | 'encouraging'

interface MascotProps {
  state?: MascotState
  size?: number
  label?: string   // aria-label
  className?: string
}

// -- State → visual config ------------------------------------------------------

const STATE_CONFIG: Record<MascotState, {
  bodyColor1: string
  bodyColor2: string
  glowColor: string
  cheeks: boolean
  smile: string
}> = {
  idle: {
    bodyColor1: '#7B72FF',
    bodyColor2: '#4ECDC4',
    glowColor: 'transparent',
    cheeks: true,
    smile: 'M32 50 Q40 56 48 50',
  },
  focused: {
    bodyColor1: '#5A53D4',
    bodyColor2: '#3DBDB5',
    glowColor: 'rgba(123,114,255,0.25)',
    cheeks: false,
    smile: 'M34 51 Q40 54 46 51',
  },
  celebrating: {
    bodyColor1: '#7C73FF',
    bodyColor2: '#5EDDD4',
    glowColor: 'rgba(78,205,196,0.3)',
    cheeks: true,
    smile: 'M29 50 Q40 58 51 50',
  },
  resting: {
    bodyColor1: '#4A4580',
    bodyColor2: '#2E9990',
    glowColor: 'transparent',
    cheeks: false,
    smile: 'M34 51 Q40 54 46 51',
  },
  'low-energy': {
    bodyColor1: '#5B5499',
    bodyColor2: '#3BBAB1',
    glowColor: 'transparent',
    cheeks: false,
    smile: 'M33 52 Q40 55 47 52',
  },
  encouraging: {
    bodyColor1: '#7B72FF',
    bodyColor2: '#4ECDC4',
    glowColor: 'rgba(78,205,196,0.20)',
    cheeks: true,
    smile: 'M30 50 Q40 57 50 50',
  },
}

// -- Sparkle star (for celebrating) --------------------------------------------

function Star({ x, y, delay }: { x: number; y: number; delay: number }) {
  return (
    <motion.g
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: [0, 1, 1, 0], scale: [0, 1.2, 1, 0], rotate: [0, 45] }}
      transition={{ duration: 1.0, delay, repeat: Infinity, repeatDelay: 1.5 }}
    >
      <text x={x} y={y} fontSize={10} textAnchor="middle" style={{ fill: 'var(--color-gold)' }}>✦</text>
    </motion.g>
  )
}

// -- ZZZ (for resting) ---------------------------------------------------------

function ZZZ() {
  return (
    <motion.g
      animate={{ y: [0, -8], opacity: [0, 1, 1, 0] }}
      transition={{ duration: 2, repeat: Infinity, repeatDelay: 0.5 }}
    >
      <text x={60} y={20} fontSize={8} fill="#8B8BA7" fontWeight="bold">zzz</text>
    </motion.g>
  )
}

// -- Eyes ----------------------------------------------------------------------

function Eyes({ state }: { state: MascotState }) {
  if (state === 'resting') {
    // Closed crescent eyes
    return (
      <g>
        <path d="M25 37 Q30 33 35 37" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M45 37 Q50 33 55 37" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </g>
    )
  }

  if (state === 'focused') {
    // Narrowed eyes (more determined)
    return (
      <g>
        {/* Left eye */}
        <ellipse cx="30" cy="37" rx="5" ry="4" fill="white" />
        <circle cx="31" cy="38" r="2.5" fill="#1A1D2E" />
        <circle cx="32" cy="36.5" r="1" fill="white" />
        {/* Determined brow */}
        <path d="M25 32 L35 33.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        {/* Right eye */}
        <ellipse cx="50" cy="37" rx="5" ry="4" fill="white" />
        <circle cx="51" cy="38" r="2.5" fill="#1A1D2E" />
        <circle cx="52" cy="36.5" r="1" fill="white" />
        {/* Determined brow */}
        <path d="M45 33.5 L55 32" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      </g>
    )
  }

  if (state === 'low-energy') {
    // Droopy half-open eyes
    return (
      <g>
        <circle cx="30" cy="37" r="5" fill="white" />
        <circle cx="31" cy="38" r="2.5" fill="#1A1D2E" />
        <path d="M25 36 Q30 34 35 36" stroke="rgba(255,255,255,0.6)" strokeWidth="2" fill="none" strokeLinecap="round" />
        <circle cx="50" cy="37" r="5" fill="white" />
        <circle cx="51" cy="38" r="2.5" fill="#1A1D2E" />
        <path d="M45 36 Q50 34 55 36" stroke="rgba(255,255,255,0.6)" strokeWidth="2" fill="none" strokeLinecap="round" />
      </g>
    )
  }

  // Default: idle / celebrating — open, bright eyes
  return (
    <g>
      <circle cx="30" cy="37" r="5.5" fill="white" />
      <circle cx="31" cy="38" r="2.8" fill="#1A1D2E" />
      <circle cx="32" cy="36" r="1.2" fill="white" />
      <circle cx="50" cy="37" r="5.5" fill="white" />
      <circle cx="51" cy="38" r="2.8" fill="#1A1D2E" />
      <circle cx="52" cy="36" r="1.2" fill="white" />
    </g>
  )
}

// -- Main component -------------------------------------------------------------

export function Mascot({ state = 'idle', size = 80, label, className }: MascotProps) {
  const { shouldAnimate } = useMotion()
  const cfg = STATE_CONFIG[state]

  // Body animate targets (keyframes only — no transition embedded)
  const mascotAnimate = !shouldAnimate ? {} : state === 'idle'
    ? { y: [0, -5, 0] }
    : state === 'celebrating'
    ? { y: [0, -10, 0, -7, 0], scale: [1, 1.05, 1, 1.03, 1] }
    : state === 'focused'
    ? { scale: [1, 1.02, 1] }
    : {}

  // Body transition config (kept separate to satisfy Framer Motion v12 Easing types)
  const mascotTransition = !shouldAnimate ? {} : state === 'idle'
    ? { duration: 2.5, repeat: Infinity, ease: 'easeInOut' as const }
    : state === 'celebrating'
    ? { duration: 0.8, repeat: Infinity }
    : state === 'focused'
    ? { duration: 3, repeat: Infinity, ease: 'easeInOut' as const }
    : {}

  return (
    <motion.div
      className={className}
      style={{ position: 'relative', width: size, height: size }}
      role="img"
      aria-label={label ?? `Mochi is ${state}`}
    >
      {/* Glow ring — focused/celebrating only */}
      {cfg.glowColor !== 'transparent' && shouldAnimate && (
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{
            position: 'absolute',
            inset: -8,
            borderRadius: '50%',
            background: cfg.glowColor,
            filter: 'blur(8px)',
          }}
        />
      )}

      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 80 80"
        animate={mascotAnimate}
        transition={mascotTransition}
      >
        <defs>
          <linearGradient id={`mochi-grad-${state}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={cfg.bodyColor1} />
            <stop offset="100%" stopColor={cfg.bodyColor2} />
          </linearGradient>
        </defs>

        {/* Shadow (grounding) */}
        {shouldAnimate && (
          <ellipse cx="40" cy="76" rx="16" ry="4" fill="rgba(0,0,0,0.15)" />
        )}

        {/* Left ear bump */}
        <ellipse cx="22" cy="35" rx="8" ry="10" fill={`url(#mochi-grad-${state})`} />
        {/* Right ear bump */}
        <ellipse cx="58" cy="35" rx="8" ry="10" fill={`url(#mochi-grad-${state})`} />

        {/* Main body */}
        <ellipse cx="40" cy="46" rx="28" ry="26" fill={`url(#mochi-grad-${state})`} />

        {/* Inner belly highlight */}
        <ellipse cx="40" cy="50" rx="16" ry="13" fill="rgba(255,255,255,0.1)" />

        {/* Eyes */}
        <Eyes state={state} />

        {/* Cheeks (blush) */}
        {cfg.cheeks && (
          <g>
            <ellipse cx="19" cy="46" rx="5" ry="3" fill="rgba(255,150,150,0.25)" />
            <ellipse cx="61" cy="46" rx="5" ry="3" fill="rgba(255,150,150,0.25)" />
          </g>
        )}

        {/* Smile */}
        <path
          d={cfg.smile}
          stroke="white"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />
      </motion.svg>

      {/* Sparkles (celebrating) */}
      <AnimatePresence>
        {state === 'celebrating' && shouldAnimate && (
          <motion.svg
            key="sparkles"
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
            width={size}
            height={size}
            viewBox="0 0 80 80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Star x={8}  y={15} delay={0.0} />
            <Star x={72} y={18} delay={0.3} />
            <Star x={65} y={65} delay={0.6} />
            <Star x={12} y={68} delay={0.9} />
          </motion.svg>
        )}
      </AnimatePresence>

      {/* ZZZ (resting) */}
      <AnimatePresence>
        {state === 'resting' && shouldAnimate && (
          <motion.svg
            key="zzz"
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
            width={size}
            height={size}
            viewBox="0 0 80 80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ZZZ />
          </motion.svg>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
