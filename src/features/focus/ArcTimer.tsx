import { motion } from 'motion/react'
import { useMotion } from '@/shared/hooks/useMotion'
import type { SessionPhase } from '@/types'

// ── Arc geometry ───────────────────────────────────────────────────────────────

const RADIUS = 90
const STROKE = 10
export const ARC_SIZE = (RADIUS + STROKE + 2) * 2
const CX = ARC_SIZE / 2
const CY = ARC_SIZE / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const PHASE_COLORS: Record<SessionPhase, string> = {
  idle:     '#2D3150',
  struggle: '#6C63FF',   // indigo — getting into it
  release:  '#4ECDC4',   // teal — releasing resistance
  flow:     '#4ECDC4',   // teal — deep flow
  recovery: '#F59E0B',   // amber — recovery (Research #8: #F59E0B not neon #FFE66D)
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  progress: number        // 1.0 = full, 0.0 = empty
  remainingSeconds: number
  phase: SessionPhase
  showDigits: boolean
  onToggleDigits: () => void
  disableToggle?: boolean // Bolt 6.16: in flow phase, disable tap-to-show
  size?: number
}

export function ArcTimer({ progress, remainingSeconds, phase, showDigits, onToggleDigits, disableToggle = false, size = ARC_SIZE }: Props) {
  const { shouldAnimate } = useMotion()
  const scale = size / ARC_SIZE

  const offset = CIRCUMFERENCE * (1 - Math.max(0, Math.min(1, progress)))
  const arcColor = PHASE_COLORS[phase]
  const isPulsing = phase === 'struggle' && shouldAnimate

  const handleClick = disableToggle ? undefined : onToggleDigits

  return (
    <motion.button
      onClick={handleClick}
      // Bolt 6.16: smooth size transition between phases
      animate={{ width: size, height: size }}
      transition={shouldAnimate ? { duration: 1.2, ease: 'easeInOut' } : { duration: 0 }}
      className="relative flex items-center justify-center focus:outline-none"
      style={{ cursor: disableToggle ? 'default' : 'pointer' }}
      aria-label={disableToggle ? 'Focus timer' : showDigits ? 'Hide time' : 'Show remaining time'}
    >
      {/* Struggle phase pulsing glow */}
      {isPulsing && (
        <motion.div
          className="absolute inset-0 rounded-full pointer-events-none"
          animate={{ opacity: [0.15, 0.35, 0.15] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{ background: `radial-gradient(ellipse 80% 80% at 50% 50%, ${arcColor}40, transparent)` }}
        />
      )}

      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${ARC_SIZE} ${ARC_SIZE}`}
        style={{ transform: 'rotate(-90deg)' }}
        aria-hidden="true"
      >
        {/* Background track */}
        <circle
          cx={CX} cy={CY} r={RADIUS}
          fill="none"
          stroke="#2D3150"
          strokeWidth={STROKE}
        />

        {/* Progress arc */}
        <circle
          cx={CX} cy={CY} r={RADIUS}
          fill="none"
          stroke={arcColor}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          style={{
            transition: !shouldAnimate ? 'none' : 'stroke-dashoffset 0.8s linear, stroke 0.5s ease',
          }}
        />
      </svg>

      {/* Center content — shows when tapped (hidden in flow phase) */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
      >
        {showDigits && !disableToggle ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center"
          >
            <span
              className="font-mono font-bold tabular-nums"
              style={{
                fontSize: ARC_SIZE * 0.18 * scale,
                color: arcColor,
                letterSpacing: '0.02em',
              }}
            >
              {formatTime(remainingSeconds)}
            </span>
          </motion.div>
        ) : !disableToggle ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            className="text-xs"
            style={{ color: '#8B8BA7' }}
          >
            tap
          </motion.div>
        ) : null}
      </div>
    </motion.button>
  )
}
