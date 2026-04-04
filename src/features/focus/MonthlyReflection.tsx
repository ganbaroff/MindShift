/**
 * MonthlyReflection — brief monthly pause + intention setting (B-5).
 *
 * Triggers: within first 5 days of a new month, once per month.
 * Mutually exclusive with RecoveryProtocol / ContextRestore / ShutdownRitual.
 *
 * Research (ADHD): monthly "pause points" support working memory offloading
 * and reduce the accumulated anxiety of unmeasured progress. Celebratory
 * language (not metrics) prevents shame spirals.
 *
 * Step 0: Wrapped     — lifetime stats grid + share (MonthlyWrappedStep)
 * Step 1: Recap       — new month welcome + gentle stats
 * Step 2: Intention   — one-word input + chips (MonthlyIntentionStep)
 * Step 3: Close       — auto-dismiss 3s
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useMotion } from '@/shared/hooks/useMotion'
import { useStore } from '@/store'
import { currentMonthISO } from '@/shared/lib/dateUtils'
import { ShareCard } from '@/shared/ui/ShareCard'
import { MonthlyWrappedStep } from './MonthlyWrappedStep'
import { MonthlyIntentionStep } from './MonthlyIntentionStep'

interface Props {
  onDismiss: () => void
}

type Step = 'wrapped' | 'recap' | 'intention' | 'close'

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

const CLOSING_KEYS = [
  'monthly.closingFresh',
  'monthly.closingSmall',
  'monthly.closingStillHere',
  'monthly.closingNewPage',
] as const

export function MonthlyReflection({ onDismiss }: Props) {
  const { completedTotal, currentStreak, longestStreak, xpTotal, achievements, setMonthlyReflectionShownMonth } = useStore()
  const { t: motionTransition, shouldAnimate } = useMotion()
  const { t } = useTranslation()
  const [step, setStep] = useState<Step>('wrapped')
  const [intention, setIntention] = useState('')
  const [showShareCard, setShowShareCard] = useState(false)
  const [closingKey] = useState(
    () => CLOSING_KEYS[Math.floor(Math.random() * CLOSING_KEYS.length)]
  )

  const unlockedBadges = useMemo(() => achievements.filter(a => a.unlockedAt), [achievements])
  const topBadge = useMemo(() => unlockedBadges.length > 0
    ? unlockedBadges[unlockedBadges.length - 1]
    : null, [unlockedBadges])

  const now = new Date()
  const monthName = MONTH_NAMES[now.getMonth()]
  const prevMonthName = MONTH_NAMES[(now.getMonth() + 11) % 12]
  const currentMonth = currentMonthISO()

  const handleDismiss = useCallback(() => {
    setMonthlyReflectionShownMonth(currentMonth)
    onDismiss()
  }, [currentMonth, setMonthlyReflectionShownMonth, onDismiss])

  // WCAG 2.1.1: Escape key dismisses the overlay
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleDismiss() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleDismiss])

  useEffect(() => {
    if (step !== 'close') return
    const timer = setTimeout(handleDismiss, 3000)
    return () => clearTimeout(timer)
  }, [step, handleDismiss])

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex flex-col justify-center px-6"
        style={{ background: 'linear-gradient(180deg, #0F1117 0%, #1A1B30 50%, #141228 100%)' }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.10, scale: 1 }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 65% 45% at 50% 30%, #4ECDC4, #7B72FF30, transparent)' }}
        />

        <div className="relative max-w-sm mx-auto w-full flex flex-col gap-8">
          {/* Step dots */}
          <div className="flex justify-center gap-2">
            {(['wrapped', 'recap', 'intention', 'close'] as Step[]).map((s, i) => (
              <motion.div
                key={s}
                className="rounded-full"
                animate={{
                  width: step === s ? 20 : 6,
                  height: 6,
                  backgroundColor:
                    step === s ? '#4ECDC4'
                    : (['wrapped','recap','intention','close'].indexOf(step) > i) ? '#7B72FF'
                    : 'rgba(255,255,255,0.10)',
                }}
                transition={{ duration: 0.3 }}
              />
            ))}
          </div>

          <AnimatePresence>
            {step === 'wrapped' && (
              <MonthlyWrappedStep
                prevMonthName={prevMonthName}
                xpTotal={xpTotal}
                completedTotal={completedTotal}
                currentStreak={currentStreak}
                longestStreak={longestStreak}
                unlockedBadges={unlockedBadges}
                topBadge={topBadge}
                motionTransition={motionTransition}
                onShare={() => setShowShareCard(true)}
                onContinue={() => setStep('recap')}
              />
            )}

            {/* ── Step 1: Recap ──────────────────────────────────────────── */}
            {step === 'recap' && (
              <motion.div
                key="recap"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ ...motionTransition(), ...(shouldAnimate && { duration: 0.35 }) }}
                className="flex flex-col gap-6"
              >
                <div className="text-center">
                  <p className="text-4xl mb-3">🌙</p>
                  <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    {t('monthly.monthIsHere', { month: monthName })}
                  </h2>
                  <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                    {t('monthly.welcomeNewMonth')}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div
                    className="flex flex-col items-center p-3 rounded-2xl"
                    style={{ background: 'var(--color-surface-card)', border: '1px solid rgba(78,205,196,0.12)' }}
                  >
                    <span className="text-2xl font-bold" style={{ color: 'var(--color-teal)' }}>{completedTotal}</span>
                    <span className="text-[11px] mt-0.5 text-center" style={{ color: 'var(--color-text-muted)' }}>{t('monthly.tasksEverFinished')}</span>
                  </div>
                  <div
                    className="flex flex-col items-center p-3 rounded-2xl"
                    style={{ background: 'var(--color-surface-card)', border: '1px solid rgba(123,114,255,0.12)' }}
                  >
                    <span className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>{Math.max(currentStreak, longestStreak)}</span>
                    <span className="text-[11px] mt-0.5 text-center" style={{ color: 'var(--color-text-muted)' }}>{t('monthly.longestStreak')} 🔥</span>
                  </div>
                </div>

                <p className="text-sm text-center italic" style={{ color: 'var(--color-text-muted)' }}>
                  {t('monthly.prevMonthQuote', { month: prevMonthName })}
                </p>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => setStep('intention')}
                    className="w-full py-4 rounded-2xl font-semibold text-base focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:outline-none"
                    style={{ background: 'var(--color-teal)', color: '#0F1117' }}
                    aria-label="Set monthly intention"
                  >
                    {t('monthly.setIntention', { month: monthName })}
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="w-full py-3 text-sm focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:outline-none rounded-lg"
                    style={{ color: 'var(--color-text-muted)' }}
                    aria-label="Skip monthly reflection"
                  >
                    {t('monthly.skipJumpIn')}
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'intention' && (
              <MonthlyIntentionStep
                monthName={monthName}
                intention={intention}
                onIntentionChange={setIntention}
                motionTransition={motionTransition}
                shouldAnimate={shouldAnimate}
                onNext={() => setStep('close')}
              />
            )}

            {/* ── Step 3: Close ──────────────────────────────────────────── */}
            {step === 'close' && (
              <motion.div
                key="close"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ ...motionTransition('expressive'), ...(shouldAnimate && { duration: 0.5 }) }}
                className="flex flex-col items-center gap-6 text-center"
              >
                <motion.p
                  className="text-6xl"
                  animate={shouldAnimate ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 1, delay: 0.3 }}
                >
                  🌱
                </motion.p>
                {intention.trim() && (
                  <div
                    className="px-5 py-2.5 rounded-2xl"
                    style={{ background: 'rgba(78,205,196,0.10)', border: '1px solid rgba(78,205,196,0.20)' }}
                  >
                    <p className="text-sm" style={{ color: 'var(--color-teal)' }}>
                      {t('monthly.monthIntention', { month: monthName })} <strong>{intention.trim()}</strong>
                    </p>
                  </div>
                )}
                <p className="text-xl font-medium leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>
                  {t(closingKey)}
                </p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{t('monthly.closingMoment')}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Share Card overlay */}
      {showShareCard && topBadge && (
        <ShareCard
          emoji={topBadge.emoji}
          title={`${prevMonthName} Wrapped`}
          subtitle={`${completedTotal} tasks · ${Math.max(currentStreak, longestStreak)} day streak`}
          stat={`${xpTotal} XP · ${unlockedBadges.length} badges`}
          onClose={() => setShowShareCard(false)}
        />
      )}
      {showShareCard && !topBadge && (
        <ShareCard
          emoji="✨"
          title={`${prevMonthName} Wrapped`}
          subtitle={`${completedTotal} tasks completed`}
          stat={`${xpTotal} XP earned`}
          onClose={() => setShowShareCard(false)}
        />
      )}
    </AnimatePresence>
  )
}
