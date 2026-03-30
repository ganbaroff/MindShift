import { memo, useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { Pencil, Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMotion } from '@/shared/hooks/useMotion';
import { hapticDone } from '@/shared/lib/haptic';
import { DIFFICULTY_MAP, TASK_TYPE_CONFIG, CATEGORY_CONFIG } from '@/types';
import type { Task } from '@/types';
import { reminders } from '@/shared/lib/reminders';
import { useStore } from '@/store';
import { toast } from 'sonner';

interface TaskCardProps {
  task: Task;
  index?: number;
  onDone?: (id: string) => void;
  onPark?: (id: string) => void;
  onRemove?: (id: string) => void;
}

function DifficultyDots({ difficulty }: { difficulty: 1 | 2 | 3 }) {
  const config = DIFFICULTY_MAP[difficulty] ?? DIFFICULTY_MAP[1];
  return (
    <div className="flex gap-0.5 items-center">
      {Array.from({ length: difficulty }).map((_, i) => (
        <div
          key={i}
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: config.color }}
        />
      ))}
    </div>
  );
}

// ── Completion toast messages adapted by emotional reactivity ─────────────────
const COMPLETION_TOASTS: Record<string, string[]> = {
  high: [
    "One more thing off your list. You're doing this.",
    "Done. You showed up for that one, and it matters.",
    "Finished. Give yourself a moment to feel that.",
    "That's one less thing weighing on you.",
  ],
  moderate: [
    "Done. Solid work.",
    "One down. Keep your pace.",
    "Finished. On to the next when you're ready.",
  ],
  steady: [
    "Done.",
    "Checked off.",
    "Done. Next.",
  ],
}

