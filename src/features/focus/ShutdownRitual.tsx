/**
 * ShutdownRitual — 3-step end-of-day wind-down.
 *
 * Research #7 (ADHD closure anchor): ADHD users often struggle with task
 * switching and "can't stop" loops at end of day. A brief intentional closure
 * ritual reduces hyper-focus spillover and prepares the brain for rest.
 *
 * Triggers: hour >= 21 (9pm), onboardingCompleted, shown at most once per day.
 * Never blocks — skip button always visible from step 1.
 *
 * Step 1: Celebrate today's completions (non-quantified, shame-free)
 * Step 2: Set ONE thing for tomorrow (seeds next session context)
 * Step 3: Goodnight — warm close, auto-dismiss after 3s
 */

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useMotion } from '@/shared/hooks/useMotion'
import { useStore } from '@/store'
import { supabase } from '@/shared/lib/supabase'
import { logError } from '@/shared/lib/logger'
import type { Task } from '@/types'

interface Props {
  onDismiss: () => void
}

type Step = 'wins' | 'tomorrow' | 'goodnight'

const GOODNIGHT_MESSAGES = [
  "You showed up today. That's everything. 🌙",
  "Rest is productive too. See you tomorrow. ✨",
  "Today counted. Even the messy parts. 💙",
  "You did enough. Now breathe. 🌿",
  "Tomorrow is already set. Sleep well. 🌠",
]

