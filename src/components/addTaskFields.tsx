import { motion, AnimatePresence } from 'motion/react';
import { DIFFICULTY_MAP, CATEGORY_CONFIG } from '@/types';
import type { TaskType, TaskCategory } from '@/types';

// ── Field visibility per task type ──────────────────────────────────────────

export interface FieldVisibility {
  difficulty: boolean;
  duration: boolean;
  dueDate: boolean;
  dueDateRequired: boolean;
  dueTime: boolean;
  dueTimeRequired: boolean;
  repeat: boolean;
  category: boolean;
}

export const FIELD_VISIBILITY: Record<TaskType, FieldVisibility> = {
  task:     { difficulty: true,  duration: true,  dueDate: true,  dueDateRequired: false, dueTime: true,  dueTimeRequired: false, repeat: true,  category: true  },
  meeting:  { difficulty: false, duration: false, dueDate: true,  dueDateRequired: true,  dueTime: true,  dueTimeRequired: true,  repeat: false, category: true  },
  reminder: { difficulty: false, duration: false, dueDate: true,  dueDateRequired: true,  dueTime: true,  dueTimeRequired: false, repeat: true,  category: false },
  idea:     { difficulty: false, duration: false, dueDate: false, dueDateRequired: false, dueTime: false, dueTimeRequired: false, repeat: false, category: true  },
};

/** Pool assignment by task type */
export function getPoolForType(type: TaskType, isFull: boolean): 'now' | 'next' | 'someday' {
  if (type === 'idea') return 'someday';
  if (type === 'meeting' || type === 'reminder') return 'next';
  return isFull ? 'next' : 'now';
}

// ── Reusable field sub-components ───────────────────────────────────────────

interface DifficultyPickerProps {
  difficulty: 1 | 2 | 3 | undefined;
  onSelect: (d: 1 | 2 | 3) => void;
}

export function DifficultyPicker({ difficulty, onSelect }: DifficultyPickerProps) {
  return (
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
              onClick={() => onSelect(d)}
              aria-pressed={sel}
              aria-label={`Difficulty: ${c.label}`}
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
  );
}

interface DurationPickerProps {
  minutes: number | undefined;
  onSelect: (m: number) => void;
  isSmartMode: boolean;
}

const durationOptions = [5, 15, 25, 45, 60];

