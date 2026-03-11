import { memo } from 'react'
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
  idle:     '#252840',
  struggle: '#7B72FF',   // indigo — getting into it
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
  elapsedSeconds?: number  // Block 3b: for countup mode
  phase: SessionPhase
  showDigits: boolean
  onToggleDigits: () => void
  disableToggle?: boolean // Bolt 6.16: in flow phase, disable tap-to-show
  size?: number
  /** Block 3b: timer display mode — countdown (default), countup, surprise (arc-only) */
  timerStyle?: 'countdown' | 'countup' | 'surprise'
}

function ArcTimerInner({
  progress, remainingSeconds, elapsedSeconds = 0,
  phase, showDigits, onToggleDigits,
  disableToggle = false, size = ARC_SIZE,
  timerStyle = 'countdown',
}: Props) {
  const { shouldAnimate } = useMotion()
  const scale = size / ARC_SIZE

  const offset = CIRCUMFERENCE * (1 - Math.max(0, Math.min(1, progress)))
  const arcColor = PHASE_COLORS[phase]
  const isPulsing = phase === 'struggle' && shouldAnimate

  // Block 3b: surprise mode forces digits hidden, countup shows elapsed
  const isSurprise = timerStyle === 'surprise'
  const isCountup  = timerStyle === 'countup'

  const displaySeconds = isCountup ? elapsedSeconds : remainingSeconds
  const effectiveShowDigits = isSurprise ? false : showDigits
  const effectiveDisable = isSurprise ? true : disableToggle
  const handleClick = effectiveDisable ? undefined : onToggleDigits

  return (
    <motion.button
      onClick={handleClick}
      // Bolt 6.16: smooth size transition between phases
      animate={{ width: size, height: size }}
      transition={shouldAnimate ? { duration: 1.2, ease: 'easeInOut' } : { duration: 0 }}
      className="relative flex items-center justify-center focus:outline-none"
      style={{ cursor: effectiveDisable ? 'default' : 'pointer' }}
      aria-label={
        isSurprise ? 'Focus timer — arc mode' :
        effectiveDisable ? 'Focus timer' :
        effectiveShowDigits ? 'Hide time' : 'Show remaining time'
      }
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
          stroke="#252840"
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

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {isSurprise ? (
          /* Surprise mode: show only the arc ring, no digits, no tap hint */
          null
        ) : effectiveShowDigits && !effectiveDisable ? (
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
              {formatTime(displaySeconds)}
            </span>
            {isCountup && (
              <span className="text-xs mt-0.5" style={{ color: '#8B8BA7' }}>elapsed</span>
            )}
          </motion.div>
        ) : !effectiveDisable ? (
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

// ── memo wrapper — ArcTimer re-renders every 250ms from the parent interval ──
// With memo, React skips re-render when props are shallowly equal.
// Critical for SVG-heavy arc animation performance.
export const ArcTimer = memo(ArcTimerInner)
