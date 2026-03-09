import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useStore } from '@/store'
import { TaskCard } from './TaskCard'
import { AddTaskModal } from './AddTaskModal'
import { CoachMark } from '@/shared/ui/CoachMark'
import { Plus } from 'lucide-react'
import { NOW_POOL_MAX } from '@/shared/lib/constants'

// ── Tasks screen — all pools visible ─────────────────────────────────────────

export default function TasksScreen() {
  const { nowPool, nextPool, somedayPool, completedTotal } = useStore()
  const [addOpen, setAddOpen] = useState(false)
  const [somedayExpanded, setSomedayExpanded] = useState(false)

  const activeTasks = nowPool.filter(t => t.status === 'active')
  const nextTasks = nextPool.filter(t => t.status === 'active')
  const somedayTasks = somedayPool.filter(t => t.status === 'active')
  const allEmpty = activeTasks.length === 0 && nextTasks.length === 0 && somedayTasks.length === 0

  if (allEmpty) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-screen pb-28 px-8 text-center"
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
            background: 'linear-gradient(135deg, #7B72FF 0%, #5B52E8 100%)',
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
    <div className="flex flex-col pb-28">
      {/* Header */}
      <div className="px-5 pt-10 pb-4">
        <h1 className="text-2xl font-bold" style={{ color: '#E8E8F0' }}>
          All Tasks 🗂️
        </h1>
        <p className="text-sm mt-1" style={{ color: '#8B8BA7' }}>
          {activeTasks.length + nextTasks.length + somedayTasks.length} active across all pools
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
        <div className="flex flex-col gap-3">
          {activeTasks.length === 0 ? (
            <p className="text-sm py-4 text-center" style={{ color: '#8B8BA7' }}>
              Nothing here yet — what do you want to work on first?
            </p>
          ) : (
            activeTasks.map((task, i) => <TaskCard key={task.id} task={task} index={i} />)
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
            nextTasks.map((task, i) => <TaskCard key={task.id} task={task} index={i} />)
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
                somedayTasks.map((task, i) => <TaskCard key={task.id} task={task} index={i} />)
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Add Task FAB */}
      <motion.button
        whileTap={{ scale: 0.94 }}
        onClick={() => setAddOpen(true)}
        className="fixed bottom-24 right-5 flex items-center gap-2 px-5 py-3.5 rounded-full shadow-lg z-30"
        style={{ background: '#7B72FF' }}
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
