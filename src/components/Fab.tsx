import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';

interface FabProps {
  onClick: () => void;
  label?: string;
}

export default function Fab({ onClick, label = 'Add task' }: FabProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      aria-label={label}
      className="fixed bottom-24 right-5 flex items-center gap-2 px-5 h-12 rounded-full gradient-primary shadow-primary z-20 focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none"
      style={{ color: '#fff' }}
    >
      <Plus size={18} strokeWidth={2.5} />
      <span className="text-[14px] font-semibold">{label}</span>
    </motion.button>
  );
}
