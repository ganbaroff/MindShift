/**
 * WelcomeWalkthrough — 3-card intro shown once after onboarding.
 *
 * Explains what MindShift does without being preachy:
 *   1. "Your calm space" — no pressure, no shame
 *   2. "How it works" — tasks → focus → progress
 *   3. "Start small" — one task is enough
 *
 * Auto-advances on tap. Never blocks. Dismissible at any point.
 */

import { useState, useCallback, memo } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'motion/react'
import { useMotion } from '@/shared/hooks/useMotion'
import { useStore } from '@/store'

const STEP_KEYS = [
  { emoji: '🌿', titleKey: 'welcome.step1Title', bodyKey: 'welcome.step1Body' },
  { emoji: '🎯', titleKey: 'welcome.step2Title', bodyKey: 'welcome.step2Body' },
  { emoji: '🌱', titleKey: 'welcome.step3Title', bodyKey: 'welcome.step3Body' },
] as const

function WelcomeWalkthroughInner() {
  const seenHints = useStore(s => s.seenHints)
  const markHintSeen = useStore(s => s.markHintSeen)
  const { shouldAnimate, t: transition } = useMotion()
  const { t } = useTranslation()
  const [step, setStep] = useState(0)

  const alreadySeen = seenHints.includes('welcome_walkthrough')

  const handleNext = useCallback(() => {
    if (step < STEP_KEYS.length - 1) {
      setStep(s => s + 1)
    } else {
      markHintSeen('welcome_walkthrough')
    }
  }, [step, markHintSeen])

  const handleSkip = useCallback(() => {
    markHintSeen('welcome_walkthrough')
  }, [markHintSeen])

  if (alreadySeen) return null

  const current = STEP_KEYS[step]

  return (
    <motion.div
      initial={shouldAnimate ? { opacity: 0, y: 12 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={transition()}
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(123,114,255,0.10), rgba(78,205,196,0.06))',
        border: '1px solid rgba(123,114,255,0.15)',
      }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={shouldAnimate ? { opacity: 0, x: 20 } : false}
          animate={{ opacity: 1, x: 0 }}
          exit={shouldAnimate ? { opacity: 0, x: -20 } : {}}
          transition={transition()}
          className="p-4"
        >
          <p className="text-[24px] mb-1">{current.emoji}</p>
          <h3 className="text-[15px] font-semibold mb-1" style={{ color: '#E8E8F0' }}>
            {t(current.titleKey)}
          </h3>
          <p className="text-[13px] leading-relaxed" style={{ color: '#8B8BA7' }}>
            {t(current.bodyKey)}
          </p>
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center justify-between px-4 pb-3">
        {/* Progress dots */}
        <div className="flex gap-1.5">
          {STEP_KEYS.map((_, i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full transition-colors duration-200"
              style={{
                background: i === step ? '#7B72FF' : 'rgba(123,114,255,0.25)',
              }}
            />
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSkip}
            className="text-[12px] px-2 py-1 rounded-lg focus-visible:ring-1 focus-visible:ring-[#7B72FF]"
            style={{ color: '#8B8BA7' }}
          >
            {t('welcome.skip')}
          </button>
          <button
            onClick={handleNext}
            className="text-[12px] px-3 py-1 rounded-lg font-medium focus-visible:ring-1 focus-visible:ring-[#7B72FF]"
            style={{
              background: 'rgba(123,114,255,0.15)',
              color: '#7B72FF',
            }}
          >
            {step === STEP_KEYS.length - 1 ? t('welcome.gotIt') : t('welcome.next')}
          </button>
        </div>
      </div>
    </motion.div>
  )
}

export const WelcomeWalkthrough = memo(WelcomeWalkthroughInner)
