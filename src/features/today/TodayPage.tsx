/**
 * TodayPage — Smart Daily View.
 *
 * One screen that says "here's your day" with one-tap actions.
 * Adapts to time of day (morning/afternoon/evening) and energy level.
 * Reduces decision fatigue — the #1 enemy for ADHD brains.
 */

import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { Play, Plus, ChevronRight } from 'lucide-react'
import { useMotion } from '@/shared/hooks/useMotion'
import { useUITone } from '@/shared/hooks/useUITone'
import { useStore } from '@/store'
import { todayISO, tomorrowISO } from '@/shared/lib/dateUtils'
import { ENERGY_EMOJI } from '@/shared/lib/constants'
import { PageTransition } from '@/shared/ui/PageTransition'
import { QuickCapture } from '@/shared/ui/QuickCapture'
import type { Task, EnergyLevel } from '@/types'
import type { ParsedTask } from '@/shared/lib/quickParse'
import AddTaskModal from '@/components/AddTaskModal'
import TaskCard from '@/components/TaskCard'
import { WelcomeWalkthrough } from '@/shared/ui/WelcomeWalkthrough'
import { FeatureHint } from '@/shared/ui/FeatureHint'

// ── Time blocks ───────────────────────────────────────────────────────────────

type TimeBlock = 'morning' | 'afternoon' | 'evening'

function getTimeBlock(): TimeBlock {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 18) return 'afternoon'
  return 'evening'
}

const GREETINGS: Record<TimeBlock, { en: string; emoji: string }> = {
  morning:   { en: 'Good morning',   emoji: '☀️' },
  afternoon: { en: 'Good afternoon', emoji: '🌤️' },
  evening:   { en: 'Your day',       emoji: '🌙' },
}

// ── Energy advice ─────────────────────────────────────────────────────────────

