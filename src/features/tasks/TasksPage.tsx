import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMotion } from '@/shared/hooks/useMotion';
import { todayISO } from '@/shared/lib/dateUtils';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import TaskCard from '@/components/TaskCard';
import Fab from '@/components/Fab';
import AddTaskModal from '@/components/AddTaskModal';
import { useStore } from '@/store';
import { DIFFICULTY_MAP } from '@/types';
import type { Task } from '@/types';
import { getNowPoolMax } from '@/shared/lib/constants';
import { PageTransition } from '@/shared/ui/PageTransition';

export default function TasksPage() {
  const navigate = useNavigate();
  const { shouldAnimate } = useMotion();
  const todayIso = todayISO();
  const [showAddTask, setShowAddTask] = useState(false);
  const [showSomeday, setShowSomeday] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { nowPool, nextPool, somedayPool, completeTask, snoozeTask, reorderPool, appMode, seasonalMode } = useStore();

  // dnd-kit sensors — pointer for desktop, touch for mobile
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 8 } }),
  )

  const handleDragEnd = useCallback((event: DragEndEvent, pool: Task['pool'], tasks: Task[]) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = tasks.findIndex(t => t.id === active.id)
    const newIdx = tasks.findIndex(t => t.id === over.id)
    if (oldIdx === -1 || newIdx === -1) return
    reorderPool(pool, arrayMove(tasks, oldIdx, newIdx))
  }, [reorderPool])

  const q = searchQuery.toLowerCase().trim();
  const nowTasks = useMemo(() => nowPool.filter(t => t.status === 'active' && (!q || t.title.toLowerCase().includes(q))), [nowPool, q]);
  const nextTasks = useMemo(() => nextPool.filter(t => t.status === 'active' && (!q || t.title.toLowerCase().includes(q))), [nextPool, q]);
  const somedayTasks = useMemo(() => somedayPool.filter(t => t.status === 'active' && (!q || t.title.toLowerCase().includes(q))), [somedayPool, q]);
  const doneTasks = useMemo(() =>
    [...nowPool, ...nextPool, ...somedayPool]
      .filter(t => t.status === 'completed' && t.completedAt)
      .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime()),
    [nowPool, nextPool, somedayPool]
  );

  const nowMax = getNowPoolMax(appMode, seasonalMode);

  // Past-date task detection — tasks with a past due date still active
  const pastDateTasks = useMemo(() =>
    [...nowPool, ...nextPool].filter(
      t => t.status === 'active' && t.dueDate && t.dueDate < todayIso
    ),
    [nowPool, nextPool, todayIso]
  );

  return (
    <PageTransition>
    <div className="min-h-screen px-5 pb-36 pt-10" style={{ backgroundColor: '#0F1120' }}>
      <motion.div initial={shouldAnimate ? { opacity: 0, y: -8 } : false} animate={shouldAnimate ? { opacity: 1, y: 0 } : false}>
        <h1 className="text-[24px] font-bold" style={{ color: '#E8E8F0' }}>Your Tasks</h1>
        <p className="text-[13px] mt-0.5" style={{ color: '#8B8BA7' }}>{nowTasks.length + nextTasks.length} tasks in play</p>
      </motion.div>

      {/* Search bar */}
      <motion.div
        initial={shouldAnimate ? { opacity: 0, y: 4 } : false}
        animate={shouldAnimate ? { opacity: 1, y: 0 } : false}
        className="mt-3 flex items-center gap-2 px-3 rounded-2xl h-10"
        style={{ backgroundColor: '#1E2136', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <Search size={14} style={{ color: '#8B8BA7', flexShrink: 0 }} />
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search tasks…"
          className="flex-1 bg-transparent text-[13px] outline-none"
          style={{ color: '#E8E8F0' }}
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} aria-label="Clear search">
            <X size={13} style={{ color: '#8B8BA7' }} />
          </button>
        )}
      </motion.div>

      <div className="space-y-5 mt-5">

        {/* Auto-reschedule banner — gentle, non-shaming */}
        <AnimatePresence>
          {pastDateTasks.length > 0 && (
            <motion.button
              initial={shouldAnimate ? { opacity: 0, y: -8 } : false}
              animate={shouldAnimate ? { opacity: 1, y: 0 } : false}
              exit={shouldAnimate ? { opacity: 0, y: -8 } : undefined}
              onClick={() => navigate('/calendar')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left"
              style={{
                background: 'rgba(245,158,11,0.07)',
                border: '1px solid rgba(245,158,11,0.20)',
              }}
            >
              <span className="text-base">🗓️</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: '#F59E0B' }}>
                  {pastDateTasks.length} task{pastDateTasks.length !== 1 ? 's' : ''} past their due date
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#8B8BA7' }}>
                  No pressure — tap to set new dates when you're ready
                </p>
              </div>
              <span className="text-xs" style={{ color: '#F59E0B' }}>Reschedule →</span>
            </motion.button>
          )}
        </AnimatePresence>

        {/* NOW */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: '#7B72FF' }}>NOW</span>
            <span className="text-[11px]" style={{ color: '#8B8BA7' }}>{nowTasks.length}/{nowMax}</span>
            {nowTasks.length > 1 && <span className="text-[10px]" style={{ color: '#3A3B52' }}>hold to reorder</span>}
          </div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(e) => handleDragEnd(e, 'now', nowTasks)}
          >
            <SortableContext items={nowTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {nowTasks.map((t, i) => (
                  <SortableTaskCard key={t.id} task={t} index={i} onDone={completeTask} onPark={snoozeTask} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* Energy hint */}
        <motion.div
          initial={shouldAnimate ? { opacity: 0, y: 12 } : false}
          animate={shouldAnimate ? { opacity: 1, y: 0 } : false}
          className="rounded-2xl p-3 border"
          style={{ backgroundColor: 'rgba(78,205,196,0.08)', borderColor: 'rgba(78,205,196,0.15)' }}
        >
          <p className="text-[13px]" style={{ color: '#4ECDC4' }}>
            🌱 Low energy day? Start with an easy one — momentum builds from small wins.
          </p>
        </motion.div>

        {/* NEXT */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: '#8B8BA7' }}>NEXT</span>
            <span className="text-[11px]" style={{ color: '#8B8BA7' }}>{nextTasks.length}/6</span>
            {/* Two-Thirds guardrail — B-9: gentle nudge when queue is getting full */}
            {nextTasks.length >= 4 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.10)', color: '#F59E0B' }}>
                filling up
              </span>
            )}
          </div>
          {nextTasks.length === 0 ? (
            <p className="text-[13px] py-2" style={{ color: '#8B8BA7' }}>Queue tasks here — they'll be ready when NOW has room.</p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(e) => handleDragEnd(e, 'next', nextTasks)}
            >
              <SortableContext items={nextTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {nextTasks.map((t, i) => (
                    <SortableTaskCard key={t.id} task={t} index={i} onDone={completeTask} onPark={snoozeTask} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Someday */}
        <CollapsibleSection label="SOMEDAY" count={somedayTasks.length} open={showSomeday} onToggle={() => setShowSomeday(!showSomeday)} shouldAnimate={shouldAnimate}>
          <div className="space-y-2 mt-2">
            {somedayTasks.map((t, i) => (
              <TaskCard key={t.id} task={t} index={i} onDone={(id) => completeTask(id)} onPark={(id) => snoozeTask(id)} />
            ))}
          </div>
        </CollapsibleSection>

        {/* Done */}
        <CollapsibleSection label="✓ Done recently" count={doneTasks.length} open={showDone} onToggle={() => setShowDone(!showDone)} labelColor="#4ECDC4" shouldAnimate={shouldAnimate}>
          <div className="space-y-1 mt-2">
            {doneTasks.map(t => {
              const diffConfig = DIFFICULTY_MAP[t.difficulty ?? 1];
              return (
                <div key={t.id} className="flex items-center gap-2 py-1.5">
                  <span style={{ color: '#4ECDC4' }}>✓</span>
                  <span className="text-[14px] line-through flex-1" style={{ color: '#8B8BA7' }}>{t.title}</span>
                  <span
                    className="text-[11px] px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: `${diffConfig.color}20`, color: diffConfig.color }}
                  >
                    {diffConfig.label}
                  </span>
                  {t.completedAt && (
                    <span className="text-[11px]" style={{ color: '#8B8BA7' }}>
                      {new Date(t.completedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </CollapsibleSection>
      </div>

      <Fab onClick={() => setShowAddTask(true)} />
      <AddTaskModal open={showAddTask} onClose={() => setShowAddTask(false)} />
    </div>
    </PageTransition>
  );
}

// ── Sortable wrapper for TaskCard ─────────────────────────────────────────────
function SortableTaskCard({ task, index, onDone, onPark }: {
  task: Task; index: number; onDone: (id: string) => void; onPark: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
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
      {/* Drag handle overlay — long press activates via TouchSensor */}
      <div {...attributes} {...listeners} className="touch-none">
        <TaskCard task={task} index={index} onDone={onDone} onPark={onPark} />
      </div>
    </div>
  )
}

function CollapsibleSection({ label, count, open, onToggle, children, labelColor, shouldAnimate = true }: {
  label: string; count: number; open: boolean; onToggle: () => void; children: React.ReactNode; labelColor?: string; shouldAnimate?: boolean;
}) {
  return (
    <div>
      <motion.button whileTap={shouldAnimate ? { scale: 0.97 } : undefined} onClick={onToggle} aria-expanded={open} aria-label={`${open ? 'Collapse' : 'Expand'} ${label} section`} className="flex items-center gap-2 w-full py-1 focus-visible:ring-2 focus-visible:ring-ms-primary/50 focus-visible:outline-none rounded">
        <span className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: labelColor || '#8B8BA7' }}>{label}</span>
        <span className="text-[11px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#252840', color: '#8B8BA7' }}>{count}</span>
        <ChevronDown size={14} className={`ml-auto transition-transform ${open ? 'rotate-180' : ''}`} style={{ color: '#8B8BA7' }} />
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div initial={shouldAnimate ? { height: 0, opacity: 0 } : false} animate={shouldAnimate ? { height: 'auto', opacity: 1 } : false} exit={shouldAnimate ? { height: 0, opacity: 0 } : undefined} className="overflow-hidden">
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
