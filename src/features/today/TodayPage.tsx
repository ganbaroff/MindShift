/**
 * TodayPage — Smart Daily View.
 *
 * One screen that says "here's your day" with one-tap actions.
 * Adapts to time of day (morning/afternoon/evening) and energy level.
 * Reduces decision fatigue — the #1 enemy for ADHD brains.
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Play } from 'lucide-react'
import { useMotion } from '@/shared/hooks/useMotion'
import { useUITone } from '@/shared/hooks/useUITone'
import { useStore } from '@/store'
import { todayISO, tomorrowISO } from '@/shared/lib/dateUtils'
import { ENERGY_EMOJI } from '@/shared/lib/constants'
import { PageTransition } from '@/shared/ui/PageTransition'
import { QuickCapture } from '@/shared/ui/QuickCapture'
import type { Task } from '@/types'
import type { ParsedTask } from '@/shared/lib/quickParse'
import AddTaskModal from '@/components/AddTaskModal'
import { WelcomeWalkthrough } from '@/shared/ui/WelcomeWalkthrough'
import { TransitionNudge } from '@/shared/ui/TransitionNudge'
import { DiscoveryCard } from '@/shared/ui/DiscoveryCard'
import { getDiscoveryById } from '@/shared/lib/mochiDiscoveries'
import { FeatureHint } from '@/shared/ui/FeatureHint'
import { logEvent } from '@/shared/lib/logger'
import { getTimeBlock, GREETING_KEYS, GREETING_EMOJI, getEnergyAdvice } from './todayUtils'
import { TodayMorningPlan } from './TodayMorningPlan'
import { TodayEveningRecap } from './TodayEveningRecap'

export default function TodayPage() {
  const navigate = useNavigate()
  const { shouldAnimate, t: transition } = useMotion()
  const { t } = useTranslation()
  const { copy, density } = useUITone()
  const {
    nowPool, nextPool, somedayPool,
    energyLevel, setEnergyLevel,
    burnoutScore,
    weeklyStats,
    completedTotal,
    dailyFocusGoalMin,
    weeklyIntention,
    addTask, completeTask, snoozeTask,
    mochiDiscoveries,
  } = useStore()

  const [showAddTask, setShowAddTask] = useState(false)
  const [justCompleted, setJustCompleted] = useState(false)
  const [lastDiscoveryId, setLastDiscoveryId] = useState<string | null>(null)
  const [showEnergyPicker, setShowEnergyPicker] = useState(false)
  const energyPickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    logEvent('today_page_viewed', { time_block: timeBlock, energy: energyLevel })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!showEnergyPicker) return
    const handler = (e: MouseEvent) => {
      if (energyPickerRef.current && !energyPickerRef.current.contains(e.target as Node)) {
        setShowEnergyPicker(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showEnergyPicker])

  const timeBlock = useMemo(getTimeBlock, [])
  const todayStr = useMemo(todayISO, [])
  const tomorrowStr = useMemo(tomorrowISO, [])
  const isLowEnergy = energyLevel <= 2 || burnoutScore > 60
  const energyEmoji = ENERGY_EMOJI[energyLevel - 1] ?? '🙂'

  // ── Derived data ────────────────────────────────────────────────────────────

  const allTasks = useMemo(
    () => [...nowPool, ...nextPool, ...somedayPool],
    [nowPool, nextPool, somedayPool],
  )

  const todayTasks = useMemo(
    () => allTasks
      .filter(tk => tk.status === 'active' && tk.dueDate === todayStr)
      .sort((a, b) => {
        if (a.dueTime && b.dueTime) return a.dueTime.localeCompare(b.dueTime)
        if (a.dueTime) return -1
        if (b.dueTime) return 1
        return 0
      }),
    [allTasks, todayStr],
  )

  // activeTasks: NOW pool tasks for today's view — exclude future-dated tasks so tomorrow's
  // tasks don't bleed into today's "NOW pool" section (they stay in the date-specific filter)
  const activeTasks = useMemo(
    () => nowPool.filter(tk => tk.status === 'active' && (!tk.dueDate || tk.dueDate <= todayStr)),
    [nowPool, todayStr],
  )
  const completedToday = useMemo(
    () => allTasks.filter(tk => tk.status === 'completed' && tk.completedAt?.startsWith(todayStr)),
    [allTasks, todayStr],
  )
  const tomorrowTasks = useMemo(
    () => allTasks.filter(tk => tk.status === 'active' && tk.dueDate === tomorrowStr),
    [allTasks, tomorrowStr],
  )
  const todayFocusMin = useMemo(() => {
    if (!weeklyStats?.dailyMinutes) return 0
    const dayIdx = (new Date().getDay() + 6) % 7
    return weeklyStats.dailyMinutes[dayIdx] ?? 0
  }, [weeklyStats])

  const firstTask = activeTasks[0] ?? todayTasks[0] ?? null
  const energyAdvice = getEnergyAdvice(energyLevel, todayTasks.length, copy)

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleQuickSubmit = useCallback((parsed: ParsedTask) => {
    if (!parsed.title) return
    const task: Task = {
      id: crypto.randomUUID(),
      title: parsed.title,
      pool: parsed.taskType === 'idea' ? 'someday' : 'now',
      status: 'active',
      difficulty: 2,
      estimatedMinutes: 25,
      completedAt: null,
      createdAt: new Date().toISOString(),
      snoozeCount: 0,
      parentTaskId: null,
      position: 0,
      dueDate: parsed.dueDate,
      dueTime: parsed.dueTime,
      taskType: parsed.taskType,
      reminderSentAt: null,
      repeat: 'none',
    }
    addTask(task)
  }, [addTask])

  const handleCompleteTask = useCallback((taskId: string) => {
    logEvent('task_completed_today', { from: 'today_page' })
    const prevCount = mochiDiscoveries.length
    completeTask(taskId)
    setJustCompleted(true)
    setTimeout(() => {
      const newDiscoveries = useStore.getState().mochiDiscoveries
      if (newDiscoveries.length > prevCount) {
        setLastDiscoveryId(newDiscoveries[newDiscoveries.length - 1])
      }
    }, 50)
  }, [completeTask, mochiDiscoveries.length])

  const handleAddSample = useCallback(() => {
    const sample: Task = {
      id: crypto.randomUUID(),
      title: t('today.sampleTask'),
      pool: 'now',
      status: 'active',
      difficulty: 1,
      estimatedMinutes: 5,
      completedAt: null,
      createdAt: new Date().toISOString(),
      snoozeCount: 0,
      parentTaskId: null,
      position: 0,
      dueDate: todayStr,
      dueTime: null,
      taskType: 'task',
      reminderSentAt: null,
      repeat: 'none',
    }
    addTask(sample)
  }, [addTask, todayStr, t])

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <PageTransition>
      <div className="px-4 pt-6 pb-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-bold" style={{ color: 'var(--color-text-primary)' }}>
              {GREETING_EMOJI[timeBlock]} {t(GREETING_KEYS[timeBlock])}
            </h1>
            {weeklyIntention && (
              <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                {t('today.thisWeek', { intention: weeklyIntention })}
              </p>
            )}
          </div>
          <div ref={energyPickerRef} className="relative">
            <button
              onClick={() => setShowEnergyPicker(v => !v)}
              className="flex items-center gap-1 px-2.5 py-1 min-h-[44px] rounded-xl focus-visible:ring-2 focus-visible:ring-[#7B72FF]"
              style={{ background: 'rgba(78,205,196,0.1)' }}
              aria-label={`Energy level ${energyLevel} of 5 — tap to update`}
              aria-expanded={showEnergyPicker}
            >
              <span className="text-[14px]">{energyEmoji}</span>
              <span className="text-[11px] font-medium" style={{ color: 'var(--color-teal)' }}>
                {energyLevel}/5
              </span>
            </button>
            <AnimatePresence>
              {showEnergyPicker && (
                <motion.div
                  initial={shouldAnimate ? { opacity: 0, scale: 0.9, y: -4 } : false}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={shouldAnimate ? { opacity: 0, scale: 0.9, y: -4 } : {}}
                  transition={transition()}
                  className="absolute right-0 top-full mt-1.5 z-20 flex gap-1 p-2 rounded-2xl shadow-lg"
                  style={{ background: 'var(--color-surface-card)', border: '1px solid rgba(78,205,196,0.2)' }}
                >
                  {ENERGY_EMOJI.map((emoji, i) => (
                    <button
                      key={i}
                      onClick={() => { setEnergyLevel((i + 1) as import('@/types').EnergyLevel); setShowEnergyPicker(false) }}
                      className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl focus-visible:ring-2 focus-visible:ring-[#7B72FF]"
                      style={{
                        background: energyLevel === i + 1 ? 'rgba(78,205,196,0.15)' : 'transparent',
                      }}
                      aria-label={`Set energy to ${i + 1}`}
                      aria-pressed={energyLevel === i + 1}
                    >
                      <span className="text-[18px]">{emoji}</span>
                      <span className="text-[9px]" style={{ color: 'var(--color-text-muted)' }}>{i + 1}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <WelcomeWalkthrough />

        <QuickCapture
          onSubmit={handleQuickSubmit}
          onExpand={() => setShowAddTask(true)}
          placeholder={t('quickCapture.placeholder')}
        />

        <FeatureHint id="hint_quick_capture" icon="💡" text={t('quickCapture.hint')} delay={2000} />

        {/* Energy advice */}
        <AnimatePresence>
          {energyAdvice && (
            <motion.div
              initial={shouldAnimate ? { opacity: 0, y: -8 } : false}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldAnimate ? { opacity: 0, y: -8 } : {}}
              transition={transition()}
              className="px-3 py-2 rounded-xl"
              style={{
                background: isLowEnergy ? 'rgba(245,158,11,0.08)' : 'rgba(78,205,196,0.08)',
                border: `1px solid ${isLowEnergy ? 'rgba(245,158,11,0.15)' : 'rgba(78,205,196,0.15)'}`,
              }}
            >
              <p className="text-[12px]" style={{ color: isLowEnergy ? 'var(--color-gold)' : 'var(--color-teal)' }}>
                {energyAdvice}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Morning / Afternoon plan */}
        {timeBlock !== 'evening' && (
          <TodayMorningPlan
            todayTasks={todayTasks}
            activeTasks={activeTasks}
            completedToday={completedToday}
            todayFocusMin={todayFocusMin}
            dailyFocusGoalMin={dailyFocusGoalMin}
            isLowEnergy={isLowEnergy}
            density={density}
            completedTotal={completedTotal}
            nextTasksCount={nextPool.filter(t => t.status === 'active').length}
            onComplete={handleCompleteTask}
            onPark={snoozeTask}
            onAddSample={handleAddSample}
            onShowAddTask={() => setShowAddTask(true)}
          />
        )}

        {/* Evening recap */}
        {timeBlock === 'evening' && (
          <TodayEveningRecap
            completedToday={completedToday}
            tomorrowTasks={tomorrowTasks}
            activeTasks={activeTasks}
            todayFocusMin={todayFocusMin}
            completedTotal={completedTotal}
            density={density}
            onComplete={handleCompleteTask}
            onPark={snoozeTask}
          />
        )}

        {/* Discovery + Transition nudge */}
        <AnimatePresence>
          {lastDiscoveryId && (() => {
            const d = getDiscoveryById(lastDiscoveryId)
            return d ? <DiscoveryCard discovery={d} onDismiss={() => setLastDiscoveryId(null)} /> : null
          })()}
        </AnimatePresence>
        <AnimatePresence>
          {justCompleted && (
            <TransitionNudge
              nextTask={firstTask}
              onFocus={() => navigate('/focus')}
              onDismiss={() => setJustCompleted(false)}
            />
          )}
        </AnimatePresence>

        {/* Focus CTA */}
        <motion.button
          onClick={() => { logEvent('focus_cta_tapped', { has_task: firstTask ? 1 : 0 }); navigate('/focus') }}
          className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 font-semibold text-[15px] focus-visible:ring-2 focus-visible:ring-[#7B72FF]"
          style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-teal))', color: '#FFFFFF' }}
          whileTap={shouldAnimate ? { scale: 0.97 } : undefined}
          aria-label={firstTask ? t('today.focusOn', { title: firstTask.title }) : t('today.startFocus')}
        >
          <Play size={16} fill="white" />
          {firstTask
            ? t('today.focusOn', { title: firstTask.title.length > 28 ? firstTask.title.slice(0, 28) + '...' : firstTask.title })
            : t('today.startFocus')
          }
        </motion.button>

        <button
          onClick={() => navigate('/progress')}
          className="w-full py-3 rounded-xl text-[12px] font-medium text-center focus-visible:ring-2 focus-visible:ring-[#7B72FF]"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {t('today.viewProgress')}
        </button>
      </div>

      <AnimatePresence>
        {showAddTask && (
          <AddTaskModal open={showAddTask} onClose={() => setShowAddTask(false)} />
        )}
      </AnimatePresence>
    </PageTransition>
  )
}