export function DurationPicker({ minutes, onSelect, isSmartMode }: DurationPickerProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <label className="text-caption text-ms-muted uppercase tracking-widest">Time</label>
        {isSmartMode && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(123,114,255,0.12)', color: '#7B72FF' }}>
            ✨ smart
          </span>
        )}
      </div>
      <div className="flex gap-2">
        {durationOptions.map(d => {
          const sel = minutes === d;
          return (
            <motion.button
              key={d}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelect(d)}
              aria-pressed={sel}
              aria-label={`${d} minutes`}
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
  );
}

interface CategoryPickerProps {
  category: TaskCategory | undefined;
  showCategory: boolean;
  onToggle: () => void;
  onSelect: (c: TaskCategory | undefined) => void;
  shouldAnimate: boolean;
}

export function CategoryPicker({ category, showCategory, onToggle, onSelect, shouldAnimate }: CategoryPickerProps) {
  if (!showCategory) {
    return (
      <div>
        <button
          type="button"
          onClick={onToggle}
          className="text-xs flex items-center gap-1"
          style={{ color: '#5A5B72' }}
          aria-expanded={false}
        >
          <span>+</span> Add category (optional)
        </button>
      </div>
    );
  }
  return (
    <div>
      <AnimatePresence>
        <motion.div
          initial={shouldAnimate ? { opacity: 0, height: 0 } : {}}
          animate={{ opacity: 1, height: 'auto' }}
        >
          <label className="text-caption text-ms-muted uppercase tracking-widest mb-2 block">Category</label>
          <div className="flex flex-wrap gap-2">
            {(['work', 'personal', 'health', 'learning', 'finance'] as const).map(c => {
              const cfg = CATEGORY_CONFIG[c];
              const sel = category === c;
              return (
                <motion.button
                  key={c}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => onSelect(sel ? undefined : c)}
                  aria-pressed={sel}
                  aria-label={`Category: ${cfg.label}`}
                  className="h-9 px-3 rounded-xl flex items-center gap-1.5 text-[12px] font-medium transition-all"
                  style={{
                    backgroundColor: sel ? 'rgba(123,114,255,0.15)' : '#252840',
                    borderWidth: sel ? 1.5 : 1,
                    borderStyle: 'solid',
                    borderColor: sel ? '#7B72FF' : 'rgba(255,255,255,0.06)',
                    color: sel ? '#7B72FF' : '#8B8BA7',
                  }}
                >
                  <span>{cfg.emoji}</span>
                  {cfg.label}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

interface RepeatPickerProps {
  repeat: 'none' | 'daily' | 'weekly';
  onSelect: (r: 'none' | 'daily' | 'weekly') => void;
}

export function RepeatPicker({ repeat, onSelect }: RepeatPickerProps) {
  return (
    <div>
      <p className="text-[12px] mb-1.5" style={{ color: '#8B8BA7' }}>Repeat</p>
      <div className="flex gap-2">
        {(['none', 'daily', 'weekly'] as const).map(r => (
          <motion.button
            key={r}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelect(r)}
            aria-pressed={repeat === r}
            aria-label={`Repeat: ${r === 'none' ? 'once' : r}`}
            className="flex-1 h-8 rounded-full text-[12px] font-medium capitalize"
            style={{
              backgroundColor: repeat === r ? 'rgba(123,114,255,0.15)' : '#252840',
              border: `${repeat === r ? 1.5 : 1}px solid ${repeat === r ? '#7B72FF' : 'rgba(255,255,255,0.06)'}`,
              color: repeat === r ? '#7B72FF' : '#8B8BA7',
            }}
          >
            {r === 'none' ? 'Once' : r}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

interface DueDatePickerProps {
  dueDate: string | null;
  required: boolean;
  today: string;
  tomorrow: string;
  shouldAnimate: boolean;
  onSelect: (d: string | null) => void;
}

export function DueDatePicker({ dueDate, required, today, tomorrow, shouldAnimate, onSelect }: DueDatePickerProps) {
  return (
    <div>
      <label className="text-caption text-ms-muted uppercase tracking-widest mb-2 block">
        Due date{' '}
        {required
          ? <span style={{ color: '#7B72FF' }}>(required)</span>
          : <span style={{ color: '#4ECDC4' }}>(optional)</span>
        }
      </label>
      <div className="flex gap-2 mb-2">
        {[
          { label: 'Today', value: today },
          { label: 'Tomorrow', value: tomorrow },
        ].map(({ label, value }) => {
          const sel = dueDate === value;
          return (
            <motion.button
              key={value}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelect(sel && !required ? null : value)}
              aria-pressed={sel}
              aria-label={`Due date: ${label}`}
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
          min={today}
          onChange={e => onSelect(e.target.value || null)}
          className="flex-1 h-9 rounded-xl px-2 text-secondary outline-none transition-all"
          style={{
            backgroundColor: (dueDate && dueDate !== today && dueDate !== tomorrow) ? 'rgba(123,114,255,0.15)' : '#252840',
            border: `${(dueDate && dueDate !== today && dueDate !== tomorrow) ? 1.5 : 1}px solid ${(dueDate && dueDate !== today && dueDate !== tomorrow) ? '#7B72FF' : 'rgba(255,255,255,0.06)'}`,
            color: (dueDate && dueDate !== today && dueDate !== tomorrow) ? '#7B72FF' : '#8B8BA7',
            colorScheme: 'dark',
          }}
        />
      </div>
      {dueDate && (
        <motion.p
          initial={shouldAnimate ? { opacity: 0, y: -4 } : {}}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs"
          style={{ color: '#4ECDC4' }}
        >
          📅 Will appear in Upcoming tab
        </motion.p>
      )}
    </div>
  );
}

interface DueTimePickerProps {
  dueTime: string | null;
  required: boolean;
  onSelect: (t: string | null) => void;
}

export function DueTimePicker({ dueTime, required, onSelect }: DueTimePickerProps) {
  return (
    <div>
      <label className="text-caption text-ms-muted uppercase tracking-widest mb-2 block">
        Time{' '}
        {required
          ? <span style={{ color: '#7B72FF' }}>(required)</span>
          : <span style={{ color: '#4ECDC4' }}>(optional)</span>
        }
      </label>
      <input
        type="time"
        value={dueTime ?? ''}
        onChange={e => onSelect(e.target.value || null)}
        className="w-full h-9 rounded-xl px-4 text-secondary outline-none transition-all"
        style={{
          backgroundColor: dueTime ? 'rgba(123,114,255,0.15)' : '#252840',
          border: `${dueTime ? 1.5 : 1}px solid ${dueTime ? '#7B72FF' : 'rgba(255,255,255,0.06)'}`,
          color: dueTime ? '#7B72FF' : '#8B8BA7',
          colorScheme: 'dark',
        }}
      />
    </div>
  );
}

export { durationOptions };
