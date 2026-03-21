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
 * Step 1: Gentle celebration of the past month (lifetime completions + streak).
 * Step 2: Set ONE word/intention for the new month (stored in note, not DB yet).
 * Step 3: "New month, fresh start 🌱" — closing, auto-dismiss 3s.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useMotion } from '@/shared/hooks/useMotion'
import { useStore } from '@/store'
import { currentMonthISO } from '@/shared/lib/dateUtils'
import { ShareCard } from '@/shared/ui/ShareCard'

interface Props {
  onDismiss: () => void
}

type Step = 'wrapped' | 'recap' | 'intention' | 'close'

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

const INTENTION_SUGGESTIONS = [
  'Flow 🌊', 'Steady 🌱', 'Bold 🔥', 'Rest 🌙',
  'Create ✨', 'Finish 🎯', 'Connect 💙', 'Explore 🗺️',
]

const CLOSING_KEYS = [
  'monthly.closingFresh',
  'monthly.closingSmall',
  'monthly.closingStillHere',
  'monthly.closingNewPage',
] as const

export function MonthlyReflection({ onDismiss }: Props) {
  const { completedTotal, currentStreak, longestStreak, xpTotal, achievements, setMonthlyReflectionShownMonth } = useStore()
  const { t: transition, shouldAnimate } = useMotion()
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

  // Auto-dismiss from closing step after 3s
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
        style={{
          background: 'linear-gradient(180deg, #0F1117 0%, #1A1B30 50%, #141228 100%)',
        }}
      >
        {/* Gentle glow */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.10, scale: 1 }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 65% 45% at 50% 30%, #4ECDC4, #7B72FF30, transparent)',
          }}
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

          <AnimatePresence mode="wait">
            {/* ── Step 0: Wrapped ────────────────────────────────────────── */}
            {step === 'wrapped' && (
              <motion.div
                key="wrapped"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ ...transition('expressive'), duration: 0.4 }}
                className="flex flex-col gap-6"
              >
                <div className="text-center">
                  <p className="text-4xl mb-3">✨</p>
                  <h2 className="text-xl font-semibold" style={{ color: '#E8E8F0' }}>
                    {t('monthly.yourWrapped', { month: prevMonthName })}
                  </h2>
                  <p className="text-sm mt-2" style={{ color: '#8B8BA7' }}>
                    {t('monthly.whatYouBuilt')}
                  </p>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div
                    className="flex flex-col items-center p-3 rounded-2xl"
                    style={{ background: '#1E2136', border: '1px solid rgba(123,114,255,0.12)' }}
                  >
                    <span className="text-2xl font-bold" style={{ color: '#7B72FF' }}>{xpTotal}</span>
                    <span className="text-[11px] mt-0.5 text-center" style={{ color: '#8B8BA7' }}>{t('monthly.totalXp')}</span>
                  </div>
                  <div
                    className="flex flex-col items-center p-3 rounded-2xl"
                    style={{ background: '#1E2136', border: '1px solid rgba(78,205,196,0.12)' }}
                  >
                    <span className="text-2xl font-bold" style={{ color: '#4ECDC4' }}>{completedTotal}</span>
                    <span className="text-[11px] mt-0.5 text-center" style={{ color: '#8B8BA7' }}>{t('monthly.tasksDone')}</span>
                  </div>
                  <div
                    className="flex flex-col items-center p-3 rounded-2xl"
                    style={{ background: '#1E2136', border: '1px solid rgba(78,205,196,0.12)' }}
                  >
                    <span className="text-2xl font-bold" style={{ color: '#4ECDC4' }}>{Math.max(currentStreak, longestStreak)}</span>
                    <span className="text-[11px] mt-0.5 text-center" style={{ color: '#8B8BA7' }}>{t('monthly.bestStreak')} 🔥</span>
                  </div>
                  <div
                    className="flex flex-col items-center p-3 rounded-2xl"
                    style={{ background: '#1E2136', border: '1px solid rgba(123,114,255,0.12)' }}
                  >
                    <span className="text-2xl font-bold" style={{ color: '#7B72FF' }}>{unlockedBadges.length}</span>
                    <span className="text-[11px] mt-0.5 text-center" style={{ color: '#8B8BA7' }}>{t('monthly.badgesEarned')}</span>
                  </div>
                </div>

                {/* Top badge highlight */}
                {topBadge && (
                  <div
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                    style={{ background: 'rgba(123,114,255,0.08)', border: '1px solid rgba(123,114,255,0.15)' }}
                  >
                    <span className="text-2xl">{topBadge.emoji}</span>
                    <div>
                      <p className="text-sm font-medium" style={{ color: '#E8E8F0' }}>{topBadge.name}</p>
                      <p className="text-xs" style={{ color: '#8B8BA7' }}>{t('monthly.latestBadge')}</p>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => setShowShareCard(true)}
                    className="w-full py-4 rounded-2xl font-semibold text-base"
                    style={{ background: '#7B72FF', color: '#FFFFFF' }}
                    aria-label="Share monthly wrapped"
                  >
                    {t('monthly.shareWrapped')} ✨
                  </button>
                  <button
                    onClick={() => setStep('recap')}
                    className="w-full py-3 text-sm"
                    style={{ color: '#8B8BA7' }}
                    aria-label="Continue to recap"
                  >
                    {t('monthly.continue')}
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── Step 1: Recap ──────────────────────────────────────────── */}
            {step === 'recap' && (
              <motion.div
                key="recap"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ ...transition(), duration: 0.35 }}
                className="flex flex-col gap-6"
              >
                <div className="text-center">
                  <p className="text-4xl mb-3">🌙</p>
                  <h2 className="text-xl font-semibold" style={{ color: '#E8E8F0' }}>
                    {t('monthly.monthIsHere', { month: monthName })}
                  </h2>
                  <p className="text-sm mt-2 leading-relaxed" style={{ color: '#8B8BA7' }}>
                    {t('monthly.welcomeNewMonth')}
                  </p>
                </div>

                {/* Gentle stats — celebratory, not punishing */}
                <div className="grid grid-cols-2 gap-3">
                  <div
                    className="flex flex-col items-center p-3 rounded-2xl"
                    style={{ background: '#1E2136', border: '1px solid rgba(78,205,196,0.12)' }}
                  >
                    <span className="text-2xl font-bold" style={{ color: '#4ECDC4' }}>{completedTotal}</span>
                    <span className="text-[11px] mt-0.5 text-center" style={{ color: '#8B8BA7' }}>{t('monthly.tasksEverFinished')}</span>
                  </div>
                  <div
                    className="flex flex-col items-center p-3 rounded-2xl"
                    style={{ background: '#1E2136', border: '1px solid rgba(123,114,255,0.12)' }}
                  >
                    <span className="text-2xl font-bold" style={{ color: '#7B72FF' }}>{Math.max(currentStreak, longestStreak)}</span>
                    <span className="text-[11px] mt-0.5 text-center" style={{ color: '#8B8BA7' }}>{t('monthly.longestStreak')} 🔥</span>
                  </div>
                </div>

                <p className="text-sm text-center italic" style={{ color: '#5A5B72' }}>
                  {t('monthly.prevMonthQuote', { month: prevMonthName })}
                </p>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => setStep('intention')}
                    className="w-full py-4 rounded-2xl font-semibold text-base"
                    style={{ background: '#4ECDC4', color: '#0F1117' }}
                    aria-label="Set monthly intention"
                  >
                    {t('monthly.setIntention', { month: monthName })}
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="w-full py-3 text-sm"
                    style={{ color: '#8B8BA7' }}
                    aria-label="Skip monthly reflection"
                  >
                    {t('monthly.skipJumpIn')}
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── Step 2: Intention ──────────────────────────────────────── */}
            {step === 'intention' && (
              <motion.div
                key="intention"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ ...transition(), duration: 0.35 }}
                className="flex flex-col gap-5"
              >
                <div className="text-center">
                  <p className="text-4xl mb-3">🌅</p>
                  <h2 className="text-xl font-semibold" style={{ color: '#E8E8F0' }}>
                    {t('monthly.oneWord', { month: monthName })}
                  </h2>
                  <p className="text-sm mt-2" style={{ color: '#8B8BA7' }}>
                    {t('monthly.whatFeel')}
                  </p>
                </div>

                <input
                  value={intention}
                  onChange={e => setIntention(e.target.value.slice(0, 30))}
                  onKeyDown={e => { if (e.key === 'Enter') setStep('close') }}
                  placeholder={t('monthly.intentionPlaceholder')}
                  autoFocus
                  className="w-full rounded-2xl px-4 py-3 text-base text-center outline-none transition-all duration-200"
                  style={{
                    background: '#1E2136',
                    border: '1px solid rgba(255,255,255,0.06)',
                    color: '#E8E8F0',
                    caretColor: '#4ECDC4',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#4ECDC4' }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }}
                />

                {/* Quick-pick chips */}
                <div className="flex flex-wrap gap-2 justify-center">
                  {INTENTION_SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setIntention(s.split(' ')[0])}
                      aria-label={`Set intention: ${s.split(' ')[0]}`}
                      className="text-xs px-3 py-1.5 rounded-xl transition-all duration-150"
                      style={{
                        background: intention.startsWith(s.split(' ')[0]) ? 'rgba(78,205,196,0.15)' : '#1E2136',
                        border: `1px solid ${intention.startsWith(s.split(' ')[0]) ? '#4ECDC4' : 'rgba(255,255,255,0.06)'}`,
                        color: intention.startsWith(s.split(' ')[0]) ? '#4ECDC4' : '#8B8BA7',
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => setStep('close')}
                    className="w-full py-4 rounded-2xl font-semibold text-base transition-all duration-200"
                    style={{
                      background: intention.trim() ? '#4ECDC4' : '#252840',
                      color: intention.trim() ? '#0F1117' : '#8B8BA7',
                    }}
                    aria-label="Set monthly intention"
                  >
                    {intention.trim() ? `${t('monthly.intentionSet', { month: monthName, intention: intention.trim() })} 🌱` : t('monthly.setIntentionBtn')}
                  </button>
                  <button
                    onClick={() => setStep('close')}
                    className="w-full py-3 text-sm"
                    style={{ color: '#8B8BA7' }}
                    aria-label="Skip monthly reflection"
                  >
                    Skip
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── Step 3: Close ──────────────────────────────────────────── */}
            {step === 'close' && (
              <motion.div
                key="close"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ ...transition('expressive'), duration: 0.5 }}
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
                    <p className="text-sm" style={{ color: '#4ECDC4' }}>
                      {t('monthly.monthIntention', { month: monthName })} <strong>{intention.trim()}</strong>
                    </p>
                  </div>
                )}
                <p className="text-xl font-medium leading-relaxed" style={{ color: '#E8E8F0' }}>
                  {t(closingKey)}
                </p>
                <p className="text-xs" style={{ color: '#5A5B72' }}>{t('monthly.closingMoment')}</p>
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
