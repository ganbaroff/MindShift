/**
 * WeeklyPlanning — Sunday/Monday planning ritual.
 *
 * Triggers once per week:
 *   - Sunday 18:00+ : "end of week, let's plan what's next"
 *   - Monday 00:00–11:59 : "new week, set your intention"
 *
 * 3 steps:
 *   0 — Week recap: celebrate completedTotal + streak (warm, non-comparative)
 *   1 — Pick ONE weekly intention from 4 chips (or skip)
 *   2 — Closing affirmation: intention saved, first task CTA
 *
 * The chosen intention is persisted in store.weeklyIntention and shown
 * as a subtle chip in FocusScreen setup (Sprint W).
 */

import { memo, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useMotion } from '@/shared/hooks/useMotion'
import { useStore } from '@/store'

interface WeeklyPlanningProps {
  onDismiss: () => void
}

const INTENTIONS = [
  { key: 'consistent',  emoji: '🌱', labelKey: 'weekly.consistentLabel',  descKey: 'weekly.consistentDesc' },
  { key: 'challenge',   emoji: '🔥', labelKey: 'weekly.challengeLabel',   descKey: 'weekly.challengeDesc' },
  { key: 'recover',     emoji: '🌊', labelKey: 'weekly.recoverLabel',     descKey: 'weekly.recoverDesc' },
  { key: 'explore',     emoji: '🗺️', labelKey: 'weekly.exploreLabel',    descKey: 'weekly.exploreDesc' },
] as const

type IntentionKey = typeof INTENTIONS[number]['key']

const TOTAL_STEPS = 3

