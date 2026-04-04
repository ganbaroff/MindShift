import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useMotion } from '@/shared/hooks/useMotion'
import { useStore } from '@/store'
import { supabase } from '@/shared/lib/supabase'
import Avatar from '@/features/progress/Avatar'
import type { Task } from '@/types'
import { RECOVERY_THRESHOLD_HOURS } from '@/shared/lib/constants'
import { logError, logEvent } from '@/shared/lib/logger'
import { pushWelcomeBack, notifyAchievement } from '@/shared/lib/notify'
import { useUITone } from '@/shared/hooks/useUITone'
import { getToneCopy } from '@/shared/lib/uiTone'
import { ACHIEVEMENT_DEFINITIONS } from '@/types'
import { SpicinessPicker } from './SpicinessPicker'

// ── Fallback messages (Research #7: identity-reinforcing, shame-free) ────────
// Rules: no quantifying absence, no streaks, forward-looking, persona-voiced.
// Fifth message explicitly reinforces resilient identity ("consistent returner").

// Fallback messages kept as reference (Research #7: identity-reinforcing, shame-free).
// Currently unused — AI-generated messages via mochi-respond are preferred.
// "Welcome back 🌱 Your old tasks are safely stored — no pressure, no backlog."
// "Hey, you're here. That's what matters. 🌿 Fresh start, right now."
// "Good to see you 💙 Everything waited for you. Let's take it one step at a time."
// "Back again 🌸 Opening this app took courage. What's one thing we can do together?"
// "You always come back. 💫 That's who you are — a consistent returner, not a perfect one."

// ── Micro-win suggestion chips (Research #7: pre-populated options lower barrier) ──
// Low-stakes, achievable in minutes — generate immediate dopamine burst before backlog.

const MICRO_WIN_KEYS = [
  'recovery.microWinWater',
  'recovery.microWinDesk',
  'recovery.microWinWrite',
  'recovery.microWinBreathe',
  'recovery.microWinReply',
] as const

const MICRO_WIN_EMOJIS = ['💧', '🗂️', '📝', '🌬️', '📨'] as const

interface Props {
  onDismiss: () => void
}

