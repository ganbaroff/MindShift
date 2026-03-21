/**
 * MochiAvatar — mascot with visual evolution based on user progress.
 *
 * Stages (by completedTotal):
 *   0-2:   Seedling — small, simple, no accessories
 *   3-9:   Sprout — slightly bigger eyes, blush cheeks
 *   10-24: Grower — star sparkle, wider smile
 *   25-49: Bloomer — crown/halo, confident eyes
 *   50+:   Flourisher — full glow, all accessories
 *
 * Never degrades. Only grows. ADHD-safe — no punishment for inactivity.
 */

import { useStore } from '@/store'

interface MochiAvatarProps {
  size?: number
}

type Stage = 'seedling' | 'sprout' | 'grower' | 'bloomer' | 'flourisher'

function getStage(completed: number): Stage {
  if (completed >= 50) return 'flourisher'
  if (completed >= 25) return 'bloomer'
  if (completed >= 10) return 'grower'
  if (completed >= 3) return 'sprout'
  return 'seedling'
}

export default function MochiAvatar({ size = 48 }: MochiAvatarProps) {
  const completedTotal = useStore(s => s.completedTotal)
  const stage = getStage(completedTotal)

  const hasBlush = stage !== 'seedling'
  const hasStar = stage === 'grower' || stage === 'bloomer' || stage === 'flourisher'
  const hasCrown = stage === 'bloomer' || stage === 'flourisher'
  const hasGlow = stage === 'flourisher'
  const smileWidth = stage === 'seedling' ? 'M 18 27 Q 22 30 26 27' : 'M 16 27 Q 22 32 28 27'

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="mochiGrad" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#7B72FF" />
          <stop offset="100%" stopColor="#4ECDC4" />
        </radialGradient>
      </defs>

      {/* Glow ring (flourisher) */}
      {hasGlow && (
        <ellipse
          cx="22" cy="23" rx="21" ry="20"
          fill="none"
          stroke="rgba(78,205,196,0.2)"
          strokeWidth="1.5"
        />
      )}

      {/* Crown (bloomer+) */}
      {hasCrown && (
        <g opacity="0.9">
          <polygon points="18,9 22,3 26,9" fill="#F59E0B" />
          <circle cx="22" cy="4" r="1.5" fill="#F59E0B" />
        </g>
      )}

      {/* Blob body */}
      <ellipse cx="22" cy="23" rx="18" ry="17" fill="url(#mochiGrad)" opacity="0.9" />

      {/* Eyes */}
      <circle cx="16" cy="20" r="2.5" fill="#fff" />
      <circle cx="28" cy="20" r="2.5" fill="#fff" />
      <circle cx="17" cy="20.5" r="1.2" fill="#1E2136" />
      <circle cx="29" cy="20.5" r="1.2" fill="#1E2136" />

      {/* Blush cheeks (sprout+) */}
      {hasBlush && (
        <>
          <circle cx="12" cy="25" r="3" fill="rgba(255,150,150,0.2)" />
          <circle cx="32" cy="25" r="3" fill="rgba(255,150,150,0.2)" />
        </>
      )}

      {/* Smile */}
      <path
        d={smileWidth}
        stroke="#fff"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />

      {/* Star sparkle (grower+) */}
      {hasStar && (
        <g opacity="0.7">
          <polygon points="36,10 37,7 38,10 41,11 38,12 37,15 36,12 33,11" fill="#F59E0B" />
        </g>
      )}
    </svg>
  )
}
