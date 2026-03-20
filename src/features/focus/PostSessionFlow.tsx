/**
 * PostSessionFlow — Block 2c refactor
 *
 * Screens shown immediately after a focus session ends:
 *   - 'nature-buffer' : 2-min breathing break + post-session energy check-in
 *   - 'recovery-lock' : Suggested 10-min rest after a 90-min+ session
 *
 * Non-punitive design:
 *   - Recovery lock is a *suggestion*, not a hard gate — hyperfocus bypass always visible
 *   - No countdown language, no shame, no missed-opportunity framing
 */

import { memo, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useMotion } from '@/shared/hooks/useMotion'
import type { EnergyLevel, SessionPhase } from '@/types'
import { ENERGY_LABELS, ENERGY_EMOJI } from '@/shared/lib/constants'

// ── Hyperfocus Autopsy threshold (B-6 backlog item) ───────────────────────────
// Research: ADHD users in hyperfocus often lose awareness of time + body state.
// After 45+ min sessions, a brief non-judgmental reflection seeds self-awareness.
// Three options chosen to cover the full spectrum without assigning success/failure.
const HYPERFOCUS_THRESHOLD_MIN = 45

const AUTOPSY_OPTIONS = [
  { key: 'flow',     emoji: '🌊', label: 'Found my flow',   desc: 'Deep concentration, time flew' },
  { key: 'steady',   emoji: '🌱', label: 'Steady progress', desc: 'Focused but aware of time' },
  { key: 'scattered',emoji: '🌀', label: 'Bit scattered',   desc: 'Distractions crept in' },
] as const

// ── Emotionally-adaptive closing messages ────────────────────────────────────
// emotionalReactivity shapes the post-session tone: high = extra-gentle,
// steady = direct, moderate/null = default warm message.

function getClosingMessage(
  emotionalReactivity: 'high' | 'moderate' | 'steady' | null | undefined,
  sessionMinutes: number,
  sessionPhase: SessionPhase | undefined,
): string {
  const isShort = sessionMinutes < 10
  const reachedFlow = sessionPhase === 'flow'

  if (emotionalReactivity === 'high') {
    if (isShort) return 'Short sessions count. Your brain needed a break, and you listened.'
    if (reachedFlow) return 'You found your flow despite the noise. That takes real strength.'
    return 'You showed up and did the work. Let your mind settle now.'
  }
  if (emotionalReactivity === 'steady') {
    if (reachedFlow) return 'Flow reached. Good session. Rest up.'
    return 'Session done. Take a beat before the next one.'
  }
  // moderate or null — default warm message
  return 'Session done. Let your mind settle before the next one.'
}

// ── Nature Buffer Screen ───────────────────────────────────────────────────────

interface NatureBufferProps {
  bufferSeconds: number
  postEnergyLogged: boolean
  onSetEnergyLevel: (level: EnergyLevel) => void
  onSkip: () => void
  /** Session length in minutes — drives Hyperfocus Autopsy (B-6) */
  sessionMinutes?: number
  /** Emotional reactivity level — adapts closing message tone */
  emotionalReactivity?: 'high' | 'moderate' | 'steady' | null
  /** Phase reached during the session — used with emotionalReactivity for tone */
  sessionPhase?: SessionPhase
}

const ENERGY_OPTIONS = [
  { level: 1 as EnergyLevel, emoji: ENERGY_EMOJI[0], label: ENERGY_LABELS[0] },
  { level: 2 as EnergyLevel, emoji: ENERGY_EMOJI[1], label: ENERGY_LABELS[1] },
  { level: 3 as EnergyLevel, emoji: ENERGY_EMOJI[2], label: ENERGY_LABELS[2] },
  { level: 4 as EnergyLevel, emoji: ENERGY_EMOJI[3], label: ENERGY_LABELS[3] },
  { level: 5 as EnergyLevel, emoji: ENERGY_EMOJI[4], label: ENERGY_LABELS[4] },
]