function getEnergyAdvice(level: EnergyLevel, taskCount: number, copy: { lowEnergyNudge: string; highEnergyNudge: string }): string | null {
  if (level <= 2) return copy.lowEnergyNudge
  if (level >= 4 && taskCount > 0) return copy.highEnergyNudge
  return null
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TodayPage() {
  const navigate = useNavigate()
  const { shouldAnimate, t } = useMotion()
  const { copy, density } = useUITone()
  const {
    nowPool, nextPool, somedayPool,
    energyLevel,
    burnoutScore,
    weeklyStats,
    completedTotal,
    dailyFocusGoalMin,
    weeklyIntention,
    addTask, completeTask, snoozeTask,
  } = useStore()

  const [showAddTask, setShowAddTask] = useState(false)

  const timeBlock = useMemo(getTimeBlock, [])
  const todayStr = useMemo(todayISO, [])
  const tomorrowStr = useMemo(tomorrowISO, [])
  const isLowEnergy = energyLevel <= 2 || burnoutScore > 60

  // ENERGY_EMOJI is 0-indexed (0-4), energyLevel is 1-5
  const energyEmoji = ENERGY_EMOJI[energyLevel - 1] ?? '🙂'

  // ── Derived data ──────────────────────────────────────────────────────────

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

  const activeTasks = useMemo(
    () => nowPool.filter(tk => tk.status === 'active'),
    [nowPool],
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

  // ── Handlers ──────────────────────────────────────────────────────────────

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

  const handleQuickExpand = useCallback((_parsed: ParsedTask) => {
    setShowAddTask(true)
  }, [])

  const handleStartFocus = useCallback(() => {
    navigate('/focus')
  }, [navigate])

  // ── Render ────────────────────────────────────────────────────────────────

  const greeting = GREETINGS[timeBlock]

  return (
    <PageTransition>
      <div className="px-4 pt-6 pb-4 space-y-4">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-bold" style={{ color: '#E8E8F0' }}>
              {greeting.emoji} {greeting.en}
            </h1>
            {weeklyIntention && (
              <p className="text-[12px] mt-0.5" style={{ color: '#8B8BA7' }}>
                This week: {weeklyIntention}
              </p>
            )}
          </div>
          <div
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl"
            style={{ background: 'rgba(78,205,196,0.1)' }}
          >
            <span className="text-[14px]">{energyEmoji}</span>
            <span className="text-[11px] font-medium" style={{ color: '#4ECDC4' }}>
              {energyLevel}/5
            </span>
          </div>
        </div>

        {/* ── Quick Capture ──────────────────────────────────────────────── */}
        {/* ── Welcome walkthrough (first time only) ────────────────────── */}
        <WelcomeWalkthrough />

        {/* ── Quick Capture ──────────────────────────────────────────────── */}
        <QuickCapture
          onSubmit={handleQuickSubmit}
          onExpand={handleQuickExpand}
          placeholder="Add a task, reminder, or meeting..."
        />

        {/* ── First-time hints ───────────────────────────────────────────── */}
        <FeatureHint
          id="hint_quick_capture"
          icon="💡"
          text="Try typing 'meeting with Roma tomorrow at 3pm' — it'll auto-detect the type, date, and time"
          delay={2000}
        />

        {/* ── Energy advice ──────────────────────────────────────────────── */}
        <AnimatePresence>
          {energyAdvice && (
            <motion.div
              initial={shouldAnimate ? { opacity: 0, y: -8 } : false}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldAnimate ? { opacity: 0, y: -8 } : {}}
              transition={t()}
              className="px-3 py-2 rounded-xl"
              style={{
                background: isLowEnergy
                  ? 'rgba(245,158,11,0.08)'
                  : 'rgba(78,205,196,0.08)',
                border: `1px solid ${isLowEnergy ? 'rgba(245,158,11,0.15)' : 'rgba(78,205,196,0.15)'}`,
              }}
            >
              <p className="text-[12px]" style={{ color: isLowEnergy ? '#F59E0B' : '#4ECDC4' }}>
                {energyAdvice}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Morning/Afternoon: Today's plan ────────────────────────────── */}
        {timeBlock !== 'evening' && (
          <div className="space-y-3">
            {/* Summary strip */}
            <div
              className="flex items-center justify-between px-3 py-2.5 rounded-xl"
              style={{ background: '#1E2136' }}
            >
              <div className="flex items-center gap-3">
                <StatPill label="Tasks" value={todayTasks.length} color="#4ECDC4" />
                <StatPill label="Focus" value={`${todayFocusMin}m`} color="#7B72FF" />
                {completedToday.length > 0 && (
                  <StatPill label="Done" value={completedToday.length} color="#F59E0B" />
                )}
              </div>
              {dailyFocusGoalMin > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: '#252840' }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: todayFocusMin >= dailyFocusGoalMin ? '#4ECDC4' : '#7B72FF' }}
                      initial={false}
                      animate={{ width: `${Math.min(100, (todayFocusMin / dailyFocusGoalMin) * 100)}%` }}
                      transition={shouldAnimate ? { type: 'spring', damping: 20 } : { duration: 0 }}
                    />
                  </div>
                  <span className="text-[10px]" style={{ color: '#8B8BA7' }}>
                    {todayFocusMin}/{dailyFocusGoalMin}m
                  </span>
                </div>
              )}
            </div>

            {/* Today's tasks */}
            {todayTasks.length > 0 ? (
              <div className="space-y-1.5">
                <h2 className="text-[13px] font-semibold px-1" style={{ color: '#8B8BA7' }}>
                  Today
                </h2>
                {(isLowEnergy ? todayTasks.slice(0, 2) : todayTasks).map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onDone={completeTask}
                    onPark={snoozeTask}
                  />
                ))}
                {isLowEnergy && todayTasks.length > 2 && (
                  <p className="text-[11px] px-1" style={{ color: '#8B8BA7' }}>
                    +{todayTasks.length - 2} more — focus on these first
                  </p>
                )}
              </div>
            ) : activeTasks.length === 0 ? (
              <div
                className="text-center py-6 rounded-2xl space-y-3"
                style={{ background: 'rgba(78,205,196,0.05)' }}
              >
                <p className="text-[28px] mb-1">🌿</p>
                <p className="text-[14px] font-medium" style={{ color: '#E8E8F0' }}>
                  Clear day ahead
                </p>
                <p className="text-[12px]" style={{ color: '#8B8BA7' }}>
                  Add something or try a sample task
                </p>
                {completedTotal === 0 && (
                  <button
                    onClick={() => {
                      const sample: Task = {
                        id: crypto.randomUUID(),
                        title: 'Try a 5-minute focus session',
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
                    }}
                    className="mx-auto px-4 py-2 rounded-xl text-[13px] font-medium focus-visible:ring-2 focus-visible:ring-[#7B72FF]"
                    style={{
                      background: 'rgba(123,114,255,0.12)',
                      color: '#7B72FF',
                      border: '1px solid rgba(123,114,255,0.2)',
                    }}
                  >
                    Add a sample task
                  </button>
                )}
              </div>
            ) : null}

            {/* NOW pool tasks (not date-specific) */}
            {activeTasks.length > 0 && todayTasks.length === 0 && (
              <div className="space-y-1.5">
                <h2 className="text-[13px] font-semibold px-1" style={{ color: '#8B8BA7' }}>
                  In your NOW pool
                </h2>
                {activeTasks.slice(0, isLowEnergy ? 1 : density === 'compact' ? 2 : 3).map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onDone={completeTask}
                    onPark={snoozeTask}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Evening: Day recap ──────────────────────────────────────────── */}
        {timeBlock === 'evening' && (
          <div className="space-y-3">
            <div
              className="rounded-2xl p-4 space-y-3"
              style={{
                background: 'linear-gradient(135deg, rgba(123,114,255,0.08), rgba(78,205,196,0.05))',
                border: '1px solid rgba(123,114,255,0.12)',
              }}
            >
              <h2 className="text-[15px] font-semibold" style={{ color: '#E8E8F0' }}>
                Today's wrap-up
              </h2>
              <div className="flex gap-4">
                <RecapStat emoji="✅" value={completedToday.length} label="done" />
                <RecapStat emoji="⏱" value={`${todayFocusMin}m`} label="focused" />
                {density !== 'compact' && (
                  <RecapStat emoji="📊" value={completedTotal} label="total" />
                )}
              </div>
              {completedToday.length === 0 && todayFocusMin === 0 && (
                <p className="text-[12px]" style={{ color: '#8B8BA7' }}>
                  {copy.streakBreak}
                </p>
              )}
              {completedToday.length > 0 && (
                <p className="text-[12px]" style={{ color: '#4ECDC4' }}>
                  {copy.mochiGreat}
                </p>
              )}
            </div>

            {/* Tomorrow preview */}
            {tomorrowTasks.length > 0 && (
              <div className="space-y-1.5">
                <h2 className="text-[13px] font-semibold px-1" style={{ color: '#8B8BA7' }}>
                  Tomorrow
                </h2>
                {tomorrowTasks.slice(0, 3).map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onDone={completeTask}
                    onPark={snoozeTask}
                  />
                ))}
                {tomorrowTasks.length > 3 && (
                  <button
                    onClick={() => navigate('/tasks')}
                    className="text-[12px] flex items-center gap-1 px-1 focus-visible:ring-2 focus-visible:ring-[#7B72FF] rounded"
                    style={{ color: '#7B72FF' }}
                  >
                    +{tomorrowTasks.length - 3} more <ChevronRight size={12} />
                  </button>
                )}
              </div>
            )}

            {/* Remaining active tasks */}
            {activeTasks.length > 0 && (
              <div className="space-y-1.5">
                <h2 className="text-[13px] font-semibold px-1" style={{ color: '#8B8BA7' }}>
                  Still in NOW
                </h2>
                {activeTasks.slice(0, 2).map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onDone={completeTask}
                    onPark={snoozeTask}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Focus CTA ──────────────────────────────────────────────────── */}
        <motion.button
          onClick={handleStartFocus}
          className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 font-semibold text-[15px] focus-visible:ring-2 focus-visible:ring-[#7B72FF]"
          style={{
            background: 'linear-gradient(135deg, #7B72FF, #4ECDC4)',
            color: '#FFFFFF',
          }}
          whileTap={shouldAnimate ? { scale: 0.97 } : undefined}
          aria-label={firstTask ? `Start focusing on ${firstTask.title}` : 'Start a focus session'}
        >
          <Play size={16} fill="white" />
          {firstTask
            ? `Focus on: ${firstTask.title.length > 28 ? firstTask.title.slice(0, 28) + '...' : firstTask.title}`
            : 'Start a focus session'
          }
        </motion.button>

        {/* Progress link — not in nav */}
        <button
          onClick={() => navigate('/progress')}
          className="w-full py-2 rounded-xl text-[12px] font-medium text-center focus-visible:ring-2 focus-visible:ring-[#7B72FF]"
          style={{ color: '#8B8BA7' }}
        >
          View progress →
        </button>
      </div>

      {/* Add Task modal */}
      <AnimatePresence>
        {showAddTask && (
          <AddTaskModal
            open={showAddTask}
            onClose={() => setShowAddTask(false)}
          />
        )}
      </AnimatePresence>

      {/* Floating add button */}
      <button
        onClick={() => setShowAddTask(true)}
        className="fixed z-20 w-12 h-12 rounded-full flex items-center justify-center shadow-lg focus-visible:ring-2 focus-visible:ring-[#7B72FF]"
        style={{
          background: '#7B72FF',
          right: 16,
          bottom: 'calc(80px + env(safe-area-inset-bottom))',
        }}
        aria-label="Add task"
      >
        <Plus size={24} color="white" />
      </button>
    </PageTransition>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

function StatPill({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[15px] font-bold" style={{ color }}>{value}</span>
      <span className="text-[10px]" style={{ color: '#8B8BA7' }}>{label}</span>
    </div>
  )
}

function RecapStat({ emoji, value, label }: { emoji: string; value: string | number; label: string }) {
  return (
    <div className="text-center">
      <p className="text-[14px]">{emoji}</p>
      <p className="text-[18px] font-bold" style={{ color: '#E8E8F0' }}>{value}</p>
      <p className="text-[10px]" style={{ color: '#8B8BA7' }}>{label}</p>
    </div>
  )
}

