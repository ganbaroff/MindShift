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
import { useStore } from '@/store'
import { motion, AnimatePresence } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMotion } from '@/shared/hooks/useMotion'
import { SocialFeedbackCard } from './SocialFeedbackCard'
import { nativeShare, canShare } from '@/shared/lib/native'
import type { EnergyLevel, SessionPhase } from '@/types'
import { ENERGY_EMOJI } from '@/shared/lib/constants'
export { RecoveryLock } from './RecoveryLock'

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
  // Research #10: crystalEarned removed — post-session is vulnerability window.
  // Crystals shown only on ProgressPage. See crystal-shop-ethics.md Rule #5.
  /** S-9 Post-social cool-down — true when user was in a Focus Room during this session */
  wasInRoom?: boolean
}

const ENERGY_LABEL_KEYS = ['energy.drained', 'energy.low', 'energy.okay', 'energy.good', 'energy.wired'] as const
const ENERGY_OPTION_LEVELS: EnergyLevel[] = [1, 2, 3, 4, 5]

export const NatureBuffer = memo(function NatureBuffer({
  bufferSeconds, postEnergyLogged, onSetEnergyLevel, onSkip, sessionMinutes = 0,
  emotionalReactivity, sessionPhase, parkedThoughtsCount = 0, onAutopsyPick,
  wasInRoom,
}: NatureBufferProps) {
  const { shouldAnimate, t: transition } = useMotion()
  const { t } = useTranslation()
  const completedFocusSessions = useStore(s => s.completedFocusSessions)
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
      style={{ background: 'var(--color-bg)' }}
    >
      <motion.div
        initial={shouldAnimate ? { opacity: 0, scale: 0.9 } : {}}
        animate={{ opacity: 1, scale: 1 }}
        transition={transition()}
        className="flex flex-col items-center"
      >
        <div className="text-5xl mb-6">🌿</div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-teal)' }}>
          {t('focus.breathe')}
        </h2>
        <p className="text-sm mb-8 max-w-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
          {t(getClosingMessageKey(emotionalReactivity, sessionMinutes, sessionPhase))}
        </p>

        <div
          className="px-8 py-4 rounded-2xl mb-6"
          style={{ background: 'var(--color-surface-card)', border: '1px solid rgba(255,255,255,0.06)' }}
          role="timer"
          aria-live="polite"
          aria-atomic="true"
          aria-label={`${bm} minutes ${bs} seconds until next session`}
        >
          <p className="font-mono text-3xl font-bold" aria-hidden="true" style={{ color: 'var(--color-teal)' }}>
            {bm}:{bs.toString().padStart(2, '0')}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{t('focus.untilNext')}</p>
        </div>

        {/* Hyperfocus Autopsy — B-6: shown when session ≥ 45 min */}
        {showAutopsy && (
          <AnimatePresence>
            <motion.div
              initial={shouldAnimate ? { opacity: 0, y: 12 } : {}}
              animate={{ opacity: 1, y: 0 }}
              transition={transition()}
              className="w-full max-w-xs mb-4 p-3 rounded-2xl"
              style={{ background: 'var(--color-surface-card)', border: '1px solid rgba(123,114,255,0.15)' }}
            >
              <p className="text-xs font-medium mb-1 text-center" style={{ color: 'var(--color-primary)' }}>
                {t('focus.autopsyTitle', { min: sessionMinutes })}
              </p>
              <p className="text-[11px] mb-3 text-center" style={{ color: 'var(--color-text-muted)' }}>
                {t('focus.autopsySubtitle')}
              </p>
              <div className="flex gap-2">
                {AUTOPSY_OPTIONS.map(({ key, emoji, i18nKey }) => (
                  <button
                    key={key}
                    onClick={() => { setAutopsyPick(key); onAutopsyPick?.(key) }}
                    className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl text-xs transition-all duration-150 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:outline-none"
                    style={{
                      background: autopsyPick === key ? 'rgba(123,114,255,0.18)' : 'var(--color-surface-raised)',
                      border: `1px solid ${autopsyPick === key ? 'var(--color-primary)' : 'rgba(255,255,255,0.06)'}`,
                      color: autopsyPick === key ? 'var(--color-primary-light)' : 'var(--color-text-muted)',
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

        {/* S-9 Post-social cool-down — compact reaction card after room sessions */}
        {wasInRoom && <SocialFeedbackCard />}

        {/* Block 3d: Post-session energy delta check-in */}
        {!postEnergyLogged && (
          <div
            className="w-full max-w-xs mb-4 p-3 rounded-2xl"
            style={{ background: 'var(--color-surface-card)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <p className="text-xs font-medium mb-2 text-center" style={{ color: 'var(--color-text-muted)' }}>
              {t('focus.energyCheckIn')}
            </p>
            <div className="flex justify-between gap-1">
              {ENERGY_OPTION_LEVELS.map((level, i) => {
                const label = t(ENERGY_LABEL_KEYS[i])
                return (
                  <button
                    key={level}
                    onClick={() => onSetEnergyLevel(level)}
                    className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl text-xs transition-all duration-150 min-h-[52px] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:outline-none"
                    style={{ background: 'var(--color-surface-raised)', border: '1px solid rgba(255,255,255,0.06)' }}
                    aria-label={t('focus.postSessionEnergyLabel', { label })}
                  >
                    <span className="text-lg leading-none">{ENERGY_EMOJI[i]}</span>
                    <span className="text-[9px]" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Parked thoughts nudge — reminds user about thoughts captured during session */}
        {parkedThoughtsCount > 0 && <ParkedThoughtsNudge count={parkedThoughtsCount} />}

        {/* Day-1 retention nudge — shown only after first ever completed session */}
        {completedFocusSessions === 1 && (
          <motion.div
            initial={shouldAnimate ? { opacity: 0, y: 8 } : {}}
            animate={{ opacity: 1, y: 0 }}
            transition={transition()}
            className="w-full max-w-xs mb-4 p-3 rounded-2xl text-center"
            style={{ background: 'rgba(78,205,196,0.08)', border: '1px solid rgba(78,205,196,0.2)' }}
          >
            <p className="text-[14px] font-semibold mb-1" style={{ color: 'var(--color-teal)' }}>
              {t('focus.firstSessionTitle')}
            </p>
            <p className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
              {t('focus.firstSessionBody')}
            </p>
          </motion.div>
        )}

        <button
          onClick={onSkip}
          className="px-6 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[var(--color-text-muted)] focus-visible:outline-none"
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.06)',
            color: 'var(--color-text-muted)',
          }}
          aria-label={t('focus.skipNatureBuffer')}
        >
          {t('focus.imReady')}
        </button>

        {/* Session share — K-factor: share this session's achievement */}
        {canShare() && sessionMinutes > 0 && (
          <button
            onClick={() => {
              const mins = sessionMinutes
              const text = mins >= 60
                ? t('focus.sessionShareText60', { h: Math.floor(mins / 60), m: mins % 60 })
                : t('focus.sessionShareText', { mins })
              void nativeShare({ text, title: 'MindShift' })
            }}
            className="mt-3 text-[11px] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:outline-none rounded"
            style={{ color: 'var(--color-text-muted)', opacity: 0.6 }}
          >
            {t('focus.shareSession')}
          </button>
        )}
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
      className="w-full max-w-xs mb-4 p-3 rounded-2xl flex items-center gap-3 text-left focus-visible:ring-2 focus-visible:ring-[var(--color-teal)] focus-visible:outline-none"
      style={{
        background: 'rgba(78,205,196,0.08)',
        border: '1px solid rgba(78,205,196,0.2)',
      }}
      aria-label={label}
    >
      <span className="text-xl">💭</span>
      <div className="flex-1">
        <p className="text-[13px] font-medium" style={{ color: 'var(--color-teal)' }}>
          {label}
        </p>
        <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
          {t('focus.tapToSeeSomeday')}
        </p>
      </div>
      <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>→</span>
    </motion.button>
  )
}

// RecoveryLock extracted to ./RecoveryLock.tsx (Rule 8 — 400 line limit)