function TaskCardInner({ task, index = 0, onDone, onPark, onRemove }: TaskCardProps) {
  const { shouldAnimate } = useMotion();
  const { t } = useTranslation();
  const [justCompleted, setJustCompleted] = useState(false);
  const emotionalReactivity = useStore(s => s.emotionalReactivity);
  const updateTask = useStore(s => s.updateTask);
  const config = DIFFICULTY_MAP[task.difficulty ?? 1];
  const isCarryOver = task.status === 'active' &&
    (Date.now() - new Date(task.createdAt).getTime() >= 24 * 60 * 60 * 1000);
  const hasReminder = !!task.dueDate && reminders.has(task.id);

  // ── Inline edit mode ────────────────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editNote, setEditNote] = useState(task.note ?? '');
  const [editDueDate, setEditDueDate] = useState(task.dueDate ?? '');
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [isEditing]);

  const handleEditSave = useCallback(() => {
    const trimmedTitle = editTitle.trim();
    if (!trimmedTitle) return;
    updateTask(task.id, {
      title: trimmedTitle,
      note: editNote.trim() || undefined,
      dueDate: editDueDate || null,
    });
    setIsEditing(false);
  }, [editTitle, editNote, editDueDate, task.id, updateTask]);

  const handleEditCancel = useCallback(() => {
    setEditTitle(task.title);
    setEditNote(task.note ?? '');
    setEditDueDate(task.dueDate ?? '');
    setIsEditing(false);
  }, [task.title, task.note, task.dueDate]);

  const handleEditKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleEditSave();
    if (e.key === 'Escape') handleEditCancel();
  }, [handleEditSave, handleEditCancel]);

  // ── Delete confirmation — two-tap with 3s revert ───────────────────────────
  const [confirmRemove, setConfirmRemove] = useState(false);
  const removeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (removeTimerRef.current) clearTimeout(removeTimerRef.current);
    };
  }, []);

  const handleRemoveTap = useCallback(() => {
    if (confirmRemove) {
      if (removeTimerRef.current) clearTimeout(removeTimerRef.current);
      onRemove?.(task.id);
      setConfirmRemove(false);
    } else {
      setConfirmRemove(true);
      removeTimerRef.current = setTimeout(() => setConfirmRemove(false), 3000);
    }
  }, [confirmRemove, onRemove, task.id]);

  // Undo completion — 4s deferred window
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingTaskIdRef = useRef<string | null>(null);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
        // If unmounting with a pending completion, execute it
        if (pendingTaskIdRef.current) {
          onDone?.(pendingTaskIdRef.current);
        }
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDone = (id: string) => {
    hapticDone();
    setJustCompleted(true);

    // Show emotionally-adapted completion toast with Undo action
    const msgPool = COMPLETION_TOASTS[emotionalReactivity ?? 'moderate'] ?? COMPLETION_TOASTS.moderate;
    const msg = msgPool[Math.floor(Math.random() * msgPool.length)];

    // Store pending completion
    pendingTaskIdRef.current = id;

    // Start 4s deferred completion timer
    undoTimerRef.current = setTimeout(() => {
      if (pendingTaskIdRef.current === id) {
        onDone?.(id);
        pendingTaskIdRef.current = null;
      }
    }, 4000);

    toast(msg, {
      duration: 4000,
      action: {
        label: t('taskCard.undo'),
        onClick: () => {
          // Cancel deferred completion
          if (undoTimerRef.current) {
            clearTimeout(undoTimerRef.current);
            undoTimerRef.current = null;
          }
          pendingTaskIdRef.current = null;
          setJustCompleted(false);
        },
      },
    });
  };

  // ── Edit mode rendering ─────────────────────────────────────────────────────
  if (isEditing) {
    return (
      <motion.div
        initial={shouldAnimate ? { opacity: 0, y: 8 } : false}
        animate={shouldAnimate ? { opacity: 1, y: 0 } : false}
        className="rounded-2xl p-3 overflow-hidden"
        style={{
          backgroundColor: 'var(--color-surface-card)',
          borderLeft: `3px solid ${config.color}`,
          border: '1px solid rgba(123,114,255,0.3)',
        }}
      >
        <div className="space-y-2">
          <input
            ref={editInputRef}
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            onKeyDown={handleEditKeyDown}
            placeholder="Task title"
            className="w-full bg-ms-raised rounded-lg px-3 h-9 text-[14px] text-ms-text placeholder:text-ms-muted border border-transparent focus:border-ms-primary outline-none"
            aria-label="Edit task title"
          />
          <textarea
            value={editNote}
            onChange={e => setEditNote(e.target.value)}
            onKeyDown={handleEditKeyDown}
            placeholder="Note (optional)"
            rows={2}
            className="w-full bg-ms-raised rounded-lg px-3 py-2 text-[12px] text-ms-text placeholder:text-ms-muted border border-transparent focus:border-ms-primary outline-none resize-none"
            aria-label="Edit task note"
          />
          <input
            type="date"
            value={editDueDate}
            onChange={e => setEditDueDate(e.target.value)}
            className="w-full bg-ms-raised rounded-lg px-3 h-9 text-[12px] text-ms-text border border-transparent focus:border-ms-primary outline-none"
            aria-label="Edit due date"
          />
          <div className="flex gap-2">
            <button
              onClick={handleEditSave}
              disabled={!editTitle.trim()}
              className="flex-1 h-8 rounded-lg text-[12px] font-medium flex items-center justify-center gap-1 disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-ms-primary focus-visible:outline-none"
              style={{ backgroundColor: 'rgba(78,205,196,0.12)', color: 'var(--color-teal)' }}
              aria-label="Save edit"
            >
              <Check size={14} /> {t('taskCard.save')}
            </button>
            <button
              onClick={handleEditCancel}
              className="flex-1 h-8 rounded-lg text-[12px] font-medium flex items-center justify-center gap-1 focus-visible:ring-2 focus-visible:ring-ms-primary focus-visible:outline-none"
              style={{ backgroundColor: 'var(--color-surface-raised)', color: 'var(--color-text-muted)' }}
              aria-label="Cancel edit"
            >
              <X size={14} /> {t('taskCard.cancel')}
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={shouldAnimate ? { opacity: 0, y: 8 } : false}
      animate={shouldAnimate ? { opacity: 1, y: 0 } : false}
      transition={shouldAnimate ? { delay: index * 0.05 } : undefined}
      className="rounded-2xl p-3 overflow-hidden"
      style={{
        backgroundColor: 'var(--color-surface-card)',
        borderLeft: `3px solid ${config.color}`,
      }}
    >
      {/* Header row */}
      <div className="flex items-center gap-2 mb-1.5">
        {/* Difficulty dots and duration only for 'task' type */}
        {task.taskType === 'task' && <DifficultyDots difficulty={task.difficulty ?? 1} />}
        {task.pool !== 'now' && (
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
            style={{ backgroundColor: 'rgba(123,114,255,0.15)', color: 'var(--color-primary)' }}
          >
            {task.pool.toUpperCase()}
          </span>
        )}
        {task.taskType === 'task' && task.estimatedMinutes && (
          <span className="text-[11px] ml-auto" style={{ color: 'var(--color-text-muted)' }}>
            {task.estimatedMinutes}m
          </span>
        )}
        {task.taskType !== 'task' && TASK_TYPE_CONFIG[task.taskType] && (
          <span className="text-[13px]" title={TASK_TYPE_CONFIG[task.taskType].label}>
            {TASK_TYPE_CONFIG[task.taskType].emoji}
          </span>
        )}
        {hasReminder && <span className="text-[13px]" title="Reminder set">🔔</span>}
        {task.dueDate && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full ml-auto" style={{ backgroundColor: 'rgba(123,114,255,0.12)', color: 'var(--color-primary)' }}>
            📅 {task.dueDate}
          </span>
        )}
        {isCarryOver && (
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: 'var(--color-gold)' }}
          >
            {t('taskCard.carryOver')}
          </span>
        )}
        {/* Edit button */}
        {task.status === 'active' && (
          <button
            onClick={() => {
              setEditTitle(task.title);
              setEditNote(task.note ?? '');
              setEditDueDate(task.dueDate ?? '');
              setIsEditing(true);
            }}
            className="ml-auto p-1 rounded-md focus-visible:ring-2 focus-visible:ring-ms-primary focus-visible:outline-none"
            style={{ color: 'var(--color-text-muted)' }}
            aria-label="Edit task"
          >
            <Pencil size={13} />
          </button>
        )}
      </div>

      {/* Title */}
      <p
        className="text-[15px] font-semibold mb-1.5 line-clamp-2"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {task.title}
      </p>

      {/* Note preview — shown when task has context */}
      {task.note && (
        <p className="text-[11px] mb-2 line-clamp-1" style={{ color: '#5A5B72' }}>
          📝 {task.note}
        </p>
      )}

      {/* Category badge */}
      {task.category && CATEGORY_CONFIG[task.category] && (
        <span
          className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium mb-2"
          style={{ backgroundColor: 'rgba(123,114,255,0.12)', color: 'var(--color-primary)' }}
        >
          {CATEGORY_CONFIG[task.category].emoji} {t(`category.${task.category}`, CATEGORY_CONFIG[task.category].label)}
        </span>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <motion.button
          whileTap={shouldAnimate ? { scale: 0.97 } : undefined}
          animate={shouldAnimate && justCompleted ? {
            scale: [1, 1.02, 1],
            boxShadow: [
              '0 0 0px rgba(78,205,196,0)',
              '0 0 12px rgba(78,205,196,0.4)',
              '0 0 0px rgba(78,205,196,0)',
            ],
          } : undefined}
          transition={shouldAnimate ? { duration: 0.35, ease: 'easeOut' } : { duration: 0 }}
          onClick={() => handleDone(task.id)}
          className="flex-1 h-9 rounded-xl text-[13px] font-medium focus-visible:ring-2 focus-visible:ring-[#4ECDC4] focus-visible:outline-none"
          style={{
            backgroundColor: justCompleted ? 'rgba(78,205,196,0.2)' : 'rgba(78,205,196,0.12)',
            border: '1px solid rgba(78,205,196,0.35)',
            color: 'var(--color-teal)',
          }}
        >
          {justCompleted ? t('taskCard.doneComplete') : t('taskCard.done')}
        </motion.button>
        <motion.button
          whileTap={shouldAnimate ? { scale: 0.97 } : undefined}
          onClick={() => onPark?.(task.id)}
          className="flex-1 h-9 rounded-xl text-[13px] font-medium focus-visible:ring-2 focus-visible:ring-ms-primary focus-visible:outline-none"
          style={{ backgroundColor: 'var(--color-surface-raised)', color: 'var(--color-text-muted)' }}
        >
          {t('taskCard.parkIt')}
        </motion.button>
        {onRemove && (
          <motion.button
            whileTap={shouldAnimate ? { scale: 0.97 } : undefined}
            onClick={handleRemoveTap}
            className="h-9 px-3 rounded-xl text-[12px] font-medium focus-visible:ring-2 focus-visible:ring-[#F59E0B] focus-visible:outline-none transition-colors"
            style={{
              backgroundColor: confirmRemove ? 'rgba(245,158,11,0.2)' : 'rgba(139,139,167,0.1)',
              border: confirmRemove ? '1px solid rgba(245,158,11,0.4)' : '1px solid transparent',
              color: confirmRemove ? 'var(--color-gold)' : 'var(--color-text-muted)',
            }}
            aria-label={confirmRemove ? 'Confirm remove task' : 'Remove task'}
          >
            {confirmRemove ? t('taskCard.remove') : <><span aria-hidden="true">×</span><span className="sr-only">{t('taskCard.delete', 'Delete')}</span></>}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

const TaskCard = memo(TaskCardInner, (prev, next) =>
  prev.task.id === next.task.id &&
  prev.task.status === next.task.status &&
  prev.task.title === next.task.title &&
  prev.task.note === next.task.note &&
  prev.task.dueDate === next.task.dueDate &&
  prev.task.difficulty === next.task.difficulty &&
  prev.task.estimatedMinutes === next.task.estimatedMinutes &&
  prev.task.taskType === next.task.taskType &&
  prev.task.category === next.task.category &&
  prev.index === next.index &&
  prev.onRemove === next.onRemove
);

export default TaskCard;
