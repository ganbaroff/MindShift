/**
 * BreathworkRitual — 3-second pre-session transition ritual.
 *
 * Research #1 (Sensory UX): "Cyclic sighing — deep nasal inhalation followed
 * by prolonged oral exhalation — significantly shifts autonomic states and
 * minimises the brain's error-related negativity (ERN) signal."
 *
 * UX rationale: Reduces attention residue from the previous task before
 * the user enters the focus timer. Users in ADHD community frequently report
 * that cold-starting a focus session without a transition causes immediate
 * distraction and task-switching anxiety.
 *
 * Duration: 3 cycles × (1.5s inhale + 1.5s exhale) = 9s total.
 * Skip button always visible — never gate the user.
 */

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { hapticBreathe } from '@/shared/lib/haptic'
import { useMotion } from '@/shared/hooks/useMotion'

interface BreathworkRitualProps {
  onComplete: () => void
  onSkip: () => void
}

const INHALE_MS = 1500
const EXHALE_MS = 1500
const CYCLE_MS  = INHALE_MS + EXHALE_MS
const CYCLES    = 3

type BreathPhase = 'inhale' | 'exhale'

export function BreathworkRitual({ onComplete, onSkip }: BreathworkRitualProps) {
  const { shouldAnimate } = useMotion()
  const [cycle, setCycle]       = useState(0)          // 0-indexed
  const [phase, setPhase]       = useState<BreathPhase>('inhale')
  const [done, setDone]         = useState(false)

  useEffect(() => {
    // If reduced motion is on, skip straight to complete after a beat
    if (!shouldAnimate) {
      const t = setTimeout(onComplete, 400)
      return () => clearTimeout(t)
    }

    let cancelled = false
    let phaseTimer: ReturnType<typeof setTimeout>
    let cycleTimer: ReturnType<typeof setTimeout>

    const runCycle = (c: number) => {
      if (cancelled || c >= CYCLES) {
        if (!cancelled) setDone(true)
        return
      }

      // Inhale phase
      setPhase('inhale')
      hapticBreathe()

      phaseTimer = setTimeout(() => {
        if (cancelled) return
        // Exhale phase
        setPhase('exhale')
        hapticBreathe()

        cycleTimer = setTimeout(() => {
          if (cancelled) return
          setCycle(c + 1)
          runCycle(c + 1)
        }, EXHALE_MS)
      }, INHALE_MS)
    }

    runCycle(0)

    return () => {
      cancelled = true
      clearTimeout(phaseTimer)
      clearTimeout(cycleTimer)
    }
  }, [shouldAnimate, onComplete])

  // Auto-complete after all cycles finish
  useEffect(() => {
    if (!done) return
    const t = setTimeout(onComplete, 400)
    return () => clearTimeout(t)
  }, [done, onComplete])

  const handleSkip = useCallback(() => {
    onSkip()
  }, [onSkip])

  const progress = (cycle + (phase === 'exhale' ? 0.5 : 0)) / CYCLES
  const circleScale = phase === 'inhale' ? 1.35 : 0.85

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center min-h-screen px-6 text-center"
      style={{ background: 'var(--color-bg, #0F1120)' }}
    >
      {/* Progress dots */}
      <div className="flex gap-2 mb-10">
        {Array.from({ length: CYCLES }).map((_, i) => (
          <motion.div
            key={i}
            className="rounded-full"
            animate={{
              width:           i <= cycle ? 20 : 6,
              height:          6,
              backgroundColor: i < cycle  ? '#4ECDC4'
                             : i === cycle ? '#7B72FF'
                             : 'rgba(255,255,255,0.12)',
            }}
            transition={{ duration: 0.3 }}
          />
        ))}
      </div>

      {/* Breathing orb */}
      <div className="relative flex items-center justify-center mb-8">
        {/* Outer glow ring */}
        <motion.div
          className="absolute rounded-full"
          animate={{
            scale: shouldAnimate ? (circleScale * 1.2) : 1,
            opacity: 0.15,
          }}
          transition={{ duration: phase === 'inhale' ? INHALE_MS / 1000 : EXHALE_MS / 1000, ease: 'easeInOut' }}
          style={{ width: 160, height: 160, backgroundColor: '#7B72FF' }}
        />
        {/* Core orb */}
        <motion.div
          className="rounded-full flex items-center justify-center"
          animate={{
            scale: shouldAnimate ? circleScale : 1,
            backgroundColor: phase === 'inhale' ? '#7B72FF' : '#4ECDC4',
          }}
          transition={{ duration: phase === 'inhale' ? INHALE_MS / 1000 : EXHALE_MS / 1000, ease: 'easeInOut' }}
          style={{ width: 120, height: 120 }}
        >
          <motion.span
            className="text-[36px]"
            animate={{ scale: phase === 'inhale' ? 1.1 : 0.9 }}
            transition={{ duration: 0.5 }}
          >
            {phase === 'inhale' ? '🌬️' : '😮‍💨'}
          </motion.span>
        </motion.div>
      </div>

      {/* Phase label */}
      <AnimatePresence mode="wait">
        <motion.div
          key={phase}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
        >
          <p className="text-[22px] font-semibold" style={{ color: '#E8E8F0' }}>
            {phase === 'inhale' ? 'Breathe in...' : 'Breathe out...'}
          </p>
          <p className="text-[14px] mt-1" style={{ color: '#8B8BA7' }}>
            {done ? 'Ready to focus 🎯' : `Breath ${cycle + 1} of ${CYCLES}`}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Progress bar */}
      <div className="w-48 h-1 rounded-full mt-6 overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
        <motion.div
          className="h-full rounded-full"
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.3 }}
          style={{ backgroundColor: '#7B72FF' }}
        />
      </div>

      {/* Skip */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleSkip}
        className="mt-10 text-[13px] px-6 py-2 rounded-full"
        style={{ color: '#8B8BA7', backgroundColor: 'rgba(255,255,255,0.05)' }}
        aria-label="Skip breathing ritual"
      >
        Skip →
      </motion.button>
    </motion.div>
  )
}
