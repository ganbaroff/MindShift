import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '@/store'
import { supabase } from '@/shared/lib/supabase'
import type { Task } from '@/types'
import { RECOVERY_THRESHOLD_HOURS } from '@/shared/lib/constants'
import { logError } from '@/shared/lib/logger'

// ── Fallback messages (no shame, no guilt) ────────────────────────────────────

const FALLBACK_MESSAGES = [
  "Welcome back 🌱 Your tasks have been moved to Someday — no pressure.",
  "Hey, you're here. That's what matters. 🌿 Fresh start, right now.",
  "Good to see you 💙 Everything's been saved. Let's take it one step at a time.",
  "Back again 🌸 Your old tasks are waiting patiently. What matters most today?",
]

interface Props {
  onDismiss: () => void
}

export function RecoveryProtocol({ onDismiss }: Props) {
  const { archiveAllOverdue, addTask, nowPool, userId, lastSessionAt } = useStore()
  const [taskInput, setTaskInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [archivedCount, setArchivedCount] = useState(0)
  const [welcomeMsg, setWelcomeMsg] = useState(
    () => FALLBACK_MESSAGES[Math.floor(Math.random() * FALLBACK_MESSAGES.length)]
  )
  const [loadingAi, setLoadingAi] = useState(false)

  // Archive overdue tasks + fetch AI welcome on mount
  useEffect(() => {
    const ids = archiveAllOverdue()
    setArchivedCount(ids.length)

    // Calculate days absent
    const daysAbsent = lastSessionAt
      ? Math.floor((Date.now() - new Date(lastSessionAt).getTime()) / (1000 * 60 * 60 * 24))
      : Math.ceil(RECOVERY_THRESHOLD_HOURS / 24)

    // Fetch personalized recovery message (non-blocking)
    setLoadingAi(true)
    supabase.functions.invoke('recovery-message', {
      body: { daysAbsent, incompleteCount: ids.length },
    }).then(({ data }) => {
      if (data?.message) setWelcomeMsg(data.message as string)
    }).catch(() => { /* fallback already set */ }).finally(() => {
      setLoadingAi(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async () => {
    const title = taskInput.trim()
    if (!title || isSubmitting) return

    setIsSubmitting(true)

    // Try AI decomposition first — break the ONE thing into micro-steps
    try {
      const { data } = await supabase.functions.invoke('decompose-task', {
        body: { taskTitle: title },
      })
      if (data?.steps && Array.isArray(data.steps) && data.steps.length > 0) {
        // AI decomposed — add each step as a task
        const steps = data.steps as string[]
        const estMinutes = typeof data.estimatedMinutes === 'number' ? data.estimatedMinutes : 25
        for (let i = 0; i < steps.length; i++) {
          const stepTask: Task = {
            id: crypto.randomUUID(),
            title: steps[i],
            pool: i === 0 ? 'now' : 'next',
            status: 'active',
            difficulty: 2,
            estimatedMinutes: Math.max(5, Math.round(estMinutes / steps.length)),
            createdAt: new Date().toISOString(),
            completedAt: null,
            snoozeCount: 0,
            parentTaskId: null,
            position: i,
          }
          addTask(stepTask)
          if (userId) {
            try {
              await supabase.from('tasks').insert({
                id: stepTask.id, user_id: userId, title: stepTask.title,
                pool: stepTask.pool, status: stepTask.status, difficulty: stepTask.difficulty,
                estimated_minutes: stepTask.estimatedMinutes, parent_task_id: null, position: stepTask.position,
              } as never)
            } catch (err) {
              logError('RecoveryProtocol.submitStep.insert', err)
            }
          }
        }
        onDismiss()
        return
      }
    } catch (err) {
      logError('RecoveryProtocol.submit.decompose', err)
      // Fall through to manual task creation below
    }

    // Fallback: add as single task
    const newTask: Task = {
      id: crypto.randomUUID(),
      title,
      pool: 'now',
      status: 'active',
      difficulty: 2,
      estimatedMinutes: 25,
      createdAt: new Date().toISOString(),
      completedAt: null,
      snoozeCount: 0,
      parentTaskId: null,
      position: nowPool.length,
    }

    addTask(newTask)

    // Persist to Supabase if authenticated
    if (userId) {
      try {
        await supabase.from('tasks').insert({
          id: newTask.id, user_id: userId, title: newTask.title,
          pool: newTask.pool, status: newTask.status, difficulty: newTask.difficulty,
          estimated_minutes: newTask.estimatedMinutes, parent_task_id: null, position: newTask.position,
        } as never)
      } catch (err) {
        logError('RecoveryProtocol.submit.insertFallback', err)
      }
    }

    onDismiss()
  }

  const handleSkip = () => {
    onDismiss()
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex flex-col justify-center px-6"
        style={{
          background: 'linear-gradient(180deg, #0F1117 0%, #1A1D2E 100%)',
        }}
      >
        {/* Soft glow accent */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.15, scale: 1 }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 60% 40% at 50% 30%, #6C63FF, transparent)',
          }}
        />

        <div className="relative max-w-sm mx-auto w-full flex flex-col gap-8">
          {/* Welcome section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col gap-3"
          >
            <div className="text-5xl text-center">🌱</div>
            {loadingAi ? (
              <div className="flex justify-center">
                <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" style={{ color: '#6C63FF' }} />
              </div>
            ) : (
              <p
                className="text-lg leading-relaxed text-center font-medium"
                style={{ color: '#E8E8F0' }}
              >
                {welcomeMsg}
              </p>
            )}
            {archivedCount > 0 && (
              <p className="text-sm text-center" style={{ color: '#8B8BA7' }}>
                {archivedCount} task{archivedCount !== 1 ? 's' : ''} moved to Someday — no guilt, just options.
              </p>
            )}
          </motion.div>

          {/* Task input */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col gap-3"
          >
            <label
              className="text-sm font-medium"
              style={{ color: '#8B8BA7' }}
              htmlFor="recovery-task"
            >
              What&apos;s the ONE thing that matters most right now?
            </label>
            <textarea
              id="recovery-task"
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void handleSubmit()
                }
              }}
              placeholder="Just one thing..."
              rows={2}
              autoFocus
              className="w-full resize-none rounded-2xl px-4 py-3 text-base outline-none transition-all duration-200"
              style={{
                background: '#1A1D2E',
                border: '1.5px solid #2D3150',
                color: '#E8E8F0',
                caretColor: '#6C63FF',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#6C63FF'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#2D3150'
              }}
            />
          </motion.div>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col gap-3"
          >
            <button
              onClick={() => void handleSubmit()}
              disabled={!taskInput.trim() || isSubmitting}
              className="w-full py-4 rounded-2xl font-semibold text-base transition-all duration-200"
              style={{
                background: taskInput.trim() ? '#6C63FF' : '#2D3150',
                color: taskInput.trim() ? '#FFFFFF' : '#8B8BA7',
                cursor: taskInput.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              {isSubmitting ? 'Adding...' : "Let's go →"}
            </button>

            <button
              onClick={handleSkip}
              className="w-full py-3 text-sm transition-all duration-200"
              style={{ color: '#8B8BA7' }}
            >
              Skip — just show me my tasks
            </button>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