export const WeeklyPlanning = memo(function WeeklyPlanning({ onDismiss }: WeeklyPlanningProps) {
  const { shouldAnimate, t: transition } = useMotion()
  const { t } = useTranslation()
  const { completedTotal, currentStreak, setWeeklyIntention } = useStore()

  const [step, setStep] = useState(0)
  const [chosen, setChosen] = useState<IntentionKey | null>(null)

  const handleIntentionPick = (key: IntentionKey) => {
    setChosen(key)
    setTimeout(() => setStep(2), 220)
  }

  const handleSkip = () => {
    setWeeklyIntention(null)
    onDismiss()
  }

  const handleFinish = () => {
    const intent = INTENTIONS.find(i => i.key === chosen)
    setWeeklyIntention(intent ? `${intent.emoji} ${t(intent.labelKey)}` : null)
    onDismiss()
  }

  // Choose a warm, non-comparative recap message based on count
  const recapMsg =
    completedTotal >= 50 ? t('weekly.recap50', { count: String(completedTotal) }) :
    completedTotal >= 20 ? t('weekly.recap20', { count: String(completedTotal) }) :
    completedTotal >= 5  ? t('weekly.recap5', { count: String(completedTotal) }) :
    t('weekly.recapDefault')

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6"
      style={{ background: 'rgba(15,17,32,0.96)', backdropFilter: 'blur(8px)' }}
    >
      {/* Step dots */}
      <div className="flex gap-1.5 mb-8">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div
            key={i}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === step ? 20 : 6,
              height: 6,
              background: i <= step ? 'var(--color-primary)' : 'var(--color-surface-raised)',
            }}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Step 0 — Recap */}
        {step === 0 && (
          <motion.div
            key="recap"
            initial={shouldAnimate ? { opacity: 0, y: 24 } : {}}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={transition()}
            className="w-full max-w-xs text-center"
          >
            <div className="text-5xl mb-5">🌅</div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
              {t('weekly.newWeek')}
            </h2>
            <p className="text-sm leading-relaxed mb-8" style={{ color: 'var(--color-text-muted)' }}>
              {recapMsg}
            </p>

            {/* Mini stats */}
            <div className="flex gap-3 mb-8">
              <div
                className="flex-1 rounded-2xl p-3 text-center"
                style={{ background: 'var(--color-surface-card)', border: '1px solid rgba(123,114,255,0.12)' }}
              >
                <p className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>{completedTotal}</p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{t('weekly.tasksDone')}</p>
              </div>
              {currentStreak >= 2 && (
                <div
                  className="flex-1 rounded-2xl p-3 text-center"
                  style={{ background: 'var(--color-surface-card)', border: '1px solid rgba(78,205,196,0.12)' }}
                >
                  <p className="text-2xl font-bold" style={{ color: 'var(--color-teal)' }}>{currentStreak}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{t('weekly.dayStreak')}</p>
                </div>
              )}
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setStep(1)}
              className="w-full py-3.5 rounded-2xl font-semibold text-sm"
              style={{
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))',
                color: '#fff',
                boxShadow: '0 8px 24px rgba(123,114,255,0.25)',
              }}
              aria-label="Set weekly intention"
            >
              {t('weekly.setIntention')}
            </motion.button>
            <button
              onClick={handleSkip}
              className="mt-3 w-full py-2 text-xs"
              style={{ color: 'var(--color-text-muted)' }}
              aria-label="Skip weekly planning"
            >
              {t('weekly.skipForNow')}
            </button>
          </motion.div>
        )}

        {/* Step 1 — Intention picker */}
        {step === 1 && (
          <motion.div
            key="intention"
            initial={shouldAnimate ? { opacity: 0, y: 24 } : {}}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={transition()}
            className="w-full max-w-xs"
          >
            <h2 className="text-xl font-bold mb-1 text-center" style={{ color: 'var(--color-text-primary)' }}>
              {t('weekly.weekFocus')}
            </h2>
            <p className="text-[13px] mb-6 text-center" style={{ color: 'var(--color-text-muted)' }}>
              {t('weekly.noWrongAnswers')}
            </p>

            <div className="space-y-2">
              {INTENTIONS.map(({ key, emoji, labelKey, descKey }) => (
                <motion.button
                  key={key}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleIntentionPick(key)}
                  aria-pressed={chosen === key}
                  aria-label={`Intention: ${t(labelKey)}`}
                  className="w-full text-left p-3.5 rounded-2xl flex items-center gap-3"
                  style={{
                    background: chosen === key ? 'rgba(123,114,255,0.15)' : 'var(--color-surface-card)',
                    border: `1px solid ${chosen === key ? '#7B72FF' : 'rgba(255,255,255,0.06)'}`,
                  }}
                >
                  <span className="text-[26px]">{emoji}</span>
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold" style={{ color: chosen === key ? 'var(--color-primary-light)' : 'var(--color-text-primary)' }}>{t(labelKey)}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{t(descKey)}</p>
                  </div>
                </motion.button>
              ))}
            </div>

            <button
              onClick={handleSkip}
              className="mt-4 w-full py-2 text-xs text-center"
              style={{ color: 'var(--color-text-muted)' }}
              aria-label="Skip weekly planning"
            >
              {t('weekly.skipDecide')}
            </button>
          </motion.div>
        )}

        {/* Step 2 — Closing */}
        {step === 2 && (
          <motion.div
            key="closing"
            initial={shouldAnimate ? { opacity: 0, scale: 0.95 } : {}}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={transition()}
            className="w-full max-w-xs text-center"
          >
            <div className="text-5xl mb-4">
              {INTENTIONS.find(i => i.key === chosen)?.emoji ?? '🌱'}
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
              {INTENTIONS.find(i => i.key === chosen) ? t(INTENTIONS.find(i => i.key === chosen)!.labelKey) : t('weekly.intentionSet')}
            </h2>
            <p className="text-sm leading-relaxed mb-8" style={{ color: 'var(--color-text-muted)' }}>
              {t('weekly.intentionVisible')}
            </p>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleFinish}
              className="w-full py-3.5 rounded-2xl font-semibold text-sm"
              style={{
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-teal))',
                color: '#fff',
                boxShadow: '0 8px 24px rgba(123,114,255,0.22)',
              }}
              aria-label="Finish weekly planning"
            >
              {t('weekly.letsGo')} 🌿
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
})
