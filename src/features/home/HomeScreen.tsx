import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useReducedMotion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { useStore } from '@/store'
import { EnergyCheckin } from './EnergyCheckin'
import { TaskCard } from '@/features/tasks/TaskCard'
import { AddTaskModal } from '@/features/tasks/AddTaskModal'
import type { EnergyLevel } from '@/types'
import { NOW_POOL_MAX } from '@/shared/lib/constants'

// ── Component ─────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const {
    nowPool, nextPool, energyLevel, setEnergyLevel,
    cognitiveMode, appMode,
  } = useStore()
  const reducedMotion = useReducedMotion()

  const [energySet, setEnergySet] = useState(false)
  const [nextExpanded, setNextExpanded] = useState(false)
  const [addOpen, setAddOpen] = useState(false)

  // Active tasks only
  const activeTasks = nowPool.filter(t => t.status === 'active')
  const nextTasks   = nextPool.filter(t => t.status === 'active')

  // Focused mode: show one task at a time; system mode: all
  const visibleNow = cognitiveMode === 'focused' ? activeTasks.slice(0, 1) : activeTasks.slice(0, NOW_POOL_MAX)

  const handleEnergySelect = (level: EnergyLevel) => {
    setEnergyLevel(level)
    setEnergySet(true)
  }

  // Greeting based on time of day
  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? 'Good morning ☀️' :
    hour < 17 ? 'Good afternoon 🌤️' :
    '  Good evening 🌙'

  return (
    <div className="flex flex-col min-h-full pb-28">
      {/* Header */}
      <div className="px-5 pt-10 pb-4">
        <motion.h1
          initial={reducedMotion ? {} : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold mb-0.5"
          style={{ color: '#E8E8F0' }}
        >
          {greeting}
        </motion.h1>
        <motion.p
          initial={reducedMotion ? {} : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-sm"
          style={{ color: '#8B8BA7' }}
        >
          {appMode === 'minimal'
            ? 'One task at a time. What matters most?'
            : appMode === 'habit'
            ? "Let's build your routine, one step at a time."
            : 'Full system view — your pools are ready.'}
        </motion.p>
      </div>

      {/* Energy Check-in */}
      <motion.div
        initial={reducedMotion ? {} : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mx-5 mb-5 p-4 rounded-2xl"
        style={{ background: '#1A1D2E', border: '1.5px solid #2D3150' }}
      >
        <p className="text-xs font-medium tracking-widest uppercase mb-3" style={{ color: '#6C63FF' }}>
          {energySet ? '⚡ Energy today' : "How's your brain right now?"}
        </p>
        <EnergyCheckin
          onSelect={handleEnergySelect}
          selected={energyLevel}
          compact={energySet}
        />
      </motion.div>

      {/* NOW Pool */}
      <div className="px-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-medium tracking-widest uppercase" style={{ color: '#8B8BA7' }}>
            Now
          </h2>
          <span className="text-xs" style={{ color: '#6C63FF' }}>
            {activeTasks.length}/{NOW_POOL_MAX}
          </span>
        </div>

        <AnimatePresence mode="popLayout">
          {visibleNow.length === 0 ? (
            <motion.div
              key="empty-now"
              initial={reducedMotion ? {} : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-8 text-center rounded-2xl"
              style={{ background: '#1A1D2E', border: '1.5px dashed #2D3150' }}
            >
              <p className="text-2xl mb-2">🎉</p>
              <p className="text-sm font-medium" style={{ color: '#E8E8F0' }}>
                NOW pool is clear!
              </p>
              <p className="text-xs mt-1" style={{ color: '#8B8BA7' }}>
                Add a task or pull one from Next
              </p>
            </motion.div>
          ) : (
            visibleNow.map((task, i) => (
              <TaskCard key={task.id} task={task} index={i} />
            ))
          )}
        </AnimatePresence>

        {/* Show more indicator for focused mode */}
        {cognitiveMode === 'focused' && activeTasks.length > 1 && (
          <p className="text-xs text-center" style={{ color: '#8B8BA7' }}>
            +{activeTasks.length - 1} more in queue
          </p>
        )}
      </div>

      {/* NEXT Pool (collapsible) */}
      {nextTasks.length > 0 && (
        <div className="px-5 mt-6 flex flex-col gap-2">
          <button
            onClick={() => setNextExpanded(v => !v)}
            className="flex items-center justify-between py-2"
            aria-expanded={nextExpanded}
          >
            <h2 className="text-xs font-medium tracking-widest uppercase" style={{ color: '#8B8BA7' }}>
              Next
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: '#8B8BA7' }}>
                {nextTasks.length} task{nextTasks.length !== 1 ? 's' : ''}
              </span>
              <motion.span
                animate={{ rotate: nextExpanded ? 180 : 0 }}
                style={{ color: '#8B8BA7', display: 'inline-block' }}
              >
                ▾
              </motion.span>
            </div>
          </button>

          <AnimatePresence>
            {nextExpanded && (
              <motion.div
                initial={reducedMotion ? {} : { height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={reducedMotion ? {} : { height: 0, opacity: 0 }}
                className="flex flex-col gap-3 overflow-hidden"
              >
                {nextTasks.map((task, i) => (
                  <TaskCard key={task.id} task={task} index={i} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Add Task FAB */}
      <motion.button
        initial={reducedMotion ? {} : { scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3 }}
        whileTap={reducedMotion ? {} : { scale: 0.94 }}
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
