// ── CalendarScreen ────────────────────────────────────────────────────────────
// Month grid + list view for tasks with due dates.
// ADHD-safe: no "OVERDUE", no red, warm amber for past-due items.

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useMotion } from '@/shared/hooks/useMotion'
import { useStore } from '@/store'
import { toast } from 'sonner'
import { CalendarDays, List } from 'lucide-react'
import type { Task } from '@/types'
import { getDueDateLabel, downloadICS } from '@/features/tasks/AddTaskModal'
import { reminders } from '@/shared/lib/reminders'

// ── Calendar helpers ──────────────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()  // 0=Sun … 6=Sat
}

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function getTasksForDate(tasks: Task[], date: string): Task[] {
  return tasks.filter(t => t.dueDate === date && t.status === 'active')
}

interface Grouped {
  overdue:   Task[]
  today:     Task[]
  tomorrow:  Task[]
  thisWeek:  Task[]
  later:     Task[]
}

function groupTasksByDueDate(tasks: Task[]): Grouped {
  const now   = new Date(); now.setHours(0,0,0,0)
  const tom   = new Date(now); tom.setDate(now.getDate() + 1)
  const week  = new Date(now); week.setDate(now.getDate() + 7)
  const hasDue = tasks.filter(t => t.dueDate && t.status === 'active')

  return {
    overdue:  hasDue.filter(t => new Date(t.dueDate!) < now),
    today:    hasDue.filter(t => { const d = new Date(t.dueDate!); return d.getTime() === now.getTime() }),
    tomorrow: hasDue.filter(t => { const d = new Date(t.dueDate!); return d.getTime() === tom.getTime() }),
    thisWeek: hasDue.filter(t => { const d = new Date(t.dueDate!); return d > tom && d <= week }),
    later:    hasDue.filter(t => new Date(t.dueDate!) > week),
  }
}

// ── Reminder picker ───────────────────────────────────────────────────────────

