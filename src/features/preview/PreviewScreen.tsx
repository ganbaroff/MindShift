/**
 * PreviewScreen — Deferred Authentication (P0 Gen Z)
 *
 * 30-second interactive demo: live Surprise timer + EnergyPicker + phase animation.
 * Shows app value BEFORE requiring auth — reduces Day 1 abandonment.
 * No store mutations, no persistence, no auth dependency.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { useMotion } from '@/shared/hooks/useMotion'
import type { SessionPhase, EnergyLevel } from '@/types'

const DEMO_DURATION = 30 // seconds
const PHASE_THRESHOLDS = { release: 10, flow: 20 } // simplified for demo

const PHASE_COLORS: Record<SessionPhase, string> = {
  idle:     'var(--color-surface-raised)',
  struggle: 'var(--color-primary)',
  release:  'var(--color-teal)',
  flow:     'var(--color-teal)',
  recovery: 'var(--color-gold)',
}

const PHASE_LABELS: Record<string, { label: string; desc: string }> = {
  struggle: { label: 'Struggle', desc: 'The hardest part — you just started' },
  release:  { label: 'Release',  desc: 'Resistance is fading...' },
  flow:     { label: 'Flow',     desc: 'Deep focus. Beautiful.' },
}

const ENERGY_EMOJI: Record<number, string> = {
  1: '😴', 2: '😐', 3: '🙂', 4: '😊', 5: '⚡',
}

export default function PreviewScreen() {
  const navigate = useNavigate()
  const { shouldAnimate, t } = useMotion()
  const [elapsed, setElapsed] = useState(0)
  const [energy, setEnergy] = useState<EnergyLevel | null>(null)
  const [showCTA, setShowCTA] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const phase: SessionPhase =
    elapsed >= PHASE_THRESHOLDS.flow ? 'flow' :
    elapsed >= PHASE_THRESHOLDS.release ? 'release' : 'struggle'

  const phaseColor = PHASE_COLORS[phase]
  const progress = elapsed / DEMO_DURATION

  // Timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsed(prev => {
        if (prev >= DEMO_DURATION) {
          if (timerRef.current) clearInterval(timerRef.current)
          setShowCTA(true)
          return DEMO_DURATION
        }
        return prev + 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  const handleContinue = useCallback(() => {
    navigate('/auth')
  }, [navigate])

  const handleSkipToApp = useCallback(() => {
    // Enter as guest (same as "Continue without account" on AuthScreen)
    localStorage.removeItem('ms_signed_out')
    const guestId = `guest_${crypto.randomUUID()}`
    localStorage.setItem('ms_guest_id', guestId)
    navigate('/')
    window.location.reload()
  }, [navigate])

  // SVG arc
  const RADIUS = 72
  const STROKE = 8
  const SIZE = (RADIUS + STROKE + 2) * 2
  const CX = SIZE / 2
  const CY = SIZE / 2
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS
  const offset = CIRCUMFERENCE * (1 - progress)

  return (
    <div
      className="fixed inset-0 flex flex-col items-center overflow-y-auto"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* Ambient glow */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{ opacity: [0.05, 0.12, 0.05] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          background: `radial-gradient(ellipse 60% 40% at 50% 30%, ${phaseColor}40, transparent)`,
        }}
      />

      <div className="flex-1 min-h-[30px]" />

      <div className="relative z-10 w-full max-w-[360px] flex flex-col items-center px-5 py-6 gap-6">
        {/* Brand */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={t()}
        >
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>MindShift</h1>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-primary)', letterSpacing: '0.08em' }}>
            Try it — 30 seconds
          </p>
        </motion.div>

        {/* Timer arc */}
        <motion.div
          className="relative flex items-center justify-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...t(), delay: 0.15 }}
        >
          {/* Phase pulsing glow */}
          {phase === 'struggle' && shouldAnimate && (
            <motion.div
              className="absolute inset-0 rounded-full pointer-events-none"
              animate={{ opacity: [0.1, 0.3, 0.1] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              style={{ background: `radial-gradient(circle, ${phaseColor}30, transparent)` }}
            />
          )}

          <svg
            width={SIZE} height={SIZE}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            style={{ transform: 'rotate(-90deg)' }}
          >
            <circle cx={CX} cy={CY} r={RADIUS} fill="none" stroke="#252840" strokeWidth={STROKE} />
            <circle
              cx={CX} cy={CY} r={RADIUS}
              fill="none"
              stroke={phaseColor}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 0.8s linear, stroke 0.5s ease' }}
            />
          </svg>

          {/* Center — surprise orb */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.div
              className="rounded-full"
              animate={shouldAnimate ? { scale: [0.7, 1.1, 0.7], opacity: [0.2, 0.5, 0.2] } : {}}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                width: 40, height: 40,
                background: `radial-gradient(circle, ${phaseColor}80 0%, ${phaseColor}20 60%, transparent 100%)`,
              }}
            />
          </div>
        </motion.div>

        {/* Phase label */}
        <AnimatePresence mode="wait">
          <motion.div
            key={phase}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="text-center"
          >
            <p className="text-sm font-semibold" style={{ color: phaseColor }}>
              {PHASE_LABELS[phase]?.label ?? ''}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              {PHASE_LABELS[phase]?.desc ?? ''}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Energy picker (appears after 5s) */}
        <AnimatePresence>
          {elapsed >= 5 && !energy && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={t()}
              className="w-full rounded-2xl p-4"
              style={{ background: 'var(--color-surface-card)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <p className="text-xs text-center mb-3" style={{ color: 'var(--color-text-muted)' }}>
                How's your energy right now?
              </p>
              <div className="flex justify-center gap-3">
                {([1, 2, 3, 4, 5] as EnergyLevel[]).map(level => (
                  <button
                    key={level}
                    onClick={() => setEnergy(level)}
                    className="w-11 h-11 rounded-full text-xl flex items-center justify-center transition-all"
                    style={{
                      background: energy === level ? 'rgba(78,205,196,0.15)' : 'var(--color-surface-raised)',
                      border: `1.5px solid ${energy === level ? '#4ECDC4' : 'rgba(255,255,255,0.06)'}`,
                    }}
                    aria-label={`Energy level ${level}`}
                  >
                    {ENERGY_EMOJI[level]}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Energy response */}
        <AnimatePresence>
          {energy && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ ...t('expressive') }}
              className="rounded-2xl px-4 py-3 text-center"
              style={{ background: 'rgba(78,205,196,0.08)', border: '1px solid rgba(78,205,196,0.15)' }}
            >
              <p className="text-sm" style={{ color: 'var(--color-teal)' }}>
                {energy <= 2 ? "Low energy? MindShift adapts — fewer tasks, gentler pace."
                  : energy >= 4 ? "High energy! MindShift will match your momentum."
                  : "MindShift adjusts to exactly where you are."}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CTA — shown at end or can be tapped early */}
        <motion.div
          className="flex flex-col gap-3 w-full mt-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: showCTA || elapsed >= 15 ? 1 : 0.4 }}
          transition={{ duration: 0.3 }}
        >
          <button
            onClick={handleContinue}
            className="w-full py-4 rounded-2xl font-semibold text-base"
            style={{ background: 'var(--color-primary)', color: '#FFFFFF' }}
          >
            Save your progress →
          </button>
          <button
            onClick={handleSkipToApp}
            className="w-full py-3 text-sm"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Try without account
          </button>
        </motion.div>
      </div>

      <div className="flex-1 min-h-[40px]" />
    </div>
  )
}
