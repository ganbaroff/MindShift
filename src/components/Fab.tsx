import { motion } from 'motion/react';
import { Plus } from 'lucide-react';
import { useMotion } from '@/shared/hooks/useMotion';
import { useTranslation } from 'react-i18next';

interface FabProps {
  onClick: () => void;
  label?: string;
}

export default function Fab({ onClick, label }: FabProps) {
  const { shouldAnimate } = useMotion();
  const { t } = useTranslation();
  const displayLabel = label ?? t('tasks.addTask');
  return (
    <motion.button
      whileTap={shouldAnimate ? { scale: 0.97 } : undefined}
      onClick={onClick}
      aria-label={displayLabel}
      className="fixed bottom-24 right-5 flex items-center gap-2 px-5 h-12 rounded-full gradient-primary shadow-primary z-20 focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none"
      style={{ color: '#fff' }}
    >
      <Plus size={18} strokeWidth={2.5} />
      <span className="text-[14px] font-semibold">{displayLabel}</span>
    </motion.button>
  );
}
