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
import { motion, AnimatePresence } from 'motion/react'
import { useMotion } from '@/shared/hooks/useMotion'
import { useStore } from '@/store'

const STEPS = [
  {
    emoji: '🌿',
    title: 'Your calm space',
    body: 'No deadlines, no guilt. MindShift works with your brain, not against it.',
  },
  {
    emoji: '🎯',
    title: 'How it works',
    body: 'Add a task → start a focus session → watch your progress grow. That\'s it.',
  },
  {
    emoji: '🌱',
    title: 'Start small',
    body: 'One task today is enough. Tap the input above to add your first one.',
  },
]

function WelcomeWalkthroughInner() {
  const seenHints = useStore(s => s.seenHints)
  const markHintSeen = useStore(s => s.markHintSeen)
  const { shouldAnimate, t } = useMotion()
  const [step, setStep] = useState(0)

  const alreadySeen = seenHints.includes('welcome_walkthrough')

  const handleNext = useCallback(() => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1)
    } else {
      markHintSeen('welcome_walkthrough')
    }
  }, [step, markHintSeen])

  const handleSkip = useCallback(() => {
    markHintSeen('welcome_walkthrough')
  }, [markHintSeen])

  if (alreadySeen) return null

  const current = STEPS[step]

  return (
    <motion.div
      initial={shouldAnimate ? { opacity: 0, y: 12 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={t()}
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
          transition={t()}
          className="p-4"
        >
          <p className="text-[24px] mb-1">{current.emoji}</p>
          <h3 className="text-[15px] font-semibold mb-1" style={{ color: '#E8E8F0' }}>
            {current.title}
          </h3>
          <p className="text-[13px] leading-relaxed" style={{ color: '#8B8BA7' }}>
            {current.body}
          </p>
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center justify-between px-4 pb-3">
        {/* Progress dots */}
        <div className="flex gap-1.5">
          {STEPS.map((_, i) => (
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
            Skip
          </button>
          <button
            onClick={handleNext}
            className="text-[12px] px-3 py-1 rounded-lg font-medium focus-visible:ring-1 focus-visible:ring-[#7B72FF]"
            style={{
              background: 'rgba(123,114,255,0.15)',
              color: '#7B72FF',
            }}
          >
            {step === STEPS.length - 1 ? 'Got it' : 'Next'}
          </button>
        </div>
      </div>
    </motion.div>
  )
}

export const WelcomeWalkthrough = memo(WelcomeWalkthroughInner)
