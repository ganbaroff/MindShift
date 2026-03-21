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
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMotion } from '@/shared/hooks/useMotion'
import type { EnergyLevel, SessionPhase } from '@/types'
import { ENERGY_LABELS, ENERGY_EMOJI } from '@/shared/lib/constants'

// ── Hyperfocus Autopsy threshold (B-6 backlog item) ───────────────────────────
// Research: ADHD users in hyperfocus often lose awareness of time + body state.
// After 45+ min sessions, a brief non-judgmental reflection seeds self-awareness.
// Three options chosen to cover the full spectrum without assigning success/failure.
const HYPERFOCUS_THRESHOLD_MIN = 45

const AUTOPSY_OPTIONS = [
  { key: 'flow',     emoji: '🌊', i18nKey: 'focus.autopsyFlow' },
  { key: 'steady',   emoji: '🌱', i18nKey: 'focus.autopsySteady' },
  { key: 'scattered',emoji: '🌀', i18nKey: 'focus.autopsyScattered' },
] as const

// ── Emotionally-adaptive closing messages ────────────────────────────────────
// emotionalReactivity shapes the post-session tone: high = extra-gentle,
// steady = direct, moderate/null = default warm message.

function getClosingMessageKey(
  emotionalReactivity: 'high' | 'moderate' | 'steady' | null | undefined,
  sessionMinutes: number,
  sessionPhase: SessionPhase | undefined,
): string {
  const isShort = sessionMinutes < 10
  const reachedFlow = sessionPhase === 'flow'

  if (emotionalReactivity === 'high') {
    if (isShort) return 'focus.closingHighShort'
    if (reachedFlow) return 'focus.closingHighFlow'
    return 'focus.closingHighDefault'
  }
  if (emotionalReactivity === 'steady') {
    if (reachedFlow) return 'focus.closingSteadyFlow'
    return 'focus.closingSteadyDefault'
  }
  return 'focus.closingDefault'
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
  /** Callback when user picks autopsy reflection — persists to store/DB */
  onAutopsyPick?: (pick: string) => void
  /** Number of thoughts parked during this session */
  parkedThoughtsCount?: number
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
  emotionalReactivity, sessionPhase, parkedThoughtsCount = 0, onAutopsyPick,
}: NatureBufferProps) {
  const { shouldAnimate, t: transition } = useMotion()
  const { t } = useTranslation()
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
        transition={transition()}
        className="flex flex-col items-center"
      >
        <div className="text-5xl mb-6">🌿</div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: '#4ECDC4' }}>
          {t('focus.breathe')}
        </h2>
        <p className="text-sm mb-8 max-w-xs leading-relaxed" style={{ color: '#8B8BA7' }}>
          {t(getClosingMessageKey(emotionalReactivity, sessionMinutes, sessionPhase))}
        </p>

        <div
          className="px-8 py-4 rounded-2xl mb-6"
          style={{ background: '#1E2136', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p className="font-mono text-3xl font-bold" style={{ color: '#4ECDC4' }}>
            {bm}:{bs.toString().padStart(2, '0')}
          </p>
          <p className="text-xs mt-1" style={{ color: '#8B8BA7' }}>{t('focus.untilNext')}</p>
        </div>

        {/* Hyperfocus Autopsy — B-6: shown when session ≥ 45 min */}
        {showAutopsy && (
          <AnimatePresence>
            <motion.div
              initial={shouldAnimate ? { opacity: 0, y: 12 } : {}}
              animate={{ opacity: 1, y: 0 }}
              transition={transition()}
              className="w-full max-w-xs mb-4 p-3 rounded-2xl"
              style={{ background: '#1E2136', border: '1px solid rgba(123,114,255,0.15)' }}
            >
              <p className="text-xs font-medium mb-1 text-center" style={{ color: '#7B72FF' }}>
                {t('focus.autopsyTitle', { min: sessionMinutes })}
              </p>
              <p className="text-[11px] mb-3 text-center" style={{ color: '#5A5B72' }}>
                {t('focus.autopsySubtitle')}
              </p>
              <div className="flex gap-2">
                {AUTOPSY_OPTIONS.map(({ key, emoji, i18nKey }) => (
                  <button
                    key={key}
                    onClick={() => { setAutopsyPick(key); onAutopsyPick?.(key) }}
                    className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl text-xs transition-all duration-150"
                    style={{
                      background: autopsyPick === key ? 'rgba(123,114,255,0.18)' : '#252840',
                      border: `1px solid ${autopsyPick === key ? '#7B72FF' : 'rgba(255,255,255,0.06)'}`,
                      color: autopsyPick === key ? '#C8C0FF' : '#8B8BA7',
                    }}
                    aria-pressed={autopsyPick === key}
                  >
                    <span className="text-base leading-none">{emoji}</span>
                    <span className="text-[10px] leading-tight text-center">{t(i18nKey)}</span>
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
              {t('focus.energyCheckIn')}
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

        {/* Parked thoughts nudge — reminds user about thoughts captured during session */}
        {parkedThoughtsCount > 0 && <ParkedThoughtsNudge count={parkedThoughtsCount} />}

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
          {t('focus.imReady')}
        </button>
      </motion.div>
    </div>
  )
})

// ── Parked Thoughts Nudge ─────────────────────────────────────────────────────

function ParkedThoughtsNudge({ count }: { count: number }) {
  const navigate = useNavigate()
  const { shouldAnimate, t: transition } = useMotion()
  const { t } = useTranslation()
  const label = count === 1
    ? t('focus.thoughtsSaved', { count })
    : t('focus.thoughtsSavedPlural', { count })

  return (
    <motion.button
      initial={shouldAnimate ? { opacity: 0, y: 8 } : {}}
      animate={{ opacity: 1, y: 0 }}
      transition={transition()}
      onClick={() => navigate('/tasks')}
      className="w-full max-w-xs mb-4 p-3 rounded-2xl flex items-center gap-3 text-left"
      style={{
        background: 'rgba(78,205,196,0.08)',
        border: '1px solid rgba(78,205,196,0.2)',
      }}
      aria-label={label}
    >
      <span className="text-xl">💭</span>
      <div className="flex-1">
        <p className="text-[13px] font-medium" style={{ color: '#4ECDC4' }}>
          {label}
        </p>
        <p className="text-[11px]" style={{ color: '#8B8BA7' }}>
          {t('focus.tapToSeeSomeday')}
        </p>
      </div>
      <span className="text-sm" style={{ color: '#8B8BA7' }}>→</span>
    </motion.button>
  )
}

// ── Recovery Lock Screen ──────────────────────────────────────────────────────

interface RecoveryLockProps {
  recoverySeconds: number
  onBypass: () => void
}

export const RecoveryLock = memo(function RecoveryLock({
  recoverySeconds, onBypass,
}: RecoveryLockProps) {
  const { shouldAnimate, t: transition } = useMotion()
  const { t } = useTranslation()
  const rm = Math.floor(recoverySeconds / 60)
  const rs = recoverySeconds % 60

  const suggestions = [
    t('focus.drinkWater'),
    t('focus.lookAway'),
    t('focus.deepBreaths'),
    t('focus.stretchNeck'),
  ]

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
        transition={transition()}
        className="flex flex-col items-center"
      >
        <div className="text-5xl mb-6">🌿</div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: '#4ECDC4' }}>
          {t('focus.recoveryTitle')}
        </h2>
        <p className="text-sm mb-6 max-w-xs leading-relaxed" style={{ color: '#8B8BA7' }}>
          {t('focus.recoveryDesc')}
        </p>

        {/* Gentle suggestions */}
        <div
          className="w-full max-w-xs mb-6 p-4 rounded-2xl text-left"
          style={{ background: '#1E2136', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p className="text-xs font-medium mb-3" style={{ color: '#8B8BA7' }}>{t('focus.trySuggestions')}</p>
          {suggestions.map(s => (
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
          <p className="text-xs mt-1" style={{ color: '#8B8BA7' }}>{t('focus.suggestedRest')}</p>
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
          {t('focus.keepGoingBypass')}
        </button>
      </motion.div>
    </div>
  )
})
