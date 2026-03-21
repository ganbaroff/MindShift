import { motion } from 'motion/react';
import { useMotion } from '@/shared/hooks/useMotion';
import { useTranslation } from 'react-i18next';
import { ENERGY_EMOJI } from '@/shared/lib/constants';

const ENERGY_LABEL_KEYS = ['energy.drained', 'energy.low', 'energy.okay', 'energy.good', 'energy.wired'] as const;

interface EnergyPickerProps {
  selected: number;
  onSelect: (i: number) => void;
  size?: number;
}
export default function EnergyPicker({ selected, onSelect, size = 40 }: EnergyPickerProps) {
  const { shouldAnimate } = useMotion();
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between gap-1">
      {ENERGY_LABEL_KEYS.map((key, i) => {
        const active = selected === i;
        const label = t(key);
        return (
          <motion.button
            key={i}
            whileTap={shouldAnimate ? { scale: 0.97 } : undefined}
            onClick={() => onSelect(i)}
            aria-label={`${label} energy${active ? ' (selected)' : ''}`}
            aria-pressed={active}
            className="flex flex-col items-center gap-0.5 min-h-[44px] min-w-[44px]"
          >
            <motion.span
              animate={shouldAnimate ? (active ? { scale: 1.15 } : { scale: 1 }) : false}
              className="block"
              style={{
                fontSize: size,
                filter: active ? 'drop-shadow(0 0 8px rgba(123,114,255,0.5))' : 'none',
              }}
            >
              {ENERGY_EMOJI[i]}
            </motion.span>
            <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