export function ShutdownRitual({ onDismiss }: Props) {
  const { nowPool, nextPool, somedayPool, addTask, userId, setShutdownShownDate } = useStore()
  const { t } = useMotion()
  const [step, setStep] = useState<Step>('wins')
  const [tomorrowInput, setTomorrowInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [goodnight] = useState(
    () => GOODNIGHT_MESSAGES[Math.floor(Math.random() * GOODNIGHT_MESSAGES.length)]
  )

  // Today's completed tasks
  const today = new Date().toISOString().split('T')[0]
  const todayWins = [...nowPool, ...nextPool, ...somedayPool].filter(
    t => t.status === 'completed' && t.completedAt?.startsWith(today)
  )

  // Auto-dismiss from goodnight step after 3s
  useEffect(() => {
    if (step !== 'goodnight') return
    const timer = setTimeout(() => {
      setShutdownShownDate(today)
      onDismiss()
    }, 3000)
    return () => clearTimeout(timer)
  }, [step, today, setShutdownShownDate, onDismiss])

  const handleSkip = useCallback(() => {
    setShutdownShownDate(today)
    onDismiss()
  }, [today, setShutdownShownDate, onDismiss])

  const handleSetTomorrow = async () => {
    const title = tomorrowInput.trim()
    if (!title || isSubmitting) return
    setIsSubmitting(true)

    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().split('T')[0]
    const newTask: Task = {
      id: crypto.randomUUID(),
      title,
      pool: 'next',
      status: 'active',
      difficulty: 2,
      estimatedMinutes: 25,
      createdAt: new Date().toISOString(),
      completedAt: null,
      snoozeCount: 0,
      parentTaskId: null,
      position: 0,
      dueDate: tomorrow,
      dueTime: null,
      taskType: 'task',
      reminderSentAt: null,
      repeat: 'none',
    }
    addTask(newTask)

    if (userId) {
      try {
        await supabase.from('tasks').insert({
          id: newTask.id, user_id: userId, title: newTask.title,
          pool: newTask.pool, status: newTask.status, difficulty: newTask.difficulty,
          estimated_minutes: newTask.estimatedMinutes, parent_task_id: null,
          position: newTask.position, due_date: newTask.dueDate,
        } as never)
      } catch (err) {
        logError('ShutdownRitual.insert', err)
      }
    }

    setIsSubmitting(false)
    setStep('goodnight')
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex flex-col justify-center px-6"
        style={{
          background: 'linear-gradient(180deg, #0F1117 0%, #0D0E1E 50%, #12102A 100%)',
        }}
      >
        {/* Night sky glow */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.12, scale: 1 }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 60% 40% at 50% 30%, #4ECDC4, #7B72FF30, transparent)',
          }}
        />

        <div className="relative max-w-sm mx-auto w-full flex flex-col gap-8">

          {/* Step indicator */}
          <div className="flex justify-center gap-2">
            {(['wins', 'tomorrow', 'goodnight'] as Step[]).map((s, i) => (
              <motion.div
                key={s}
                className="rounded-full"
                animate={{
                  width: step === s ? 20 : 6,
                  height: 6,
                  backgroundColor:
                    step === s ? '#4ECDC4'
                    : (['wins', 'tomorrow', 'goodnight'].indexOf(step) > i) ? '#7B72FF'
                    : 'rgba(255,255,255,0.10)',
                }}
                transition={{ duration: 0.3 }}
              />
            ))}
          </div>

          {/* ── Step 1: Wins ─────────────────────────────────────────────── */}
          <AnimatePresence mode="wait">
            {step === 'wins' && (
              <motion.div
                key="wins"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ ...t(), duration: 0.35 }}
                className="flex flex-col gap-6"
              >
                <div className="text-center">
                  <p className="text-4xl mb-3">🌙</p>
                  <h2 className="text-xl font-semibold" style={{ color: '#E8E8F0' }}>
                    Time to wind down
                  </h2>
                  <p className="text-sm mt-2" style={{ color: '#8B8BA7' }}>
                    {todayWins.length > 0
                      ? `You finished ${todayWins.length} thing${todayWins.length !== 1 ? 's' : ''} today 💙`
                      : "Opening this app was a step forward 💙"}
                  </p>
                </div>

                {todayWins.length > 0 && (
                  <div className="flex flex-col gap-2">
                    {todayWins.slice(0, 4).map(task => (
                      <div
                        key={task.id}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl"
                        style={{ background: 'rgba(78,205,196,0.06)', border: '1px solid rgba(78,205,196,0.12)' }}
                      >
                        <span style={{ color: '#4ECDC4' }}>✓</span>
                        <span className="text-sm" style={{ color: '#C8C8E0' }}>{task.title}</span>
                      </div>
                    ))}
                    {todayWins.length > 4 && (
                      <p className="text-xs text-center" style={{ color: '#5A5B72' }}>
                        +{todayWins.length - 4} more — all counted 🌟
                      </p>
                    )}
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => setStep('tomorrow')}
                    className="w-full py-4 rounded-2xl font-semibold text-base transition-all duration-200"
                    style={{ background: '#4ECDC4', color: '#0F1117' }}
                  >
                    Set tomorrow's focus →
                  </button>
                  <button
                    onClick={handleSkip}
                    className="w-full py-3 text-sm"
                    style={{ color: '#8B8BA7' }}
                  >
                    Skip — just close
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── Step 2: Tomorrow's ONE thing ───────────────────────────── */}
            {step === 'tomorrow' && (
              <motion.div
                key="tomorrow"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ ...t(), duration: 0.35 }}
                className="flex flex-col gap-6"
              >
                <div className="text-center">
                  <p className="text-4xl mb-3">🌅</p>
                  <h2 className="text-xl font-semibold" style={{ color: '#E8E8F0' }}>
                    What's the ONE thing tomorrow?
                  </h2>
                  <p className="text-sm mt-2" style={{ color: '#8B8BA7' }}>
                    It'll be waiting in NEXT when you wake up.
                  </p>
                </div>

                <textarea
                  value={tomorrowInput}
                  onChange={e => setTomorrowInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      void handleSetTomorrow()
                    }
                  }}
                  placeholder="One thing for tomorrow..."
                  rows={2}
                  autoFocus
                  className="w-full resize-none rounded-2xl px-4 py-3 text-base outline-none transition-all duration-200"
                  style={{
                    background: '#1E2136',
                    border: '1px solid rgba(255,255,255,0.06)',
                    color: '#E8E8F0',
                    caretColor: '#4ECDC4',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#4ECDC4' }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }}
                />

                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => void handleSetTomorrow()}
                    disabled={!tomorrowInput.trim() || isSubmitting}
                    className="w-full py-4 rounded-2xl font-semibold text-base transition-all duration-200"
                    style={{
                      background: tomorrowInput.trim() ? '#4ECDC4' : '#252840',
                      color: tomorrowInput.trim() ? '#0F1117' : '#8B8BA7',
                      cursor: tomorrowInput.trim() ? 'pointer' : 'not-allowed',
                    }}
                  >
                    {isSubmitting ? 'Saving...' : 'Save & rest 🌙'}
                  </button>
                  <button
                    onClick={() => setStep('goodnight')}
                    className="w-full py-3 text-sm"
                    style={{ color: '#8B8BA7' }}
                  >
                    Skip — just rest
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── Step 3: Goodnight ──────────────────────────────────────── */}
            {step === 'goodnight' && (
              <motion.div
                key="goodnight"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ ...t('expressive'), duration: 0.5 }}
                className="flex flex-col items-center gap-6 text-center"
              >
                <motion.p
                  className="text-6xl"
                  animate={{ rotate: [0, -8, 8, -4, 0] }}
                  transition={{ duration: 1.2, delay: 0.3 }}
                >
                  🌙
                </motion.p>
                <p className="text-xl font-medium leading-relaxed" style={{ color: '#E8E8F0' }}>
                  {goodnight}
                </p>
                <p className="text-xs" style={{ color: '#5A5B72' }}>
                  Closing in a moment...
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
