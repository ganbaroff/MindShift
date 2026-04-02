import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMotion } from '@/shared/hooks/useMotion';
import { todayISO, nextMondayISO } from '@/shared/lib/dateUtils';
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
  arrayMove,
} from '@dnd-kit/sortable';
import TaskCard from '@/components/TaskCard';
import Fab from '@/components/Fab';
import AddTaskModal from '@/components/AddTaskModal';
import { EmptyState } from '@/shared/ui/EmptyState';
import { useStore } from '@/store';
import { DIFFICULTY_MAP } from '@/types';
import type { Task } from '@/types';
import { getNowPoolMax, NEXT_POOL_MAX } from '@/shared/lib/constants';
import { PageTransition } from '@/shared/ui/PageTransition';
import { SortableTaskCard } from './SortableTaskCard';
import { CollapsibleSection } from './CollapsibleSection';

export default function TasksPage() {
  const navigate = useNavigate();
  const { shouldAnimate } = useMotion();
  const { t } = useTranslation();
  const todayIso = todayISO();
  const [showAddTask, setShowAddTask] = useState(false);
  const [showSomeday, setShowSomeday] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { nowPool, nextPool, somedayPool, completeTask, snoozeTask, removeTask, reorderPool, moveTask, setTaskDueDate, appMode, seasonalMode, poolsExplained, setPoolsExplained } = useStore();

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
  // NOW pool: only 'task' type (meetings/reminders/ideas don't go here), sorted by position
  const nowTasks = useMemo(() =>
    nowPool
      .filter(t => t.status === 'active' && t.taskType === 'task' && (!q || t.title.toLowerCase().includes(q)))
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
    [nowPool, q]);
  // NEXT pool: tasks, meetings, reminders — but not ideas, sorted by position
  const nextTasks = useMemo(() =>
    nextPool
      .filter(t => t.status === 'active' && t.taskType !== 'idea' && (!q || t.title.toLowerCase().includes(q)))
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
    [nextPool, q]);
  // SOMEDAY pool: all types
  const somedayTasks = useMemo(() => somedayPool.filter(t => t.status === 'active' && (!q || t.title.toLowerCase().includes(q))), [somedayPool, q]);
  const doneTasks = useMemo(() => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString()
    return [...nowPool, ...nextPool, ...somedayPool]
      .filter(t => t.status === 'completed' && t.completedAt && t.completedAt > sevenDaysAgo)
      .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
  }, [nowPool, nextPool, somedayPool]);

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
    <div className="min-h-screen px-5 pb-36 pt-10" style={{ backgroundColor: 'var(--color-bg)' }}>
      <motion.div initial={shouldAnimate ? { opacity: 0, y: -8 } : false} animate={shouldAnimate ? { opacity: 1, y: 0 } : false}>
        <h1 className="text-[24px] font-bold" style={{ color: 'var(--color-text-primary)' }}>{t('tasks.title')}</h1>
        <p className="text-[13px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{t('tasks.tasksInPlay', { count: nowTasks.length + nextTasks.length })}</p>
      </motion.div>

      {/* Search bar */}
      <motion.div
        initial={shouldAnimate ? { opacity: 0, y: 4 } : false}
        animate={shouldAnimate ? { opacity: 1, y: 0 } : false}
        className="mt-3 flex items-center gap-2 px-3 rounded-2xl h-10"
        style={{ backgroundColor: 'var(--color-surface-card)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <Search size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder={t('tasks.search')}
          className="flex-1 bg-transparent text-[13px] outline-none"
          style={{ color: 'var(--color-text-primary)' }}
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} aria-label="Clear search">
            <X size={13} style={{ color: 'var(--color-text-muted)' }} />
          </button>
        )}
      </motion.div>

      {/* Pool explanation for first-time users */}
      <AnimatePresence>
        {!poolsExplained && (
          <motion.div
            initial={shouldAnimate ? { opacity: 0, height: 0 } : false}
            animate={shouldAnimate ? { opacity: 1, height: 'auto' } : false}
            exit={shouldAnimate ? { opacity: 0, height: 0 } : undefined}
            className="mt-4 rounded-2xl p-4 overflow-hidden"
            style={{ backgroundColor: 'rgba(78,205,196,0.08)', border: '1px solid rgba(78,205,196,0.15)' }}
          >
            <div className="flex items-start justify-between mb-2">
              <p className="text-[13px] font-semibold" style={{ color: 'var(--color-teal)' }}>
                {t('tasks.poolGuide.title', { defaultValue: 'How tasks work here' })}
              </p>
              <button
                onClick={() => { setPoolsExplained() }}
                className="text-[11px] px-2 py-0.5 rounded-lg"
                style={{ color: 'var(--color-text-muted)', backgroundColor: 'rgba(255,255,255,0.05)' }}
                aria-label="Dismiss"
              >
                {t('generic.gotIt', { defaultValue: 'Got it' })}
              </button>
            </div>
            <div className="space-y-1.5 text-[12px]" style={{ color: 'var(--color-text-primary)' }}>
              <p><span style={{ color: 'var(--color-teal)' }}>NOW</span> — {t('tasks.poolGuide.now', { defaultValue: 'up to 3 tasks you do right now. Less choice = less paralysis.' })}</p>
              <p><span style={{ color: 'var(--color-primary)' }}>NEXT</span> — {t('tasks.poolGuide.next', { defaultValue: 'queued up. Move here when ready.' })}</p>
              <p><span style={{ color: 'var(--color-text-muted)' }}>SOMEDAY</span> — {t('tasks.poolGuide.someday', { defaultValue: 'parked ideas. No pressure, no deadline.' })}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-5 mt-5">

        {/* Auto-reschedule banner — gentle, non-shaming */}
        <AnimatePresence>
          {pastDateTasks.length > 0 && (
            <motion.div
              initial={shouldAnimate ? { opacity: 0, y: -8 } : false}
              animate={shouldAnimate ? { opacity: 1, y: 0 } : false}
              exit={shouldAnimate ? { opacity: 0, y: -8 } : undefined}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl"
              style={{
                background: 'rgba(245,158,11,0.07)',
                border: '1px solid rgba(245,158,11,0.20)',
              }}
            >
              <span className="text-base">🗓️</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--color-gold)' }}>
                  {pastDateTasks.length === 1 ? t('tasks.pastDue', { count: pastDateTasks.length }) : t('tasks.pastDuePlural', { count: pastDateTasks.length })}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  {t('tasks.noPressure')}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <button
                  onClick={() => {
                    const monday = nextMondayISO()
                    pastDateTasks.forEach(task => setTaskDueDate(task.id, monday, null))
                  }}
                  className="text-[11px] font-medium px-2 py-1 rounded-lg focus-visible:ring-2 focus-visible:ring-[#7B72FF]"
                  style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--color-gold)' }}
                  aria-label="Move overdue tasks to next Monday"
                >
                  → Mon
                </button>
                <button
                  onClick={() => navigate('/calendar')}
                  className="text-[10px] focus-visible:ring-2 focus-visible:ring-[#7B72FF] rounded"
                  style={{ color: 'var(--color-text-muted)' }}
                  aria-label="Open calendar to reschedule"
                >
                  {t('tasks.reschedule')}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* NOW */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: 'var(--color-primary)' }}>{t('tasks.now')}</span>
            <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{nowTasks.length}/{nowMax}</span>
            {nowTasks.length > 1 && <span className="text-[10px]" style={{ color: '#3A3B52' }}>{t('tasks.holdToReorder')}</span>}
          </div>
          {nowTasks.length === 0 ? (
            <EmptyState
              emoji="🎯"
              title={t('tasks.readyWhenYouAre')}
              subtitle={t('tasks.addToStart')}
              action={{ label: t('tasks.addTask'), onClick: () => setShowAddTask(true) }}
            />
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(e) => handleDragEnd(e, 'now', nowTasks)}
            >
              <SortableContext items={nowTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {nowTasks.map((t, i) => (
                    <SortableTaskCard key={t.id} task={t} index={i} onDone={completeTask} onPark={snoozeTask} onRemove={removeTask} onMove={moveTask} currentPool="now" />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Energy hint */}
        <motion.div
          initial={shouldAnimate ? { opacity: 0, y: 12 } : false}
          animate={shouldAnimate ? { opacity: 1, y: 0 } : false}
          className="rounded-2xl p-3 border"
          style={{ backgroundColor: 'rgba(78,205,196,0.08)', borderColor: 'rgba(78,205,196,0.15)' }}
        >
          <p className="text-[13px]" style={{ color: 'var(--color-teal)' }}>
            🌱 {t('tasks.energyHint')}
          </p>
        </motion.div>

        {/* NEXT */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: 'var(--color-text-muted)' }}>{t('tasks.next')}</span>
            <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{nextTasks.length}/{NEXT_POOL_MAX}</span>
            {/* Two-Thirds guardrail — B-9: gentle nudge when queue is getting full */}
            {nextTasks.length >= 4 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.10)', color: 'var(--color-gold)' }}>
                {t('tasks.fillingUp')}
              </span>
            )}
          </div>
          {nextTasks.length === 0 ? (
            <p className="text-[13px] py-2" style={{ color: 'var(--color-text-muted)' }}>{t('tasks.queueHere')}</p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(e) => handleDragEnd(e, 'next', nextTasks)}
            >
              <SortableContext items={nextTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {nextTasks.map((t, i) => (
                    <SortableTaskCard key={t.id} task={t} index={i} onDone={completeTask} onPark={snoozeTask} onRemove={removeTask} onMove={moveTask} currentPool="next" />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Someday */}
        <CollapsibleSection label={t('tasks.someday')} count={somedayTasks.length} open={showSomeday} onToggle={() => setShowSomeday(!showSomeday)} shouldAnimate={shouldAnimate}>
          <div className="space-y-2 mt-2">
            {somedayTasks.map((t, i) => (
              <TaskCard key={t.id} task={t} index={i} onDone={(id) => completeTask(id)} onPark={(id) => snoozeTask(id)} onRemove={(id) => removeTask(id)} />
            ))}
          </div>
        </CollapsibleSection>

        {/* Done */}
        <CollapsibleSection label={`✓ ${t('tasks.doneRecently')}`} count={doneTasks.length} open={showDone} onToggle={() => setShowDone(!showDone)} labelColor="#4ECDC4" shouldAnimate={shouldAnimate}>
          <div className="space-y-1 mt-2">
            {doneTasks.map(t => {
              const diffConfig = DIFFICULTY_MAP[t.difficulty ?? 1];
              return (
                <div key={t.id} className="flex items-center gap-2 py-1.5">
                  <span style={{ color: 'var(--color-teal)' }}>✓</span>
                  <span className="text-[14px] line-through flex-1" style={{ color: 'var(--color-text-muted)' }}>{t.title}</span>
                  <span
                    className="text-[11px] px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: `${diffConfig.color}20`, color: diffConfig.color }}
                  >
                    {diffConfig.label}
                  </span>
                  {t.completedAt && (
                    <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
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