function ReminderPicker({ task, onClose }: { task: Task; onClose: () => void }) {
  const opts = [
    { label: '15 min before', mins: 15 },
    { label: '30 min before', mins: 30 },
    { label: '1 hour before', mins: 60 },
    { label: '1 day before',  mins: 1440 },
  ]
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="absolute right-0 top-10 z-50 flex flex-col gap-1 p-2 rounded-2xl shadow-xl"
      style={{ background: '#252840', border: '1px solid rgba(255,255,255,0.1)', minWidth: 160 }}
    >
      {opts.map(o => (
        <button
          key={o.mins}
          onClick={() => {
            reminders.schedule(task, o.mins)
            toast.success(`⏰ Reminder set — ${o.label}`)
            onClose()
          }}
          className="text-left px-3 py-2 rounded-xl text-sm transition-all min-h-[40px]"
          style={{ color: '#E8E8F0' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(123,114,255,0.15)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          {o.label}
        </button>
      ))}
      <button
        onClick={onClose}
        className="text-xs px-3 py-1.5 rounded-xl text-center"
        style={{ color: '#8B8BA7' }}
      >
        Cancel
      </button>
    </motion.div>
  )
}

// ── TaskRow (compact card for calendar list) ──────────────────────────────────

function CalTaskRow({ task }: { task: Task }) {
  const [showReminderPicker, setShowReminderPicker] = useState(false)
  const hasReminder = reminders.has(task.id)
  const { label, color } = getDueDateLabel(task.dueDate!, task.dueTime)

  return (
    <div
      className="flex items-center gap-3 px-3 py-3 rounded-xl relative"
      style={{ background: '#252840', border: '1px solid rgba(255,255,255,0.04)' }}
    >
      <div
        className="w-1 self-stretch rounded-full shrink-0"
        style={{ background: color }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: '#E8E8F0' }}>{task.title}</p>
        <p className="text-xs mt-0.5" style={{ color }}>
          {label} · ~{task.estimatedMinutes}m
        </p>
      </div>
      <div className="flex gap-1 shrink-0">
        {/* Bell / reminder button */}
        <button
          onClick={() => setShowReminderPicker(v => !v)}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
          style={{
            background: hasReminder ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.06)',
            color: hasReminder ? '#F59E0B' : '#8B8BA7',
          }}
          title={hasReminder ? 'Reminder set' : 'Set reminder'}
          aria-label="Set reminder"
        >
          {hasReminder ? '🔔' : '🔕'}
        </button>
        {/* Export to calendar */}
        <button
          onClick={() => downloadICS(task)}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
          style={{ background: 'rgba(255,255,255,0.06)', color: '#8B8BA7' }}
          title="Export to calendar"
          aria-label="Export to calendar"
        >
          📅
        </button>
      </div>

      {/* Reminder picker popover */}
      <AnimatePresence>
        {showReminderPicker && (
          <ReminderPicker task={task} onClose={() => setShowReminderPicker(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ title, color, count }: { title: string; color: string; count: number }) {
  if (count === 0) return null
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="text-xs font-semibold tracking-wide uppercase" style={{ color }}>
        {title}
      </span>
      <span
        className="text-xs px-1.5 py-0.5 rounded-md font-medium"
        style={{ background: `${color}20`, color }}
      >
        {count}
      </span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CalendarScreen() {
  const { nowPool, nextPool, somedayPool } = useStore()
  const { shouldAnimate, t } = useMotion()

  const allTasks = useMemo(
    () => [...nowPool, ...nextPool, ...somedayPool],
    [nowPool, nextPool, somedayPool]
  )

  const [view, setView]               = useState<'month' | 'list'>('month')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const today = new Date()
  const [displayYear, setDisplayYear]   = useState(today.getFullYear())
  const [displayMonth, setDisplayMonth] = useState(today.getMonth())

  const todayStr = isoDate(today.getFullYear(), today.getMonth(), today.getDate())

  // ── Month grid data ───────────────────────────────────────────────────────

  const daysInMonth  = getDaysInMonth(displayYear, displayMonth)
  const firstDayOfWk = getFirstDayOfMonth(displayYear, displayMonth)  // 0=Sun

  // Tasks with due dates in this month
  const monthPrefix = `${displayYear}-${String(displayMonth + 1).padStart(2, '0')}`
  const tasksThisMonth = useMemo(
    () => allTasks.filter(t => t.dueDate?.startsWith(monthPrefix) && t.status === 'active'),
    [allTasks, monthPrefix]
  )
  const datesWithTasks = new Set(tasksThisMonth.map(t => t.dueDate!))

  const selectedTasks = selectedDate ? getTasksForDate(allTasks, selectedDate) : []

  // ── List view data ────────────────────────────────────────────────────────

  const grouped = useMemo(() => groupTasksByDueDate(allTasks), [allTasks])
  const hasDueTasks = allTasks.some(t => t.dueDate && t.status === 'active')

  const prevMonth = () => {
    if (displayMonth === 0) { setDisplayYear(y => y - 1); setDisplayMonth(11) }
    else setDisplayMonth(m => m - 1)
    setSelectedDate(null)
  }
  const nextMonth = () => {
    if (displayMonth === 11) { setDisplayYear(y => y + 1); setDisplayMonth(0) }
    else setDisplayMonth(m => m + 1)
    setSelectedDate(null)
  }

  const MONTH_NAMES = ['January','February','March','April','May','June',
    'July','August','September','October','November','December']
  const DAY_LABELS = ['Su','Mo','Tu','We','Th','Fr','Sa']

  return (
    <div className="flex flex-col pb-[calc(112px+env(safe-area-inset-bottom))]">
      {/* Header */}
      <div className="px-5 pt-10 pb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: '#E8E8F0' }}>Calendar</h1>
        <div
          className="flex rounded-xl overflow-hidden"
          style={{ border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <button
            onClick={() => setView('month')}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium min-h-[36px]"
            style={{
              background: view === 'month' ? '#7B72FF' : 'transparent',
              color: view === 'month' ? '#fff' : '#8B8BA7',
            }}
          >
            <CalendarDays size={14} />
            Month
          </button>
          <button
            onClick={() => setView('list')}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium min-h-[36px]"
            style={{
              background: view === 'list' ? '#7B72FF' : 'transparent',
              color: view === 'list' ? '#fff' : '#8B8BA7',
            }}
          >
            <List size={14} />
            List
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {view === 'month' ? (
          <motion.div
            key="month"
            initial={shouldAnimate ? { opacity: 0, x: -20 } : {}}
            animate={{ opacity: 1, x: 0 }}
            exit={shouldAnimate ? { opacity: 0, x: 20 } : {}}
            transition={t()}
            className="px-5"
          >
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={prevMonth}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-medium"
                style={{ background: '#252840', color: '#8B8BA7' }}
                aria-label="Previous month"
              >
                ‹
              </button>
              <span className="text-base font-semibold" style={{ color: '#E8E8F0' }}>
                {MONTH_NAMES[displayMonth]} {displayYear}
              </span>
              <button
                onClick={nextMonth}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-medium"
                style={{ background: '#252840', color: '#8B8BA7' }}
                aria-label="Next month"
              >
                ›
              </button>
            </div>

            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 mb-1">
              {DAY_LABELS.map(d => (
                <div key={d} className="text-center text-xs py-1 font-medium" style={{ color: '#8B8BA7' }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-y-1">
              {/* Empty cells before month start */}
              {Array.from({ length: firstDayOfWk }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}

              {/* Day cells */}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day     = i + 1
                const dateStr = isoDate(displayYear, displayMonth, day)
                const isToday = dateStr === todayStr
                const hasTasks = datesWithTasks.has(dateStr)
                const isSelected = dateStr === selectedDate

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                    className="relative flex flex-col items-center py-1.5 rounded-xl transition-all duration-150 min-h-[44px]"
                    style={{
                      background: isSelected
                        ? 'rgba(123,114,255,0.25)'
                        : isToday
                          ? 'rgba(123,114,255,0.12)'
                          : 'transparent',
                    }}
                  >
                    <span
                      className="text-sm font-medium leading-none"
                      style={{
                        color: isToday ? '#7B72FF' : isSelected ? '#C8C0FF' : '#E8E8F0',
                        fontWeight: isToday ? 700 : 400,
                      }}
                    >
                      {day}
                    </span>
                    {hasTasks && (
                      <span
                        className="w-1.5 h-1.5 rounded-full mt-1"
                        style={{ background: isSelected ? '#C8C0FF' : '#7B72FF' }}
                      />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Selected day tasks panel */}
            <AnimatePresence>
              {selectedDate && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={t()}
                  className="mt-4 flex flex-col gap-2"
                >
                  <p className="text-sm font-semibold" style={{ color: '#E8E8F0' }}>
                    {selectedDate === todayStr ? 'Today' : selectedDate}
                    <span className="ml-2 text-xs font-normal" style={{ color: '#8B8BA7' }}>
                      {selectedTasks.length} task{selectedTasks.length !== 1 ? 's' : ''}
                    </span>
                  </p>
                  {selectedTasks.length === 0 ? (
                    <p className="text-sm py-4 text-center" style={{ color: '#8B8BA7' }}>
                      Nothing scheduled — a free day 🌿
                    </p>
                  ) : (
                    selectedTasks.map(task => <CalTaskRow key={task.id} task={task} />)
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          // ── List view ──────────────────────────────────────────────────────
          <motion.div
            key="list"
            initial={shouldAnimate ? { opacity: 0, x: 20 } : {}}
            animate={{ opacity: 1, x: 0 }}
            exit={shouldAnimate ? { opacity: 0, x: -20 } : {}}
            transition={t()}
            className="px-5 flex flex-col gap-5"
          >
            {!hasDueTasks && (
              <div className="py-12 flex flex-col items-center gap-3">
                <p className="text-4xl">📅</p>
                <p className="text-base font-medium text-center" style={{ color: '#E8E8F0' }}>
                  No scheduled tasks yet
                </p>
                <p className="text-sm text-center" style={{ color: '#8B8BA7' }}>
                  Add a due date when creating a task to see it here
                </p>
              </div>
            )}

            {/* Overdue — warm amber, non-shaming */}
            {grouped.overdue.length > 0 && (
              <div>
                <SectionHeader title="Ready to reschedule?" color="#F59E0B" count={grouped.overdue.length} />
                <p className="text-xs mb-3" style={{ color: '#8B8BA7' }}>
                  These were parked safely while you were away 🗃️
                </p>
                <div className="flex flex-col gap-2">
                  {grouped.overdue.map(t => <CalTaskRow key={t.id} task={t} />)}
                </div>
              </div>
            )}

            {grouped.today.length > 0 && (
              <div>
                <SectionHeader title="Today" color="#7B72FF" count={grouped.today.length} />
                <div className="flex flex-col gap-2">
                  {grouped.today.map(t => <CalTaskRow key={t.id} task={t} />)}
                </div>
              </div>
            )}

            {grouped.tomorrow.length > 0 && (
              <div>
                <SectionHeader title="Tomorrow" color="#4ECDC4" count={grouped.tomorrow.length} />
                <div className="flex flex-col gap-2">
                  {grouped.tomorrow.map(t => <CalTaskRow key={t.id} task={t} />)}
                </div>
              </div>
            )}

            {grouped.thisWeek.length > 0 && (
              <div>
                <SectionHeader title="This Week" color="#E8E8F0" count={grouped.thisWeek.length} />
                <div className="flex flex-col gap-2">
                  {grouped.thisWeek.map(t => <CalTaskRow key={t.id} task={t} />)}
                </div>
              </div>
            )}

            {grouped.later.length > 0 && (
              <div>
                <SectionHeader title="Later" color="#8B8BA7" count={grouped.later.length} />
                <div className="flex flex-col gap-2">
                  {grouped.later.map(t => <CalTaskRow key={t.id} task={t} />)}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
