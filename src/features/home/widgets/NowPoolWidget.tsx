/**
 * NowPoolWidget — compact NOW pool within the bento grid.
 * Shows tasks + inline Add button. No NEXT pool here (separate widget later).
 */
import { motion, AnimatePresence } from 'motion/react'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useStore } from '@/store'
import { TaskCard } from '@/features/tasks/TaskCard'
import { AddTaskModal } from '@/features/tasks/AddTaskModal'
import { NOW_POOL_MAX, APP_MODE_CONFIG } from '@/shared/lib/constants'

export function NowPoolWidget() {
  const { nowPool, appMode } = useStore()
  const [addOpen, setAddOpen] = useState(false)

  const activeTasks = nowPool.filter(t => t.status === 'active')
  const modeMax = APP_MODE_CONFIG[appMode].nowPoolMax
  // minimal mode: show 1 task at a time; habit/system: show up to mode max
  const visibleTasks = appMode === 'minimal'
    ? activeTasks.slice(0, 1)
    : activeTasks.slice(0, modeMax)

  return (
    <div className="flex flex-col gap-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium tracking-widest uppercase" style={{ color: '#8B8BA7' }}>
          Now
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: '#7B72FF' }}>
            {activeTasks.length}/{NOW_POOL_MAX}
          </span>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setAddOpen(true)}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2"
            aria-label="Add task"
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ background: '#7B72FF' }}
            >
              <Plus size={13} color="white" />
            </div>
          </motion.button>
        </div>
      </div>

      {/* Task list */}
      <AnimatePresence mode="popLayout">
        {visibleTasks.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="py-5 text-center rounded-xl"
            style={{ background: 'rgba(45,49,80,0.5)', border: '1px dashed rgba(255,255,255,0.08)' }}
          >
            <p className="text-lg mb-1">🎉</p>
            <p className="text-xs font-medium" style={{ color: '#E8E8F0' }}>Pool clear!</p>
            <p className="text-xs mt-0.5" style={{ color: '#8B8BA7' }}>Tap + to add a task</p>
          </motion.div>
        ) : (
          visibleTasks.map((task, i) => (
            <TaskCard key={task.id} task={task} index={i} />
          ))
        )}
      </AnimatePresence>

      {/* Minimal mode overflow hint */}
      {appMode === 'minimal' && activeTasks.length > 1 && (
        <p className="text-xs text-center" style={{ color: '#8B8BA7' }}>
          +{activeTasks.length - 1} more in queue — finish this first 🎯
        </p>
      )}

      <AddTaskModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  )
}
