import { motion } from 'motion/react';
import { useMotion } from '@/shared/hooks/useMotion';
import { useTranslation } from 'react-i18next';
import type { Task } from '@/types';

interface DailyBriefCardProps {
  emoji: string;
  text: string;
  topTask: Task | null;
  onDismiss: () => void;
}

export function DailyBriefCard({ emoji, text, topTask, onDismiss }: DailyBriefCardProps) {
  const { shouldAnimate } = useMotion();
  const { t } = useTranslation();

  return (
    <motion.div
      initial={shouldAnimate ? { opacity: 0, y: 8 } : false}
      animate={shouldAnimate ? { opacity: 1, y: 0 } : false}
      exit={shouldAnimate ? { opacity: 0, height: 0 } : undefined}
      className="rounded-2xl p-3"
      style={{ backgroundColor: 'var(--color-surface-card)', border: '1px solid rgba(123,114,255,0.12)' }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          <span className="text-[18px] shrink-0">{emoji}</span>
          <p className="text-[13px] leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>
            {text}
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="text-[11px] shrink-0 mt-0.5"
          style={{ color: 'var(--color-text-muted)' }}
          aria-label="Dismiss daily brief"
        >
          ✕
        </button>
      </div>
      {topTask && (
        <div
          className="mt-2 pt-2 flex items-center gap-2"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{t('home.startWith')}</span>
          <span className="text-[12px] font-medium truncate" style={{ color: 'var(--color-primary)' }}>
            {topTask.title}
          </span>
        </div>
      )}
    </motion.div>
  );
}
