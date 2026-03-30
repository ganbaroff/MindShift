import type { EnergyLevel } from '@/types';

// Research #3: state-aware apps adapt to user's real-time neurological capacity.
// Mochi reacts when energy changes to acknowledge the shift, never judge.
const MOCHI_ENERGY_MESSAGES: Record<number, { text: string; emoji: string }[]> = {
  1: [
    { text: "One tiny thing today is enough.", emoji: '🌙' },
    { text: "Drained days happen. Take it slow.", emoji: '🛋️' },
    { text: "Low fuel? Park the big stuff.", emoji: '💤' },
  ],
  2: [
    { text: "Gentle energy — pick something easy.", emoji: '🌱' },
    { text: "Small moves count.", emoji: '🌿' },
    { text: "Not your sharpest day? Easy tasks still count.", emoji: '🍃' },
  ],
  3: [
    { text: "Steady energy. Good for focused work.", emoji: '🎯' },
    { text: "Okay energy is still energy.", emoji: '🙂' },
    { text: "Middle-ground day. Consistent work fits here.", emoji: '⚖️' },
  ],
  4: [
    { text: "Good energy. This is your window.", emoji: '✨' },
    { text: "Good day for something that matters.", emoji: '🚀' },
    { text: "Solid energy. Pick something real.", emoji: '🌊' },
  ],
  5: [
    { text: "High energy. Good time for deep work.", emoji: '⚡' },
    { text: "Peak energy. Try your hardest task.", emoji: '🔥' },
    { text: "Full tank. Pick something big.", emoji: '💪' },
  ],
};

export function getMochiMessage(energy: EnergyLevel): { text: string; emoji: string } {
  const pool = MOCHI_ENERGY_MESSAGES[energy] ?? MOCHI_ENERGY_MESSAGES[3];
  return pool[Math.floor(Math.random() * pool.length)];
}
