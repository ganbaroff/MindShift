/**
 * SortableTaskCard — drag-to-reorder wrapper around TaskCard
 *
 * Wraps TaskCard with dnd-kit sortable handles and exposes
 * a "move to pool" quick action row below the card.
 *
 * Extracted from TasksPage.tsx.
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import TaskCard from '@/components/TaskCard'
import type { Task } from '@/types'

interface SortableTaskCardProps {
  task: Task
  index: number
  onDone: (id: string) => void
  onPark: (id: string) => void
  onRemove?: (id: string) => void
  onMove?: (id: string, pool: Task['pool']) => void
  currentPool?: Task['pool']
}

export function SortableTaskCard({ task, index, onDone, onPark, onRemove, onMove, currentPool }: SortableTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  const [showMoveOptions, setShowMoveOptions] = useState(false)
  const { t } = useTranslation()

  const poolOptions = [
    { pool: 'now' as const,     label: t('tasks.now'),     emoji: '🎯' },
    { pool: 'next' as const,    label: t('tasks.next'),    emoji: '📋' },
    { pool: 'someday' as const, label: t('tasks.someday'), emoji: '💭' },
  ].filter(p => p.pool !== currentPool)

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 999 : 'auto',
      }}
    >
      <div {...attributes} {...listeners} className="touch-none">
        <TaskCard task={task} index={index} onDone={onDone} onPark={onPark} onRemove={onRemove} />
      </div>

      {onMove && (
        <AnimatePresence>
          {showMoveOptions ? (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden flex gap-1.5 px-2 pb-1.5"
            >
              {poolOptions.map(({ pool, label, emoji }) => (
                <button
                  key={pool}
                  onClick={() => { onMove(task.id, pool); setShowMoveOptions(false) }}
                  className="text-[10px] px-2 py-0.5 rounded-lg focus-visible:ring-1 focus-visible:ring-[#7B72FF]"
                  style={{ background: 'rgba(123,114,255,0.08)', color: 'var(--color-text-muted)' }}
                >
                  {emoji} {label}
                </button>
              ))}
              <button
                onClick={() => setShowMoveOptions(false)}
                className="text-[10px] px-1 rounded focus-visible:ring-2 focus-visible:ring-ms-primary/50 focus-visible:outline-none"
                style={{ color: 'var(--color-text-muted)' }}
                aria-label="Close move options"
              >
                ✕
              </button>
            </motion.div>
          ) : (
            <button
              onClick={() => setShowMoveOptions(true)}
              className="text-[10px] px-2 py-0.5 focus-visible:ring-1 focus-visible:ring-[#7B72FF] rounded"
              style={{ color: '#3A3B52' }}
            >
              {t('tasks.move')}
            </button>
          )}
        </AnimatePresence>
      )}
    </div>
  )
}
