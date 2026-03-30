import { motion } from 'motion/react';
import { useMotion } from '@/shared/hooks/useMotion';
import { useTranslation } from 'react-i18next';
import { useUITone } from '@/shared/hooks/useUITone';

interface StreakBadgeProps {
  currentStreak: number;
  longestStreak: number;
}

export function StreakBadge({ currentStreak, longestStreak }: StreakBadgeProps) {
  const { shouldAnimate } = useMotion();
  const { copy } = useUITone();
  const { t } = useTranslation();

  return (
    <motion.div
      initial={shouldAnimate ? { opacity: 0, height: 0 } : false}
      animate={shouldAnimate ? { opacity: 1, height: 'auto' } : false}
      exit={shouldAnimate ? { opacity: 0, height: 0 } : undefined}
      className="overflow-hidden"
    >
      <div
        className="rounded-2xl px-4 py-2.5 flex items-center gap-3"
        style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}
      >
        <span className="text-[20px]">🔥</span>
        <div>
          <p className="text-[13px] font-semibold" style={{ color: 'var(--color-gold)' }}>
            {copy.streakGoing(currentStreak)}
          </p>
          {longestStreak > currentStreak && (
            <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{t('home.best', { count: longestStreak })}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
