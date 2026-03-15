import { motion } from 'framer-motion';
import type { MockTask, Difficulty } from '@/lib/mock-data';
import { difficultyConfig } from '@/lib/mock-data';

interface TaskCardProps {
  task: MockTask;
  index?: number;
  onDone?: (id: string) => void;
  onPark?: (id: string) => void;
}

function DifficultyDots({ difficulty }: { difficulty: Difficulty }) {
  const config = difficultyConfig[difficulty];
  return (
    <div className="flex gap-0.5 items-center">
      {Array.from({ length: config.dots }).map((_, i) => (
        <div
          key={i}
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: config.color }}
        />
      ))}
    </div>
  );
}

export default function TaskCard({ task, index = 0, onDone, onPark }: TaskCardProps) {
  const config = difficultyConfig[task.difficulty];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-2xl p-3 overflow-hidden"
      style={{
        backgroundColor: '#1E2136',
        borderLeft: `3px solid ${config.color}`,
      }}
    >
      {/* Header row */}
      <div className="flex items-center gap-2 mb-1.5">
        <DifficultyDots difficulty={task.difficulty} />
        {task.pool !== 'now' && (
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
            style={{ backgroundColor: 'rgba(123,114,255,0.15)', color: '#7B72FF' }}
          >
            {task.pool.toUpperCase()}
          </span>
        )}
        {task.estimatedMinutes && (
          <span className="text-[11px] ml-auto" style={{ color: '#8B8BA7' }}>
            {task.estimatedMinutes}m
          </span>
        )}
        {task.hasIdea && <span className="text-[13px]">💡</span>}
        {task.hasReminder && <span className="text-[13px]">🔔</span>}
        {task.isCarryOver && (
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
        className="text-[15px] font-semibold mb-2.5 line-clamp-2"
        style={{ color: '#E8E8F0' }}
      >
        {task.title}
      </p>

      {/* Actions */}
      <div className="flex gap-2">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => onDone?.(task.id)}
          className="flex-1 h-9 rounded-xl text-[13px] font-medium"
          style={{
            backgroundColor: 'rgba(78,205,196,0.12)',
            border: '1px solid rgba(78,205,196,0.35)',
            color: '#4ECDC4',
          }}
        >
          ✓ Done
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.97 }}
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
