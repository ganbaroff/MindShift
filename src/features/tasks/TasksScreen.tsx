import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useStore } from '@/store'
import { TaskCard } from './TaskCard'
import { AddTaskModal } from './AddTaskModal'
import { CoachMark } from '@/shared/ui/CoachMark'
import { Plus } from 'lucide-react'
import { NOW_POOL_MAX } from '@/shared/lib/constants'
import type { Task } from '@/types'

// ── Subtask grouping helpers ──────────────────────────────────────────────────

/**
 * Separates a flat task list into:
 * - `parents`: top-level tasks (parentTaskId === null), in original order
 * - `subtaskMap`: parentTaskId → subtasks (ordered by createdAt ascending)
 * - `orphans`: subtasks whose parent is NOT in the pool (shown standalone)
 */
function groupByParent(tasks: Task[]): {
  parents: Task[]
  subtaskMap: Map<string, Task[]>
  orphans: Task[]
} {
  const idSet = new Set(tasks.map(t => t.id))
  const parents: Task[] = []
  const subtaskMap = new Map<string, Task[]>()
  const orphans: Task[] = []

  for (const task of tasks) {
    if (!task.parentTaskId) {
      parents.push(task)
    } else if (idSet.has(task.parentTaskId)) {
      const arr = subtaskMap.get(task.parentTaskId) ?? []
      arr.push(task)
      subtaskMap.set(task.parentTaskId, arr)
    } else {
      orphans.push(task)  // parent completed / not in this pool
    }
  }
  return { parents, subtaskMap, orphans }
}

