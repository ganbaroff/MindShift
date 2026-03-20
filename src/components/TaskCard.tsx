import { memo, useState } from 'react';
import { motion } from 'motion/react';
import { useMotion } from '@/shared/hooks/useMotion';
import { hapticDone } from '@/shared/lib/haptic';
import { DIFFICULTY_MAP, TASK_TYPE_CONFIG, CATEGORY_CONFIG } from '@/types';
import type { Task } from '@/types';
import { reminders } from '@/shared/lib/reminders';

interface TaskCardProps {
  task: Task;
  index?: number;
  onDone?: (id: string) => void;
  onPark?: (id: string) => void;
}

function DifficultyDots({ difficulty }: { difficulty: 1 | 2 | 3 }) {
  const config = DIFFICULTY_MAP[difficulty];
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

function TaskCardInner({ task, index = 0, onDone, onPark }: TaskCardProps) {
  const { shouldAnimate } = useMotion();
  const [justCompleted, setJustCompleted] = useState(false);
  const config = DIFFICULTY_MAP[task.difficulty ?? 1];
  const isCarryOver = task.status === 'active' &&
    (Date.now() - new Date(task.createdAt).getTime() > 24 * 60 * 60 * 1000);
  const hasReminder = !!task.dueDate && reminders.has(task.id);

  const handleDone = (id: string) => {
    hapticDone();
    setJustCompleted(true);
    // Brief delay so the user sees the celebration micro-interaction
    setTimeout(() => onDone?.(id), 300);
  };

  return (
    <motion.div
      initial={shouldAnimate ? { opacity: 0, y: 8 } : false}
      animate={shouldAnimate ? { opacity: 1, y: 0 } : false}
      transition={shouldAnimate ? { delay: index * 0.05 } : undefined}
      className="rounded-2xl p-3 overflow-hidden"
      style={{
        backgroundColor: '#1E2136',
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
            style={{ backgroundColor: 'rgba(123,114,255,0.15)', color: '#7B72FF' }}
          >
            {task.pool.toUpperCase()}
          </span>
        )}
        {task.taskType === 'task' && task.estimatedMinutes && (
          <span className="text-[11px] ml-auto" style={{ color: '#8B8BA7' }}>
            {task.estimatedMinutes}m
          </span>
        )}
        {task.taskType !== 'task' && (
          <span className="text-[13px]" title={TASK_TYPE_CONFIG[task.taskType].label}>
            {TASK_TYPE_CONFIG[task.taskType].emoji}
          </span>
        )}
        {hasReminder && <span className="text-[13px]" title="Reminder set">🔔</span>}
        {task.dueDate && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full ml-auto" style={{ backgroundColor: 'rgba(123,114,255,0.12)', color: '#7B72FF' }}>
            📅 {task.dueDate}
          </span>
        )}
        {isCarryOver && (
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}
          >
            carry-over
          </span>
        )}
      </div>

      {/* Title */}
      <p
        className="text-[15px] font-semibold mb-1.5 line-clamp-2"
        style={{ color: '#E8E8F0' }}
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
      {task.category && (
        <span
          className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium mb-2"
          style={{ backgroundColor: 'rgba(123,114,255,0.12)', color: '#7B72FF' }}
        >
          {CATEGORY_CONFIG[task.category].emoji} {CATEGORY_CONFIG[task.category].label}
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
          className="flex-1 h-9 rounded-xl text-[13px] font-medium"
          style={{
            backgroundColor: justCompleted ? 'rgba(78,205,196,0.2)' : 'rgba(78,205,196,0.12)',
            border: '1px solid rgba(78,205,196,0.35)',
            color: '#4ECDC4',
          }}
        >
          {justCompleted ? '✓ Done!' : '✓ Done'}
        </motion.button>
        <motion.button
          whileTap={shouldAnimate ? { scale: 0.97 } : undefined}
          onClick={() => onPark?.(task.id)}
          className="flex-1 h-9 rounded-xl text-[13px] font-medium"
          style={{ backgroundColor: '#252840', color: '#8B8BA7' }}
        >
          Park it →
        </motion.button>
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
  prev.index === next.index
);

export default TaskCard;
