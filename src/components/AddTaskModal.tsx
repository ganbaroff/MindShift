import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { X } from 'lucide-react';
import { useStore } from '@/store';
import { DIFFICULTY_MAP } from '@/types';
import type { Task } from '@/types';
import { getNowPoolMax } from '@/shared/lib/constants';

const durationOptions = [5, 15, 25, 45, 60];

// Quick-date helpers
function toISODate(d: Date): string {
  return d.toISOString().split('T')[0];
}
const TODAY    = toISODate(new Date());
const TOMORROW = toISODate(new Date(Date.now() + 86_400_000));

interface AddTaskModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AddTaskModal({ open, onClose }: AddTaskModalProps) {
  const { addTask, nowPool, appMode, seasonalMode } = useStore();
  const maxNow = getNowPoolMax(appMode, seasonalMode);
  const nowCount = nowPool.filter(t => t.status === 'active').length;
  const isFull = nowCount >= maxNow;

  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState<1 | 2 | 3>(1);
  const [minutes, setMinutes] = useState(25);
  const [dueDate, setDueDate] = useState<string | null>(null);

  // Reset form when modal closes
  const handleClose = () => {
    setTitle('');
    setDifficulty(1);
    setMinutes(25);
    setDueDate(null);
    onClose();
  };

  const handleSubmit = () => {
    if (!title.trim()) return;
    const newTask: Task = {
      id: crypto.randomUUID(),
      title: title.trim(),
      pool: isFull ? 'next' : 'now',
      status: 'active',
      difficulty,
      estimatedMinutes: minutes,
      createdAt: new Date().toISOString(),
      completedAt: null,
      snoozeCount: 0,
      parentTaskId: null,
      position: 0,
      dueDate: dueDate,
      dueTime: null,
      taskType: 'task',
      reminderSentAt: null,
    };
    addTask(newTask);
    setTitle('');
    setDifficulty(1);
    setMinutes(25);
    setDueDate(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40"
            onClick={handleClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-ms-card rounded-t-3xl p-5 safe-bottom max-h-[85vh] overflow-y-auto"
          >
            <div className="w-10 h-1 rounded-full bg-ms-muted/30 mx-auto mb-4" />
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-title text-ms-text">Add a task</h2>
              <button onClick={handleClose} className="p-2 text-ms-muted">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-5">
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="What's on your mind?"
                className="w-full bg-ms-raised rounded-xl px-4 h-12 text-body text-ms-text placeholder:text-ms-muted border border-transparent focus:border-ms-primary outline-none transition-colors"
              />
              <div>
                <label className="text-caption text-ms-muted uppercase tracking-widest mb-2 block">Difficulty</label>
                <div className="flex gap-2">
                  {([1, 2, 3] as const).map(d => {
                    const c = DIFFICULTY_MAP[d];
                    const sel = difficulty === d;
                    return (
                      <motion.button
                        key={d}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setDifficulty(d)}
                        className="flex-1 h-11 rounded-xl flex items-center justify-center gap-2 text-secondary font-medium transition-all"
                        style={{
                          backgroundColor: sel ? `${c.color}20` : '#252840',
                          borderWidth: sel ? 1.5 : 1,
                          borderColor: sel ? c.color : 'rgba(255,255,255,0.06)',
                          color: sel ? c.color : '#8B8BA7',
                        }}
                      >
                        <div className="flex gap-0.5">
                          {Array.from({ length: d }).map((_, i) => (
                            <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sel ? c.color : '#8B8BA7' }} />
                          ))}
                        </div>
                        {c.label}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="text-caption text-ms-muted uppercase tracking-widest mb-2 block">Time</label>
                <div className="flex gap-2">
                  {durationOptions.map(d => {
                    const sel = minutes === d;
                    return (
                      <motion.button
                        key={d}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setMinutes(d)}
                        className="flex-1 h-10 rounded-full text-secondary font-medium transition-all"
                        style={{
                          background: sel ? 'linear-gradient(135deg, #7B72FF, #8B7FF7)' : '#252840',
                          color: sel ? '#fff' : '#8B8BA7',
                          borderWidth: sel ? 0 : 1,
                          borderColor: 'rgba(255,255,255,0.06)',
                        }}
                      >
                        {d}m
                      </motion.button>
                    );
                  })}
                </div>
              </div>
              {/* Due date */}
              <div>
                <label className="text-caption text-ms-muted uppercase tracking-widest mb-2 block">Due date <span style={{ color: '#4ECDC4' }}>(optional)</span></label>
                <div className="flex gap-2 mb-2">
                  {[
                    { label: 'Today', value: TODAY },
                    { label: 'Tomorrow', value: TOMORROW },
                  ].map(({ label, value }) => {
                    const sel = dueDate === value;
                    return (
                      <motion.button
                        key={value}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setDueDate(sel ? null : value)}
                        className="flex-1 h-9 rounded-xl text-secondary font-medium transition-all"
                        style={{
                          backgroundColor: sel ? 'rgba(78,205,196,0.15)' : '#252840',
                          borderWidth: sel ? 1.5 : 1,
                          borderStyle: 'solid',
                          borderColor: sel ? '#4ECDC4' : 'rgba(255,255,255,0.06)',
                          color: sel ? '#4ECDC4' : '#8B8BA7',
                        }}
                      >
                        {label}
                      </motion.button>
                    );
                  })}
                  <input
                    type="date"
                    value={dueDate ?? ''}
                    min={TODAY}
                    onChange={e => setDueDate(e.target.value || null)}
                    className="flex-1 h-9 rounded-xl px-2 text-secondary outline-none transition-all"
                    style={{
                      backgroundColor: (dueDate && dueDate !== TODAY && dueDate !== TOMORROW) ? 'rgba(123,114,255,0.15)' : '#252840',
                      border: `${(dueDate && dueDate !== TODAY && dueDate !== TOMORROW) ? 1.5 : 1}px solid ${(dueDate && dueDate !== TODAY && dueDate !== TOMORROW) ? '#7B72FF' : 'rgba(255,255,255,0.06)'}`,
                      color: (dueDate && dueDate !== TODAY && dueDate !== TOMORROW) ? '#7B72FF' : '#8B8BA7',
                      colorScheme: 'dark',
                    }}
                  />
                </div>
                {dueDate && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs"
                    style={{ color: '#4ECDC4' }}
                  >
                    📅 Will appear in Upcoming tab
                  </motion.p>
                )}
              </div>

              <div className="text-secondary text-ms-muted">
                {isFull ? '💙 NOW is full — landing in NEXT' : '→ Adding to NOW'}
              </div>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleSubmit}
                className="w-full h-[52px] rounded-xl gradient-primary text-primary-foreground font-semibold text-body shadow-primary"
              >
                {isFull ? 'Add to Next →' : 'Add to Now →'}
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
