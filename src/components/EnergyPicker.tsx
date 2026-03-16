import { motion } from 'framer-motion';
import { ENERGY_LABELS, ENERGY_EMOJI } from '@/shared/lib/constants';

const energyOptions = ENERGY_LABELS.map((label, i) => ({ emoji: ENERGY_EMOJI[i], label }));

interface EnergyPickerProps {
  selected: number;
  onSelect: (i: number) => void;
  size?: number;
}
export default function EnergyPicker({ selected, onSelect, size = 40 }: EnergyPickerProps) {
  return (
    <div className="flex items-center justify-between gap-1">
      {energyOptions.map((opt, i) => {
        const active = selected === i;
        return (
          <motion.button
            key={i}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSelect(i)}
            aria-label={`${opt.label} energy${active ? ' (selected)' : ''}`}
            aria-pressed={active}
            className="flex flex-col items-center gap-0.5"
          >
            <motion.span
              animate={active ? { scale: 1.15 } : { scale: 1 }}
              className="block"
              style={{
                fontSize: size,
                filter: active ? 'drop-shadow(0 0 8px rgba(123,114,255,0.5))' : 'none',
              }}
            >
              {opt.emoji}
            </motion.span>
            <span className="text-[10px]" style={{ color: '#8B8BA7' }}>{opt.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