export const NatureBuffer = memo(function NatureBuffer({
  bufferSeconds, postEnergyLogged, onSetEnergyLevel, onSkip, sessionMinutes = 0,
  emotionalReactivity, sessionPhase,
}: NatureBufferProps) {
  const { shouldAnimate, t } = useMotion()
  const [autopsyPick, setAutopsyPick] = useState<string | null>(null)
  // High emotional reactivity + short struggle session: hide autopsy (could feel judgmental)
  const isShortStruggle = sessionMinutes < 10 && sessionPhase === 'struggle'
  const hideAutopsyForReactivity = emotionalReactivity === 'high' && isShortStruggle
  const showAutopsy = sessionMinutes >= HYPERFOCUS_THRESHOLD_MIN && !hideAutopsyForReactivity
  const bm = Math.floor(bufferSeconds / 60)
  const bs = bufferSeconds % 60

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen px-6 text-center"
      style={{ background: '#0F1117' }}
    >
      <motion.div
        initial={shouldAnimate ? { opacity: 0, scale: 0.9 } : {}}
        animate={{ opacity: 1, scale: 1 }}
        transition={t()}
        className="flex flex-col items-center"
      >
        <div className="text-5xl mb-6">🌿</div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: '#4ECDC4' }}>
          Time to breathe 🌿
        </h2>
        <p className="text-sm mb-8 max-w-xs leading-relaxed" style={{ color: '#8B8BA7' }}>
          {getClosingMessage(emotionalReactivity, sessionMinutes, sessionPhase)}
        </p>

        <div
          className="px-8 py-4 rounded-2xl mb-6"
          style={{ background: '#1E2136', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p className="font-mono text-3xl font-bold" style={{ color: '#4ECDC4' }}>
            {bm}:{bs.toString().padStart(2, '0')}
          </p>
          <p className="text-xs mt-1" style={{ color: '#8B8BA7' }}>until next session</p>
        </div>

        {/* Hyperfocus Autopsy — B-6: shown when session ≥ 45 min */}
        {showAutopsy && (
          <AnimatePresence>
            <motion.div
              initial={shouldAnimate ? { opacity: 0, y: 12 } : {}}
              animate={{ opacity: 1, y: 0 }}
              transition={t()}
              className="w-full max-w-xs mb-4 p-3 rounded-2xl"
              style={{ background: '#1E2136', border: '1px solid rgba(123,114,255,0.15)' }}
            >
              <p className="text-xs font-medium mb-1 text-center" style={{ color: '#7B72FF' }}>
                {sessionMinutes}+ minutes — how did that feel? ✨
              </p>
              <p className="text-[11px] mb-3 text-center" style={{ color: '#5A5B72' }}>
                No right answer — just notice
              </p>
              <div className="flex gap-2">
                {AUTOPSY_OPTIONS.map(({ key, emoji, label }) => (
                  <button
                    key={key}
                    onClick={() => setAutopsyPick(key)}
                    className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl text-xs transition-all duration-150"
                    style={{
                      background: autopsyPick === key ? 'rgba(123,114,255,0.18)' : '#252840',
                      border: `1px solid ${autopsyPick === key ? '#7B72FF' : 'rgba(255,255,255,0.06)'}`,
                      color: autopsyPick === key ? '#C8C0FF' : '#8B8BA7',
                    }}
                    aria-pressed={autopsyPick === key}
                  >
                    <span className="text-base leading-none">{emoji}</span>
                    <span className="text-[10px] leading-tight text-center">{label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {/* Block 3d: Post-session energy delta check-in */}
        {!postEnergyLogged && (
          <div
            className="w-full max-w-xs mb-4 p-3 rounded-2xl"
            style={{ background: '#1E2136', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <p className="text-xs font-medium mb-2 text-center" style={{ color: '#8B8BA7' }}>
              How do you feel after that session?
            </p>
            <div className="flex justify-between gap-1">
              {ENERGY_OPTIONS.map(({ level, emoji, label }) => (
                <button
                  key={level}
                  onClick={() => onSetEnergyLevel(level)}
                  className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl text-xs transition-all duration-150 min-h-[52px]"
                  style={{ background: '#252840', border: '1px solid rgba(255,255,255,0.06)' }}
                  aria-label={`Post-session energy: ${label}`}
                >
                  <span className="text-lg leading-none">{emoji}</span>
                  <span className="text-[9px]" style={{ color: '#8B8BA7' }}>{label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={onSkip}
          className="px-6 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.06)',
            color: '#8B8BA7',
          }}
          aria-label="Skip nature buffer"
        >
          I'm ready
        </button>
      </motion.div>
    </div>
  )
})

// ── Recovery Lock Screen ──────────────────────────────────────────────────────

interface RecoveryLockProps {
  recoverySeconds: number
  onBypass: () => void
}

export const RecoveryLock = memo(function RecoveryLock({
  recoverySeconds, onBypass,
}: RecoveryLockProps) {
  const { shouldAnimate, t } = useMotion()
  const rm = Math.floor(recoverySeconds / 60)
  const rs = recoverySeconds % 60

  return (
    // Soft recovery suggestion (NOT a hard lock)
    // Research: forcibly interrupting ADHD hyperfocus causes irritation.
    // We strongly suggest a break, but allow bypass for hyperfocus states.
    <div
      className="flex flex-col items-center justify-center min-h-screen px-6 text-center"
      style={{ background: '#0F1117' }}
    >
      <motion.div
        initial={shouldAnimate ? { opacity: 0, scale: 0.9 } : {}}
        animate={{ opacity: 1, scale: 1 }}
        transition={t()}
        className="flex flex-col items-center"
      >
        <div className="text-5xl mb-6">🌿</div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: '#4ECDC4' }}>
          90 minutes of deep focus 🌊
        </h2>
        <p className="text-sm mb-6 max-w-xs leading-relaxed" style={{ color: '#8B8BA7' }}>
          You just did 90 minutes of deep focus. Your brain consolidates learning during rest —
          even a short break helps.
        </p>

        {/* Gentle suggestions */}
        <div
          className="w-full max-w-xs mb-6 p-4 rounded-2xl text-left"
          style={{ background: '#1E2136', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p className="text-xs font-medium mb-3" style={{ color: '#8B8BA7' }}>Try one of these 🌱</p>
          {['Drink a glass of water', 'Look away from the screen', 'Take 5 deep breaths', 'Stretch your neck and shoulders'].map(s => (
            <p key={s} className="text-sm mb-1.5" style={{ color: '#E8E8F0' }}>· {s}</p>
          ))}
        </div>

        {/* Timer — informational, not a gate */}
        <div
          className="px-8 py-3 rounded-2xl mb-6"
          style={{ background: '#1E2136', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p className="font-mono text-2xl font-bold" style={{ color: '#4ECDC4' }}>
            {rm}:{rs.toString().padStart(2, '0')}
          </p>
          <p className="text-xs mt-1" style={{ color: '#8B8BA7' }}>suggested rest time</p>
        </div>

        {/* Continue anyway — hyperfocus support */}
        <button
          onClick={onBypass}
          className="text-xs px-5 py-2 rounded-xl transition-all duration-200"
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.06)',
            color: '#8B8BA7',
          }}
          aria-label="Bypass recovery suggestion"
        >
          I know — keep going →
        </button>
      </motion.div>
    </div>
  )
})
