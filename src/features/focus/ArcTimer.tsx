import { memo, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useMotion } from '@/shared/hooks/useMotion'
import i18n from '@/i18n'
import type { SessionPhase } from '@/types'

// -- Arc geometry ---------------------------------------------------------------

const RADIUS = 90
const STROKE = 10
export const ARC_SIZE = (RADIUS + STROKE + 2) * 2
const CX = ARC_SIZE / 2
const CY = ARC_SIZE / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const PHASE_COLORS: Record<SessionPhase, string> = {
  idle:     'var(--color-surface-raised)',
  struggle: '#7B72FF',   // indigo — getting into it
  release:  '#4ECDC4',   // teal — releasing resistance
  flow:     '#4ECDC4',   // teal — deep flow
  recovery: '#F59E0B',   // amber — recovery (Research #8: #F59E0B not neon #FFE66D)
}

// -- Helpers --------------------------------------------------------------------

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

// -- Component -----------------------------------------------------------------

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
  const { shouldAnimate, t } = useMotion()
  const scale = size / ARC_SIZE
  const [showHint, setShowHint] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setShowHint(false), 8000)
    return () => clearTimeout(timer)
  }, [])

  const offset = CIRCUMFERENCE * (1 - Math.max(0, Math.min(1, progress)))
  const arcColor = PHASE_COLORS[phase]
  const isPulsing = phase === 'struggle' && shouldAnimate

  // Block 3b: surprise mode forces digits hidden, countup shows elapsed
  const isSurprise = timerStyle === 'surprise'
  const isCountup  = timerStyle === 'countup'

  // O-9: in surprise mode hide the progress stroke completely — no time cue visible.
  // Background track still shows (passive ring); only the orb signals the session.
  const progressStroke = isSurprise ? 'transparent' : arcColor

  const displaySeconds = isCountup ? elapsedSeconds : remainingSeconds
  const effectiveShowDigits = isSurprise ? false : showDigits
  const effectiveDisable = isSurprise ? true : disableToggle
  const handleClick = effectiveDisable ? undefined : onToggleDigits

  // Screen reader: announce phase transitions (only fires when phase text changes)
  const phaseLabel =
    phase === 'struggle' ? i18n.t('focus.arcPhaseGettingStarted') :
    phase === 'release'  ? i18n.t('focus.arcPhaseMomentum') :
    phase === 'flow'     ? i18n.t('focus.arcPhaseDeepFlow') :
    phase === 'recovery' ? i18n.t('focus.arcPhaseRecovery') : ''

  return (
    <motion.button
      onClick={handleClick}
      // Bolt 6.16: smooth size transition between phases
      animate={{ width: size, height: size }}
      transition={shouldAnimate ? { duration: 1.2, ease: 'easeInOut' } : { duration: 0 }}
      className="relative flex items-center justify-center focus:outline-none"
      style={{ cursor: effectiveDisable ? 'default' : 'pointer' }}
      aria-label={
        isSurprise || effectiveDisable ? i18n.t('focus.arcTimerSurprise') :
        effectiveShowDigits ? i18n.t('focus.arcTimerHideDigits') : i18n.t('focus.arcTimerShowDigits')
      }
    >
      {/* Announce phase transitions to screen readers — content only changes on phase transition, not per-second */}
      <span className="sr-only" aria-live="polite" aria-atomic="true">{phaseLabel}</span>
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
          style={{ stroke: 'var(--color-elevated)' }}
          strokeWidth={STROKE}
        />

        {/* Progress arc — transparent in surprise mode (O-9) */}
        <circle
          cx={CX} cy={CY} r={RADIUS}
          fill="none"
          stroke={progressStroke}
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
          /* Surprise mode: ambient breathing orb — intentionally zen, no digits */
          <motion.div
            className="rounded-full"
            animate={shouldAnimate ? {
              scale: [0.7, 1.15, 0.7],
              opacity: [0.2, 0.55, 0.2],
            } : { opacity: 0.35 }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              width: ARC_SIZE * 0.22 * scale,
              height: ARC_SIZE * 0.22 * scale,
              background: `radial-gradient(circle, ${arcColor}90 0%, ${arcColor}20 70%, transparent 100%)`,
            }}
          />
        ) : effectiveShowDigits && !effectiveDisable ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center"
          >
            <span
              role="timer"
              aria-live="off"
              aria-label={isCountup ? `${formatTime(displaySeconds)} elapsed` : `${formatTime(displaySeconds)} remaining`}
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
              <span className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>elapsed</span>
            )}
          </motion.div>
        ) : !effectiveDisable ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            className="text-xs"
            style={{ color: 'var(--color-text-muted)' }}
          >
            tap
          </motion.div>
        ) : null}
      </div>

      {/* Tap hint — shown for first 8 seconds */}
      <AnimatePresence>
        {showHint && !isSurprise && !disableToggle && (
          <motion.p
            initial={shouldAnimate ? { opacity: 0 } : {}}
            animate={{ opacity: 1 }}
            exit={shouldAnimate ? { opacity: 0 } : {}}
            transition={t()}
            className="absolute bottom-0 translate-y-full mt-2 text-xs text-center whitespace-nowrap"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {i18n.t('focus.arcTapHint')}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

// -- memo wrapper — ArcTimer re-renders every 250ms from the parent interval --
// With memo, React skips re-render when props are shallowly equal.
// Critical for SVG-heavy arc animation performance.
export const ArcTimer = memo(ArcTimerInner)
