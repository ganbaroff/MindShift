/**
 * MochiAvatar — progress-stage mascot. Now the REAL capybara (Capy rig); the legacy
 * blob is retired. Progress raises the mood rather than bolting on accessories —
 * still "only grows, never degrades", ADHD-safe.
 */
import { useStore } from '@/store'
import { Capy, type CapyMood } from '@/shared/ui/Capy'

interface MochiAvatarProps {
  size?: number
}

function moodForProgress(completed: number): CapyMood {
  if (completed >= 50) return 'playful'
  if (completed >= 25) return 'happy'
  if (completed >= 10) return 'focused'
  return 'calm'
}

export default function MochiAvatar({ size = 48 }: MochiAvatarProps) {
  const completedTotal = useStore((s) => s.completedTotal)
  return <Capy mood={moodForProgress(completedTotal)} size={size} />
}
