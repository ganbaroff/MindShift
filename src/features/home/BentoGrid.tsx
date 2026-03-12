/**
 * BentoGrid — drag-to-reorder widget layout for HomeScreen.
 *
 * Architecture (per Research #1 recommendations):
 * - dnd-kit/sortable: headless, best mobile touch support, excellent a11y
 * - TouchSensor with 8px tolerance: prevents accidental drags on scroll
 * - PointerSensor: desktop drag support
 * - Framer Motion layout animation on widget reorder
 * - Widget visibility toggle via long-press-style settings panel
 *
 * Cognitive load: max 3–5 visible widgets (ADHD research optimal threshold).
 */

import React, { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion, AnimatePresence } from 'motion/react'
import { toast } from 'sonner'
import { Settings2, EyeOff, Eye, GripVertical } from 'lucide-react'
import { useMotion } from '@/shared/hooks/useMotion'
import { WIDGET_REGISTRY, WIDGET_LABELS, WIDGET_ICONS } from './widgets'
import type { WidgetConfig, WidgetType } from '@/types'

// ── Fallback card (if widget type deprecated) ─────────────────────────────────

function FallbackWidget({ type }: { type: WidgetType }) {
  return (
    <div className="py-4 text-center" style={{ color: '#8B8BA7' }}>
      <span className="text-xs">Widget "{type}" not found</span>
    </div>
  )
}

// ── Single sortable widget card ────────────────────────────────────────────────

interface SortableCardProps {
  config: WidgetConfig
  editMode: boolean
  onToggleVisible: (id: string) => void
}

function SortableCard({ config, editMode, onToggleVisible }: SortableCardProps) {
  const { shouldAnimate } = useMotion()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: config.id })

  const Component = WIDGET_REGISTRY[config.type] ?? (() => <FallbackWidget type={config.type} />)

  const cardStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition ?? undefined,
    background: '#1E2136',
    border: isDragging ? '1.5px solid #7B72FF' : '1px solid rgba(255,255,255,0.06)',
    boxShadow: isDragging ? '0 8px 32px rgba(123,114,255,0.25)' : 'none',
  }

  return (
    <motion.div
      ref={setNodeRef}
      style={cardStyle}
      layout={!!shouldAnimate}
      initial={!shouldAnimate ? {} : { opacity: 0, y: 12 }}
      animate={{
        opacity: config.visible ? 1 : 0.45,
        y: 0,
        scale: isDragging ? 1.02 : 1,
      }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="relative rounded-2xl overflow-hidden"
    >
      {/* Card header — grip always visible, visibility toggle in edit mode */}
      <div
        className="flex items-center justify-between px-3 pt-2 pb-0"
        style={editMode ? { borderBottom: '1px solid rgba(255,255,255,0.06)' } : undefined}
      >
        {/* Grip handle — always draggable, listeners always attached */}
        <div
          {...attributes}
          {...listeners}
          className="flex items-center gap-1.5 cursor-grab active:cursor-grabbing py-1.5 pr-3"
          aria-label={`Drag to reorder ${WIDGET_LABELS[config.type]}`}
          style={{ touchAction: 'none' }}
        >
          <GripVertical
            size={editMode ? 14 : 12}
            style={{ color: editMode ? '#8B8BA7' : 'rgba(139,139,167,0.35)' }}
          />
          {editMode && (
            <span className="text-xs" style={{ color: '#8B8BA7' }}>
              {WIDGET_ICONS[config.type]} {WIDGET_LABELS[config.type]}
            </span>
          )}
        </div>

        {/* Toggle visibility — only in edit mode */}
        {editMode && (
          <button
            onClick={() => onToggleVisible(config.id)}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg"
            aria-label={config.visible ? 'Hide widget' : 'Show widget'}
          >
            {config.visible
              ? <Eye size={14} style={{ color: '#7B72FF' }} />
              : <EyeOff size={14} style={{ color: '#8B8BA7' }} />
            }
          </button>
        )}
      </div>

      {/* Widget content */}
      <div className={editMode ? 'px-5 pb-5 pt-2 pointer-events-none' : 'p-5 pt-2'}>
        <Component />
      </div>
    </motion.div>
  )
}

// ── BentoGrid ─────────────────────────────────────────────────────────────────

interface BentoGridProps {
  widgets: WidgetConfig[]
  onReorder: (newWidgets: WidgetConfig[]) => void
}

export function BentoGrid({ widgets, onReorder }: BentoGridProps) {
  const [editMode, setEditMode] = useState(false)

  // dnd-kit sensors:
  // - TouchSensor: 8px movement tolerance prevents accidental drags on scroll
  // - PointerSensor: desktop mouse drag
  // - KeyboardSensor: accessibility keyboard reorder
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = widgets.findIndex(w => w.id === active.id)
    const newIndex = widgets.findIndex(w => w.id === over.id)
    onReorder(arrayMove(widgets, oldIndex, newIndex))
  }

  const handleToggleVisible = (id: string) => {
    const updated = widgets.map(w => w.id === id ? { ...w, visible: !w.visible } : w)
    // Enforce minimum 2 visible widgets (ADHD: too few = no structure)
    const visibleCount = updated.filter(w => w.visible).length
    if (visibleCount < 2) {
      toast('Home screen needs at least 2 widgets')
      return
    }
    onReorder(updated)
  }

  // Only render visible widgets in normal mode; all widgets in edit mode
  const renderedWidgets = editMode ? widgets : widgets.filter(w => w.visible)
  const ids = renderedWidgets.map(w => w.id)

  return (
    <div className="flex flex-col gap-4">
      {/* Edit mode toggle */}
      <div className="flex items-center justify-end px-5">
        <button
          onClick={() => setEditMode(v => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all duration-200"
          style={{
            background: editMode ? 'rgba(123,114,255,0.15)' : 'transparent',
            border: `1px solid ${editMode ? '#7B72FF' : 'rgba(255,255,255,0.06)'}`,
            color: editMode ? '#7B72FF' : '#8B8BA7',
          }}
        >
          <Settings2 size={11} />
          {editMode ? 'Done' : 'Arrange'}
        </button>
      </div>

      {/* Sortable grid */}
      <div className="px-5 flex flex-col gap-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <AnimatePresence mode="popLayout">
              {renderedWidgets.map(config => (
                <SortableCard
                  key={config.id}
                  config={config}
                  editMode={editMode}
                  onToggleVisible={handleToggleVisible}
                />
              ))}
            </AnimatePresence>
          </SortableContext>
        </DndContext>

        {/* Edit mode hint */}
        <AnimatePresence>
          {editMode && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-xs text-center py-2"
              style={{ color: '#8B8BA7' }}
            >
              Drag to reorder · Eye icon to show/hide · Min 2 widgets
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
