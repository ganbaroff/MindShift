import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TaskCard from '@/components/TaskCard';
import Fab from '@/components/Fab';
import AddTaskModal from '@/components/AddTaskModal';
import { useStore } from '@/store';
import { DIFFICULTY_MAP } from '@/types';
import { getNowPoolMax } from '@/shared/lib/constants';

const TODAY_ISO = new Date().toISOString().split('T')[0];

export default function TasksPage() {
  const navigate = useNavigate();
  const [showAddTask, setShowAddTask] = useState(false);
  const [showSomeday, setShowSomeday] = useState(false);
  const [showDone, setShowDone] = useState(false);

  const { nowPool, nextPool, somedayPool, completeTask, snoozeTask, appMode, seasonalMode } = useStore();

  const nowTasks = useMemo(() => nowPool.filter(t => t.status === 'active'), [nowPool]);
  const nextTasks = useMemo(() => nextPool.filter(t => t.status === 'active'), [nextPool]);
  const somedayTasks = useMemo(() => somedayPool.filter(t => t.status === 'active'), [somedayPool]);
  const doneTasks = useMemo(() =>
    [...nowPool, ...nextPool, ...somedayPool]
      .filter(t => t.status === 'completed' && t.completedAt)
      .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime()),
    [nowPool, nextPool, somedayPool]
  );

  const nowMax = getNowPoolMax(appMode, seasonalMode);

  // Overdue task detection — tasks with a past due date still active
  const overdueTasks = useMemo(() =>
    [...nowPool, ...nextPool].filter(
      t => t.status === 'active' && t.dueDate && t.dueDate < TODAY_ISO
    ),
    [nowPool, nextPool]
  );

  return (
    <div className="min-h-screen px-5 pb-36 pt-10" style={{ backgroundColor: '#0F1120' }}>
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-[24px] font-bold" style={{ color: '#E8E8F0' }}>Your Tasks</h1>
        <p className="text-[13px] mt-0.5" style={{ color: '#8B8BA7' }}>{nowTasks.length + nextTasks.length} tasks in play</p>
      </motion.div>

      <div className="space-y-5 mt-5">

        {/* Auto-reschedule banner — gentle, non-shaming */}
        <AnimatePresence>
          {overdueTasks.length > 0 && (
            <motion.button
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
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
                  {overdueTasks.length} task{overdueTasks.length !== 1 ? 's' : ''} past their due date
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
          </div>
          <div className="space-y-2">
            {nowTasks.map((t, i) => (
              <TaskCard key={t.id} task={t} index={i} onDone={(id) => completeTask(id)} onPark={(id) => snoozeTask(id)} />
            ))}
          </div>
        </div>

        {/* Energy hint */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
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
          <div className="space-y-2">
            {nextTasks.length === 0 ? (
              <p className="text-[13px] py-2" style={{ color: '#8B8BA7' }}>Queue tasks here — they'll be ready when NOW has room.</p>
            ) : (
              nextTasks.map((t, i) => (
                <TaskCard key={t.id} task={t} index={i} onDone={(id) => completeTask(id)} onPark={(id) => snoozeTask(id)} />
              ))
            )}
          </div>
        </div>

        {/* Someday */}
        <CollapsibleSection label="SOMEDAY" count={somedayTasks.length} open={showSomeday} onToggle={() => setShowSomeday(!showSomeday)}>
          <div className="space-y-2 mt-2">
            {somedayTasks.map((t, i) => (
              <TaskCard key={t.id} task={t} index={i} onDone={(id) => completeTask(id)} onPark={(id) => snoozeTask(id)} />
            ))}
          </div>
        </CollapsibleSection>

        {/* Done */}
        <CollapsibleSection label="✓ Done recently" count={doneTasks.length} open={showDone} onToggle={() => setShowDone(!showDone)} labelColor="#4ECDC4">
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
  );
}

function CollapsibleSection({ label, count, open, onToggle, children, labelColor }: {
  label: string; count: number; open: boolean; onToggle: () => void; children: React.ReactNode; labelColor?: string;
}) {
  return (
    <div>
      <motion.button whileTap={{ scale: 0.97 }} onClick={onToggle} aria-expanded={open} aria-label={`${open ? 'Collapse' : 'Expand'} ${label} section`} className="flex items-center gap-2 w-full py-1 focus-visible:ring-2 focus-visible:ring-ms-primary/50 focus-visible:outline-none rounded">
        <span className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: labelColor || '#8B8BA7' }}>{label}</span>
        <span className="text-[11px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#252840', color: '#8B8BA7' }}>{count}</span>
        <ChevronDown size={14} className={`ml-auto transition-transform ${open ? 'rotate-180' : ''}`} style={{ color: '#8B8BA7' }} />
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
