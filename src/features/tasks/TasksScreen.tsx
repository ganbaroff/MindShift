import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '@/store'
import { TaskCard } from './TaskCard'
import { AddTaskModal } from './AddTaskModal'
import { Plus } from 'lucide-react'
import { NOW_POOL_MAX } from '@/shared/lib/constants'

// ── Tasks screen — all pools visible ─────────────────────────────────────────

export default function TasksScreen() {
  const { nowPool, nextPool, somedayPool } = useStore()
  const [addOpen, setAddOpen] = useState(false)
  const [somedayExpanded, setSomedayExpanded] = useState(false)

  const activeTasks = nowPool.filter(t => t.status === 'active')
  const nextTasks = nextPool.filter(t => t.status === 'active')
  const somedayTasks = somedayPool.filter(t => t.status === 'active')

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
      <section className="px-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-medium tracking-widest uppercase" style={{ color: '#6C63FF' }}>
            Now
          </h2>
          <span className="text-xs" style={{ color: '#8B8BA7' }}>
            {activeTasks.length}/{NOW_POOL_MAX}
          </span>
        </div>
        <div className="flex flex-col gap-3">
          {activeTasks.length === 0 ? (
            <p className="text-sm py-4 text-center" style={{ color: '#8B8BA7' }}>
              Now pool is empty — add a task!
            </p>
          ) : (
            activeTasks.map((task, i) => <TaskCard key={task.id} task={task} index={i} />)
          )}
        </div>
      </section>

      {/* NEXT Pool */}
      <section className="px-5 mb-6">
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
              Next pool is empty
            </p>
          ) : (
            nextTasks.map((task, i) => <TaskCard key={task.id} task={task} index={i} />)
          )}
        </div>
      </section>

      {/* SOMEDAY Pool */}
      <section className="px-5">
        <button
          onClick={() => setSomedayExpanded(v => !v)}
          className="flex items-center justify-between w-full mb-3"
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
                  Someday pool is empty
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
        style={{ background: '#6C63FF' }}
        aria-label="Add task"
      >
        <Plus size={20} color="white" />
        <span className="text-sm font-semibold text-white">Add task</span>
      </motion.button>

      <AddTaskModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  )
}
