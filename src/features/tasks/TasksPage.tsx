import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import TaskCard from '@/components/TaskCard';
import Fab from '@/components/Fab';
import AddTaskModal from '@/components/AddTaskModal';
import { useStore } from '@/store';
import { DIFFICULTY_MAP } from '@/types';
import { getNowPoolMax } from '@/shared/lib/constants';

export default function TasksPage() {
  const [showAddTask, setShowAddTask] = useState(false);
  const [showSomeday, setShowSomeday] = useState(false);
  const [showDone, setShowDone] = useState(false);

  const { nowPool, nextPool, somedayPool, completeTask, snoozeTask, appMode, seasonalMode } = useStore();

  const nowTasks = nowPool.filter(t => t.status === 'active');
  const nextTasks = nextPool.filter(t => t.status === 'active');
  const somedayTasks = somedayPool.filter(t => t.status === 'active');
  const doneTasks = [...nowPool, ...nextPool, ...somedayPool]
    .filter(t => t.status === 'completed' && t.completedAt)
    .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());

  const nowMax = getNowPoolMax(appMode, seasonalMode);

  return (
    <div className="min-h-screen px-5 pb-36 pt-10" style={{ backgroundColor: '#0F1120' }}>
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-[24px] font-bold" style={{ color: '#E8E8F0' }}>Your Tasks</h1>
        <p className="text-[13px] mt-0.5" style={{ color: '#8B8BA7' }}>{nowTasks.length + nextTasks.length} tasks in play</p>
      </motion.div>

      <div className="space-y-5 mt-5">
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
          </div>
          <div className="space-y-2">
            {nextTasks.map((t, i) => (
              <TaskCard key={t.id} task={t} index={i} onDone={(id) => completeTask(id)} onPark={(id) => snoozeTask(id)} />
            ))}
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
      <motion.button whileTap={{ scale: 0.97 }} onClick={onToggle} className="flex items-center gap-2 w-full py-1">
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