/** Render a parent task + its subtasks (indented) */
function TaskGroup({ task, index, subtasks }: { task: Task; index: number; subtasks: Task[] }) {
  return (
    <div>
      <TaskCard task={task} index={index} />
      {subtasks.length > 0 && (
        <div className="ml-4 mt-1.5 flex flex-col gap-1.5 pl-3"
          style={{ borderLeft: '2px solid rgba(123,114,255,0.2)' }}
        >
          {subtasks.map((sub, si) => (
            <div key={sub.id} className="relative">
              {/* connector dot */}
              <div className="absolute -left-[15px] top-[14px] w-2 h-2 rounded-full"
                style={{ background: 'rgba(123,114,255,0.35)' }}
              />
              <TaskCard task={sub} index={si} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** Render a grouped task list for a pool */
function TaskList({ tasks }: { tasks: Task[] }) {
  if (tasks.length === 0) return null
  const { parents, subtaskMap, orphans } = groupByParent(tasks)
  return (
    <>
      {parents.map((task, i) => (
        <TaskGroup
          key={task.id}
          task={task}
          index={i}
          subtasks={subtaskMap.get(task.id) ?? []}
        />
      ))}
      {orphans.map((task, i) => (
        <TaskCard key={task.id} task={task} index={parents.length + i} />
      ))}
    </>
  )
}

// ── Tasks screen — all pools visible ─────────────────────────────────────────

export default function TasksScreen() {
  const { nowPool, nextPool, somedayPool, completedTotal, energyLevel } = useStore()
  const [addOpen, setAddOpen] = useState(false)
  const [somedayExpanded, setSomedayExpanded] = useState(false)

  const activeTasks = nowPool.filter(t => t.status === 'active')
  const nextTasks = nextPool.filter(t => t.status === 'active')
  const somedayTasks = somedayPool.filter(t => t.status === 'active')
  const allEmpty = activeTasks.length === 0 && nextTasks.length === 0 && somedayTasks.length === 0

  if (allEmpty) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-screen pb-[calc(112px+env(safe-area-inset-bottom))] px-8 text-center"
        style={{ background: '#0F1117' }}
      >
        <div
          className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6"
          style={{ background: 'rgba(123,114,255,0.12)', border: '1.5px solid rgba(123,114,255,0.25)' }}
        >
          <span style={{ fontSize: 44 }}>🧠</span>
        </div>
        <h2 className="text-xl font-bold mb-2" style={{ color: '#E8E8F0' }}>
          Your mind is clear.
        </h2>
        <p className="text-sm leading-relaxed mb-8" style={{ color: '#8B8BA7' }}>
          Add your first task and let's get moving.
        </p>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2.5 px-8 py-4 rounded-2xl font-semibold text-base"
          style={{
            background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
            color: '#fff',
            boxShadow: '0 4px 24px rgba(123,114,255,0.4)',
          }}
        >
          <Plus size={22} />
          Add your first task
        </motion.button>
        <AddTaskModal open={addOpen} onClose={() => setAddOpen(false)} />
      </div>
    )
  }

  return (
    <div className="flex flex-col pb-[calc(112px+env(safe-area-inset-bottom))]">
      {/* Header */}
      <div className="px-5 pt-10 pb-4">
        <h1 className="text-2xl font-bold" style={{ color: '#E8E8F0' }}>
          Your Tasks
        </h1>
        <p className="text-sm mt-1" style={{ color: '#8B8BA7' }}>
          {(() => { const n = activeTasks.length + nextTasks.length + somedayTasks.length; return `${n} ${n === 1 ? 'task' : 'tasks'} in play` })()}
        </p>
      </div>

      {/* NOW Pool */}
      <section className="px-5 mb-6" aria-label="Now — active tasks (up to 3)"  aria-live="polite">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-medium tracking-widest uppercase" style={{ color: '#7B72FF' }}>
            Now
          </h2>
          <span className="text-xs" style={{ color: '#8B8BA7' }}>
            {activeTasks.length}/{NOW_POOL_MAX}
          </span>
        </div>
        {/* Easy-task banner (Block 6a) — shown when energy ≤ 2 and easy tasks exist in NOW */}
        {energyLevel <= 2 && activeTasks.some(t => t.difficultyLevel === 'easy') && (
          <div
            className="mb-3 px-3 py-2.5 rounded-xl flex items-center gap-2"
            style={{
              background: 'rgba(78,205,196,0.08)',
              border: '1px solid rgba(78,205,196,0.22)',
            }}
          >
            <span className="text-base">🌱</span>
            <p className="text-xs leading-relaxed" style={{ color: '#4ECDC4' }}>
              Low energy day? Start with an easy one — momentum builds from small wins.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {activeTasks.length === 0 ? (
            <p className="text-sm py-4 text-center" style={{ color: '#8B8BA7' }}>
              Nothing here yet — what do you want to work on first?
            </p>
          ) : (
            <TaskList tasks={activeTasks} />
          )}
        </div>
      </section>

      {/* NEXT Pool */}
      <section className="px-5 mb-6" aria-label="Next — upcoming tasks">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-medium tracking-widest uppercase" style={{ color: '#8B8BA7' }}>
            Next
          </h2>
          <span className="text-xs" style={{ color: '#8B8BA7' }}>
            {nextTasks.length}/6
          </span>
        </div>
        <div className="flex flex-col gap-3">
          {nextTasks.length === 0 ? (
            <p className="text-sm py-4 text-center" style={{ color: '#8B8BA7' }}>
              Queued tasks will appear here. No rush.
            </p>
          ) : (
            <TaskList tasks={nextTasks} />
          )}
        </div>
      </section>

      {/* SOMEDAY Pool */}
      <section className="px-5" aria-label="Someday — parked tasks">
        <button
          onClick={() => setSomedayExpanded(v => !v)}
          className="flex items-center justify-between w-full mb-3 min-h-[44px]"
          aria-expanded={somedayExpanded}
        >
          <h2 className="text-xs font-medium tracking-widest uppercase" style={{ color: '#8B8BA7' }}>
            Someday
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: '#8B8BA7' }}>
              {somedayTasks.length} task{somedayTasks.length !== 1 ? 's' : ''}
            </span>
            <motion.span animate={{ rotate: somedayExpanded ? 180 : 0 }} style={{ display: 'inline-block', color: '#8B8BA7' }}>
              ▾
            </motion.span>
          </div>
        </button>

        <AnimatePresence>
          {somedayExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="flex flex-col gap-3 overflow-hidden"
            >
              {somedayTasks.length === 0 ? (
                <p className="text-sm py-4 text-center" style={{ color: '#8B8BA7' }}>
                  Ideas parked here will wait patiently until you're ready.
                </p>
              ) : (
                <TaskList tasks={somedayTasks} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Add Task FAB */}
      <motion.button
        whileTap={{ scale: 0.94 }}
        onClick={() => setAddOpen(true)}
        className="fixed bottom-24 flex items-center gap-2 px-5 py-3.5 rounded-full shadow-lg z-30"
        style={{ background: '#7B72FF', right: 'calc(max(0px, (100vw - 480px) / 2) + 20px)' }}
        aria-label="Add task"
      >
        <Plus size={20} color="white" />
        <span className="text-sm font-semibold text-white">Add task</span>
      </motion.button>

      <AddTaskModal open={addOpen} onClose={() => setAddOpen(false)} />

      {/* Progressive disclosure: Focus Mode hint after first task completion */}
      {completedTotal >= 1 && (
        <CoachMark
          hintId="focus_mode_hint"
          emoji="⏱️"
          message="Tap Focus for a distraction-free session — it's designed for exactly this."
        />
      )}
    </div>
  )
}
