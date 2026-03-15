import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { difficultyConfig, durationOptions, type Difficulty } from '@/lib/mock-data';
import { X } from 'lucide-react';
interface AddTaskModalProps {
  open: boolean;
  onClose: () => void;
  nowCount: number;
  maxNow?: number;
  onAdd?: (task: { title: string; difficulty: Difficulty; minutes: number }) => void;
}
export default function AddTaskModal({ open, onClose, nowCount, maxNow = 3, onAdd }: AddTaskModalProps) {
  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [minutes, setMinutes] = useState(25);
  const isFull = nowCount >= maxNow;
  const handleSubmit = () => {
    if (!title.trim()) return;
    onAdd?.({ title: title.trim(), difficulty, minutes });
    setTitle('');
    setDifficulty('easy');
    setMinutes(25);
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
            onClick={onClose}
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
              <button onClick={onClose} className="p-2 text-ms-muted">
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
                  {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => {
                    const c = difficultyConfig[d];
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
                          {Array.from({ length: c.dots }).map((_, i) => (
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
