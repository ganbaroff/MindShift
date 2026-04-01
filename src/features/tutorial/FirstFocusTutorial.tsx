/**
 * FirstFocusTutorial — guided first focus session walkthrough.
 *
 * Shown once after onboarding completes. Walks new users through
 * a 2-minute demo focus session with phase explanations and Mochi.
 *
 * 4 steps:
 *   1. Intro — "Let's try a 2-minute focus session"
 *   2. Timer — live 2-min countdown with phase annotations
 *   3. Celebration — explain struggle→release→flow
 *   4. What's next — CTA to start for real
 *
 * Skip button always visible (ADHD — never trap the user).
 * All text via useTranslation(). Uses useMotion() for animations.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMotion } from '@/shared/hooks/useMotion'
import { useStore } from '@/store'
import { logEvent } from '@/shared/lib/logger'
import { Mascot } from '@/shared/ui/Mascot'

type Step = 'intro' | 'timer' | 'celebrate' | 'next'

const TUTORIAL_DURATION = 120 // 2 minutes in seconds
const PHASE_THRESHOLDS = { release: 30, flow: 60 } // simplified phases for tutorial

export function FirstFocusTutorial() {
  const { shouldAnimate, t: transition } = useMotion()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { setFirstFocusTutorialCompleted, addTask, removeTask, markHintSeen } = useStore()

  const [step, setStep] = useState<Step>('intro')
  const [elapsed, setElapsed] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const sampleTaskIdRef = useRef<string | null>(null)

  // Current phase based on elapsed time
  const phase = elapsed < PHASE_THRESHOLDS.release
    ? 'struggle'
    : elapsed < PHASE_THRESHOLDS.flow
      ? 'release'
      : 'flow'

  // Timer tick
  useEffect(() => {
    if (!timerRunning) return
    intervalRef.current = setInterval(() => {
      setElapsed(prev => {
        if (prev >= TUTORIAL_DURATION) {
          setTimerRunning(false)
          setStep('celebrate')
          return TUTORIAL_DURATION
        }
        return prev + 1
      })
    }, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [timerRunning])

  const handleComplete = useCallback(() => {
    if (sampleTaskIdRef.current) {
      removeTask(sampleTaskIdRef.current)
      sampleTaskIdRef.current = null
    }
    logEvent('tutorial_completed')
    setFirstFocusTutorialCompleted()
    markHintSeen('first_focus_tutorial')
    markHintSeen('welcome_walkthrough')
    navigate('/tasks')
  }, [setFirstFocusTutorialCompleted, markHintSeen, navigate, removeTask])

  const handleSkip = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (sampleTaskIdRef.current) {
      removeTask(sampleTaskIdRef.current)
      sampleTaskIdRef.current = null
    }
    logEvent('tutorial_skipped', { step })
    setFirstFocusTutorialCompleted()
    markHintSeen('first_focus_tutorial')
    markHintSeen('welcome_walkthrough')
  }, [setFirstFocusTutorialCompleted, markHintSeen, removeTask, step])

  const handleStartTimer = useCallback(() => {
    // Create sample task in NOW pool — tracked for cleanup on complete/skip
    const taskId = `tutorial_${Date.now()}`
    sampleTaskIdRef.current = taskId
    addTask({
      id: taskId,
      title: t('tutorial.sampleTaskTitle'),
      pool: 'now',
      status: 'active',
      difficulty: 1,
      estimatedMinutes: 2,
      position: 0,
      createdAt: new Date().toISOString(),
      completedAt: null,
      snoozeCount: 0,
      parentTaskId: null,
      dueDate: null,
      dueTime: null,
      taskType: 'task',
      reminderSentAt: null,
      repeat: 'none',
    })
    setStep('timer')
    setTimerRunning(true)
  }, [addTask, t])

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60)
    const sec = s % 60
    return `${min}:${sec.toString().padStart(2, '0')}`
  }

  const remaining = TUTORIAL_DURATION - elapsed
  const progress = elapsed / TUTORIAL_DURATION

  return (
    <motion.div
      initial={shouldAnimate ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      exit={shouldAnimate ? { opacity: 0 } : undefined}
      transition={transition()}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'var(--color-bg)' }}
    >
      <div className="w-full max-w-[400px] px-6">
        {/* Skip button — always visible */}
        <button
          onClick={handleSkip}
          className="absolute top-6 right-6 text-[13px] font-medium px-3 py-1.5 rounded-xl focus-visible:ring-2"
          style={{ color: 'var(--color-text-muted)', background: 'var(--color-surface-raised)' }}
          aria-label={t('tutorial.skip')}
        >
          {t('tutorial.skip')}
        </button>

        <AnimatePresence mode="wait">
          {/* Step 1: Intro */}
          {step === 'intro' && (
            <motion.div
              key="intro"
              initial={shouldAnimate ? { opacity: 0, y: 20 } : false}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldAnimate ? { opacity: 0, y: -20 } : undefined}
              transition={transition()}
              className="text-center space-y-6"
            >
              <Mascot state="encouraging" size={80} label="Mochi welcomes you" />
              <div className="space-y-2">
                <h2 className="text-[22px] font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  {t('tutorial.introTitle')}
                </h2>
                <p className="text-[14px] leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                  {t('tutorial.introBody')}
                </p>
              </div>
              <div className="space-y-3 pt-2">
                <p className="text-[12px]" style={{ color: 'var(--color-text-subtle)' }}>
                  {t('tutorial.introHint')}
                </p>
                <button
                  onClick={handleStartTimer}
                  className="w-full py-3.5 rounded-2xl text-[15px] font-semibold transition-all"
                  style={{ background: 'var(--color-primary)', color: '#FFFFFF' }}
                >
                  {t('tutorial.startButton')}
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Timer */}
          {step === 'timer' && (
            <motion.div
              key="timer"
              initial={shouldAnimate ? { opacity: 0, y: 20 } : false}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldAnimate ? { opacity: 0, y: -20 } : undefined}
              transition={transition()}
              className="text-center space-y-6"
            >
              {/* Phase indicator */}
              <div
                className="inline-block px-3 py-1 rounded-full text-[12px] font-medium"
                style={{
                  background: phase === 'struggle'
                    ? 'var(--color-primary-alpha)'
                    : phase === 'release'
                      ? 'var(--color-teal-alpha)'
                      : 'var(--color-teal-alpha)',
                  color: phase === 'struggle' ? 'var(--color-primary)' : 'var(--color-teal)',
                }}
              >
                {phase === 'struggle' && t('tutorial.phaseStruggle')}
                {phase === 'release' && t('tutorial.phaseRelease')}
                {phase === 'flow' && t('tutorial.phaseFlow')}
              </div>

              {/* Timer display */}
              <div>
                <p
                  className="text-[56px] font-bold tabular-nums leading-none"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {formatTime(remaining)}
                </p>
                {/* Progress bar */}
                <div className="mt-4 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-surface-raised)' }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: phase === 'struggle' ? 'var(--color-primary)' : 'var(--color-teal)' }}
                    animate={{ width: `${progress * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>

              {/* Phase explanation */}
              <p className="text-[13px] leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                {phase === 'struggle' && t('tutorial.struggleExplain')}
                {phase === 'release' && t('tutorial.releaseExplain')}
                {phase === 'flow' && t('tutorial.flowExplain')}
              </p>

              {/* Mochi */}
              <Mascot
                state={phase === 'flow' ? 'celebrating' : phase === 'release' ? 'focused' : 'encouraging'}
                size={48}
                label="Mochi"
              />

              {/* Skip remaining */}
              <button
                onClick={() => { setTimerRunning(false); setStep('celebrate') }}
                className="text-[12px]"
                style={{ color: 'var(--color-text-subtle)' }}
              >
                {t('tutorial.skipTimer')}
              </button>
            </motion.div>
          )}

          {/* Step 3: Celebration */}
          {step === 'celebrate' && (
            <motion.div
              key="celebrate"
              initial={shouldAnimate ? { opacity: 0, scale: 0.95 } : false}
              animate={{ opacity: 1, scale: 1 }}
              exit={shouldAnimate ? { opacity: 0 } : undefined}
              transition={transition()}
              className="text-center space-y-5"
            >
              <Mascot state="celebrating" size={80} label="Mochi celebrates" />
              <div className="space-y-2">
                <h2 className="text-[22px] font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  {t('tutorial.celebrateTitle')}
                </h2>
                <p className="text-[14px] leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                  {t('tutorial.celebrateBody')}
                </p>
              </div>

              {/* Phase breakdown */}
              <div className="space-y-2 text-left">
                {[
                  { emoji: '🌊', phase: t('tutorial.phaseStruggle'), desc: t('tutorial.struggleDesc') },
                  { emoji: '🌿', phase: t('tutorial.phaseRelease'), desc: t('tutorial.releaseDesc') },
                  { emoji: '🌙', phase: t('tutorial.phaseFlow'), desc: t('tutorial.flowDesc') },
                ].map(({ emoji, phase: p, desc }) => (
                  <div key={p} className="flex items-start gap-2.5 p-2.5 rounded-xl" style={{ background: 'var(--color-surface-card)' }}>
                    <span className="text-[18px] mt-0.5">{emoji}</span>
                    <div>
                      <p className="text-[13px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>{p}</p>
                      <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setStep('next')}
                className="w-full py-3 rounded-2xl text-[14px] font-semibold"
                style={{ background: 'var(--color-teal)', color: '#FFFFFF' }}
              >
                {t('tutorial.continueButton')}
              </button>
            </motion.div>
          )}

          {/* Step 4: What's next */}
          {step === 'next' && (
            <motion.div
              key="next"
              initial={shouldAnimate ? { opacity: 0, y: 20 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={transition()}
              className="text-center space-y-5"
            >
              <div className="text-[40px]">🌱</div>
              <div className="space-y-2">
                <h2 className="text-[22px] font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  {t('tutorial.nextTitle')}
                </h2>
                <p className="text-[14px] leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                  {t('tutorial.nextBody')}
                </p>
              </div>

              <div className="space-y-2 text-left">
                {[
                  { emoji: '✏️', text: t('tutorial.tip1') },
                  { emoji: '⏱', text: t('tutorial.tip2') },
                  { emoji: '📊', text: t('tutorial.tip3') },
                ].map(({ emoji, text }) => (
                  <div key={text} className="flex items-center gap-2.5 p-2.5 rounded-xl" style={{ background: 'var(--color-surface-card)' }}>
                    <span className="text-[16px]">{emoji}</span>
                    <p className="text-[13px]" style={{ color: 'var(--color-text-primary)' }}>{text}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={handleComplete}
                className="w-full py-3.5 rounded-2xl text-[15px] font-semibold"
                style={{ background: 'var(--color-primary)', color: '#FFFFFF' }}
              >
                {t('tutorial.startForReal')}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

export default FirstFocusTutorial
