import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'
import { useStore } from '@/store'
import { supabase } from '@/shared/lib/supabase'
import type { Task } from '@/types'
import { NOW_POOL_MAX } from '@/shared/lib/constants'

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onClose: () => void
}

const PRESET_DURATIONS = [5, 15, 25, 45, 60]

export function AddTaskModal({ open, onClose }: Props) {
  const { addTask, nowPool, nextPool, userId } = useStore()
  const reducedMotion = useReducedMotion()

  const [title, setTitle] = useState('')
  const [difficulty, setDifficulty] = useState<1 | 2 | 3>(2)
  const [minutes, setMinutes] = useState(25)
  const [customMinutes, setCustomMinutes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const nowFull = nowPool.filter(t => t.status === 'active').length >= NOW_POOL_MAX

  const handleSubmit = async () => {
    const trimmed = title.trim()
    if (!trimmed || isSubmitting) return
    setIsSubmitting(true)

    const pool = nowFull ? 'next' : 'now'

    const newTask: Task = {
      id: crypto.randomUUID(),
      title: trimmed,
      pool,
      status: 'active',
      difficulty,
      estimatedMinutes: minutes,
      createdAt: new Date().toISOString(),
      completedAt: null,
      snoozeCount: 0,
      parentTaskId: null,
      position: pool === 'now' ? nowPool.length : nextPool.length,
    }

    addTask(newTask)

    // Persist to Supabase
    if (userId) {
      try {
        await supabase.from('tasks').insert({
          id: newTask.id,
          user_id: userId,
          title: newTask.title,
          pool: newTask.pool,
          status: newTask.status,
          difficulty: newTask.difficulty,
          estimated_minutes: newTask.estimatedMinutes,
          parent_task_id: null,
          position: newTask.position,
        } as never)
      } catch {
        // Local store already updated — Supabase failure is non-blocking
      }
    }

    setTitle('')
    setDifficulty(2)
    setMinutes(25)
    setCustomMinutes('')
    setIsSubmitting(false)
    onClose()
  }

  const handleClose = () => {
    setTitle('')
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0, 0, 0, 0.6)' }}
          />

          {/* Sheet */}
          <motion.div
            key="sheet"
            initial={reducedMotion ? { opacity: 0 } : { y: '100%' }}
            animate={reducedMotion ? { opacity: 1 } : { y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 flex flex-col gap-5 px-5 pt-5 pb-10 rounded-t-3xl"
            style={{ background: '#1A1D2E', border: '1px solid #2D3150' }}
          >
            {/* Handle + header */}
            <div className="flex items-center justify-between">
              <div
                className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full"
                style={{ background: '#2D3150' }}
              />
              <h2 className="text-lg font-bold" style={{ color: '#E8E8F0' }}>
                Add task
              </h2>
              <button
                onClick={handleClose}
                className="p-2 rounded-xl transition-colors duration-200"
                style={{ color: '#8B8BA7' }}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Title input */}
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void handleSubmit() }}
              placeholder="What needs to be done?"
              autoFocus
              className="w-full rounded-2xl px-4 py-3 text-base outline-none"
              style={{
                background: '#252840',
                border: '1.5px solid #2D3150',
                color: '#E8E8F0',
                caretColor: '#6C63FF',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#6C63FF' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#2D3150' }}
            />

            {/* Difficulty */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium tracking-wide uppercase" style={{ color: '#8B8BA7' }}>
                Difficulty
              </label>
              <div className="flex gap-2">
                {([1, 2, 3] as const).map(d => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className="flex-1 py-2 rounded-xl text-sm font-medium transition-all duration-200"
                    style={{
                      background: difficulty === d ? 'rgba(108, 99, 255, 0.18)' : '#252840',
                      border: `1.5px solid ${difficulty === d ? '#6C63FF' : '#2D3150'}`,
                      color: difficulty === d ? '#6C63FF' : '#8B8BA7',
                    }}
                  >
                    {d === 1 ? '🟢 Easy' : d === 2 ? '🟡 Medium' : '🔴 Hard'}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium tracking-wide uppercase" style={{ color: '#8B8BA7' }}>
                Estimated time
              </label>
              <div className="flex gap-2 flex-wrap">
                {PRESET_DURATIONS.map(d => (
                  <button
                    key={d}
                    onClick={() => { setMinutes(d); setCustomMinutes('') }}
                    className="px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200"
                    style={{
                      background: minutes === d && !customMinutes ? 'rgba(108, 99, 255, 0.18)' : '#252840',
                      border: `1.5px solid ${minutes === d && !customMinutes ? '#6C63FF' : '#2D3150'}`,
                      color: minutes === d && !customMinutes ? '#6C63FF' : '#8B8BA7',
                    }}
                  >
                    {d}m
                  </button>
                ))}
                <input
                  type="number"
                  placeholder="Custom"
                  min={1}
                  max={480}
                  value={customMinutes}
                  onChange={(e) => {
                    setCustomMinutes(e.target.value)
                    const v = parseInt(e.target.value, 10)
                    if (!isNaN(v) && v > 0) setMinutes(v)
                  }}
                  className="w-20 px-3 py-2 rounded-xl text-sm outline-none"
                  style={{
                    background: customMinutes ? 'rgba(108, 99, 255, 0.18)' : '#252840',
                    border: `1.5px solid ${customMinutes ? '#6C63FF' : '#2D3150'}`,
                    color: '#E8E8F0',
                  }}
                />
              </div>
            </div>

            {/* Pool hint when NOW is full */}
            {nowFull && (
              <p className="text-xs" style={{ color: '#8B8BA7' }}>
                ℹ️ NOW pool is full (3/3) — task will go to NEXT
              </p>
            )}

            {/* Submit */}
            <button
              onClick={() => void handleSubmit()}
              disabled={!title.trim() || isSubmitting}
              className="w-full py-4 rounded-2xl font-semibold text-base transition-all duration-200"
              style={{
                background: title.trim() ? '#6C63FF' : '#2D3150',
                color: title.trim() ? '#FFFFFF' : '#8B8BA7',
                cursor: title.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              {isSubmitting ? 'Adding...' : nowFull ? 'Add to Next →' : 'Add to Now →'}
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