export function RecoveryProtocol({ onDismiss }: Props) {
  const { archiveAllOverdue, addTask, nowPool, userId, lastSessionAt, xpTotal, email, hasAchievement, unlockAchievement, uiTone, emotionalReactivity, psychotype, timeBlindness } = useStore()
  const { t: transition } = useMotion()
  const { t } = useTranslation()
  const { copy } = useUITone()
  const [taskInput, setTaskInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [archivedCount, setArchivedCount] = useState(0)
  const [welcomeMsg, setWelcomeMsg] = useState(() => copy.recoveryWelcome)
  const [loadingAi, setLoadingAi] = useState(false)
  // Spiciness meter — Research #3 (Goblin Tools): "How overwhelmed are you?"
  // 1 = very overwhelmed (max granularity), 5 = barely overwhelmed (fewer steps)
  const [spiciness, setSpiciness] = useState(3)
  // Hoisted to component scope so handleSubmit can inject into decompose-task
  const locale = navigator.language?.split('-')[0] ?? 'en'

  // S-5 Ghosting Grace: absence duration drives UI tone + CTA copy
  const daysAbsent = useMemo(() =>
    lastSessionAt
      ? Math.floor((Date.now() - new Date(lastSessionAt).getTime()) / (1000 * 60 * 60 * 24))
      : Math.ceil(RECOVERY_THRESHOLD_HOURS / 24)
  , [lastSessionAt])
  // short = 3-7d (normal break), medium = 7-30d (been a while), long = 30d+ (fresh start tone)
  const durationTier = daysAbsent >= 30 ? 'long' : daysAbsent >= 7 ? 'medium' : 'short'

  // Archive overdue tasks + fetch AI welcome + fire welcome-back push on mount
  useEffect(() => {
    logEvent('recovery_shown', { days_absent: daysAbsent, duration_tier: durationTier })
    // Native push — visible when app was backgrounded (silent, no shame)
    // Extract first name from email or use generic greeting
    const userName = email ? email.split('@')[0].split('.')[0] : undefined
    pushWelcomeBack(userName)

    const ids = archiveAllOverdue()
    setArchivedCount(ids.length)

    // Fetch personalized recovery message (non-blocking)
    setLoadingAi(true)
    supabase.functions.invoke('recovery-message', {
      body: { daysAbsent, incompleteCount: ids.length, locale, emotionalReactivity, psychotype, timeBlindness },
    }).then(({ data }) => {
      if (data?.message) setWelcomeMsg(data.message as string)
    }).catch(() => { /* fallback already set */ }).finally(() => {
      setLoadingAi(false)
    })

    // Achievements: comeback_kid + recover_rise — return after 3+ days absence
    const tryUnlockRecovery = (key: string) => {
      if (!hasAchievement(key)) {
        unlockAchievement(key)
        const toneCopy = getToneCopy(uiTone)
        const def = ACHIEVEMENT_DEFINITIONS.find(a => a.key === key)
        if (def) notifyAchievement(toneCopy.badgeUnlocked(def.name), def.emoji, def.description)
      }
    }
    tryUnlockRecovery('comeback_kid')
    tryUnlockRecovery('recover_rise')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async () => {
    const title = taskInput.trim()
    if (!title || isSubmitting) return

    setIsSubmitting(true)

    // Try AI decomposition first — break the ONE thing into micro-steps
    try {
      const { data } = await supabase.functions.invoke('decompose-task', {
        body: { taskTitle: title, spiciness, locale },
      })
      if (data?.steps && Array.isArray(data.steps) && data.steps.length > 0) {
        // Achievement: brain_trust — use AI decomposition
        if (!hasAchievement('brain_trust')) {
          unlockAchievement('brain_trust')
          const toneCopy = getToneCopy(uiTone)
          const def = ACHIEVEMENT_DEFINITIONS.find(a => a.key === 'brain_trust')
          if (def) notifyAchievement(toneCopy.badgeUnlocked(def.name), def.emoji, def.description)
        }
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
            dueDate: null,
            dueTime: null,
            taskType: 'task',
            reminderSentAt: null,
            repeat: 'none',
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
      dueDate: null,
      dueTime: null,
      taskType: 'task',
      reminderSentAt: null,
      repeat: 'none',
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
    logEvent('recovery_dismissed', { action: 'skip', duration_tier: durationTier })
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
          background: 'linear-gradient(180deg, #0F1117 0%, #1A1B30 50%, #1E1A2E 100%)',
        }}
      >
        {/* Warm glow accent — deep blue → warm purple (feels like a hug) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.18, scale: 1 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 70% 45% at 50% 35%, #7B72FF, #4ECDC420, transparent)',
          }}
        />

        <div className="relative max-w-sm mx-auto w-full flex flex-col gap-8">
          {/* Welcome section — Avatar + empathetic message */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...transition(), delay: 0.2 }}
            className="flex flex-col items-center gap-4"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ ...transition('expressive'), delay: 0.3 }}
            >
              <Avatar level={Math.floor(xpTotal / 100) + 1} size={80} />
            </motion.div>
            {loadingAi ? (
              <div className="flex justify-center">
                <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin motion-reduce:animate-none motion-reduce:opacity-60" style={{ color: 'var(--color-primary)' }} />
              </div>
            ) : (
              <p
                className="text-lg leading-relaxed text-center font-medium"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {welcomeMsg}
              </p>
            )}
            {/* S-5 Ghosting Grace: duration badge — normalises absence as a valid pause */}
            <p className="text-[11px] text-center" style={{ color: 'var(--color-text-muted)', opacity: 0.65 }}>
              {daysAbsent < 7
                ? t('recovery.daysAway', { count: daysAbsent })
                : daysAbsent < 30
                  ? t('recovery.weeksAway', { count: Math.floor(daysAbsent / 7) })
                  : t('recovery.longAway')
              }
            </p>

            {archivedCount > 0 && (
              <p className="text-sm text-center" style={{ color: 'var(--color-text-muted)' }}>
                🗃️ {t(archivedCount !== 1 ? 'recovery.archivedTasksPlural' : 'recovery.archivedTasks', { count: archivedCount })}
              </p>
            )}
          </motion.div>

          {/* Spiciness meter — Research #3 (Goblin Tools): overwhelm scale */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...transition(), delay: 0.35 }}
            className="flex flex-col gap-2"
          >
            <p className="text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
              🌶️ {t('recovery.overwhelmQuestion')}
            </p>
            <SpicinessPicker value={spiciness} onChange={setSpiciness} />
          </motion.div>

          {/* Task input */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...transition(), delay: 0.45 }}
            className="flex flex-col gap-3"
          >
            <label
              className="text-sm font-medium"
              style={{ color: 'var(--color-text-muted)' }}
              htmlFor="recovery-task"
            >
              {t('recovery.oneThingLabel')}
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
              placeholder={t('recovery.oneThing')}
              rows={2}
              autoFocus
              className="w-full resize-none rounded-2xl px-4 py-3 text-base outline-none transition-all duration-200"
              style={{
                background: 'var(--color-surface-card)',
                border: '1px solid rgba(255,255,255,0.06)',
                color: 'var(--color-text-primary)',
                caretColor: 'var(--color-primary)',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-primary)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
              }}
            />

            {/* Micro-win suggestion chips — Research #7: lower blank-slate barrier */}
            <div className="flex flex-wrap gap-2 mt-1">
              <p className="w-full text-xs mb-0.5" style={{ color: 'var(--color-text-muted)' }}>
                {t('recovery.orPickEasy')}
              </p>
              {MICRO_WIN_KEYS.map((key, i) => {
                const label = `${t(key)} ${MICRO_WIN_EMOJIS[i]}`
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTaskInput(label)}
                    className="text-xs px-3 py-1.5 rounded-xl transition-all duration-150 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:outline-none"
                    style={{
                      background: taskInput === label ? 'rgba(123,114,255,0.18)' : 'var(--color-surface-card)',
                      border: `1px solid ${taskInput === label ? 'var(--color-primary)' : 'rgba(255,255,255,0.06)'}`,
                      color: taskInput === label ? 'var(--color-primary-light)' : 'var(--color-text-muted)',
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </motion.div>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...transition(), delay: 0.55 }}
            className="flex flex-col gap-3"
          >
            <button
              onClick={() => void handleSubmit()}
              disabled={!taskInput.trim() || isSubmitting}
              className="w-full py-4 rounded-2xl font-semibold text-base transition-all duration-200 focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none"
              style={{
                background: taskInput.trim() ? 'var(--color-primary)' : 'var(--color-surface-raised)',
                color: taskInput.trim() ? '#FFFFFF' : 'var(--color-text-muted)',
                cursor: taskInput.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              {isSubmitting ? t('recovery.adding') : t('recovery.letsGo')}
            </button>

            <button
              onClick={handleSkip}
              className="w-full py-3 text-sm transition-all duration-200 rounded-xl focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:outline-none"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {durationTier === 'long' ? t('recovery.skipLong')
                : durationTier === 'medium' ? t('recovery.skipMedium')
                : t('recovery.skipShowTasks')}
            </button>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
