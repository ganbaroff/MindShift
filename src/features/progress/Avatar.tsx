/**
 * Avatar — SVG plant evolution (6 stages)
 *
 * Replaces emoji avatars (🌱→🌳) with geometric SVG illustrations
 * that match MindShift's indigo/teal design language.
 *
 * Each stage has:
 * - Unique SVG illustration (seedling → oak)
 * - Idle animation: gentle sway (respects reduced-motion)
 * - Gradient fills using design tokens (#7B72FF → #4ECDC4)
 *
 * ADR: Avatar NEVER regresses — always shows current or happy state.
 */

import { motion } from 'motion/react'
import { useMotion } from '@/shared/hooks/useMotion'

interface AvatarProps {
  level: number
  size?: number  // px, default 64
}

const STAGE_NAMES = ['Seedling', 'Sprout', 'Sapling', 'Bloom', 'Tree', 'Oak'] as const

/** Returns stage index 0-5 based on level */
function stageFromLevel(level: number): number {
  return Math.min(Math.max(level - 1, 0), 5)
}

// ── SVG Stage Illustrations ───────────────────────────────────────────────────

function SeedlingSvg({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} fill="none">
      {/* Soil */}
      <ellipse cx="32" cy="52" rx="20" ry="4" fill="#3D3250" />
      {/* Stem */}
      <path d="M32 50V38" stroke="#4ECDC4" strokeWidth="2.5" strokeLinecap="round" />
      {/* First leaf */}
      <path d="M32 42C28 38 26 34 30 32C34 30 34 36 32 42Z" fill="#4ECDC4" opacity="0.8" />
      {/* Tiny second leaf */}
      <path d="M32 40C36 37 38 34 34 33C30 32 31 37 32 40Z" fill="#7B72FF" opacity="0.6" />
    </svg>
  )
}

function SproutSvg({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} fill="none">
      <ellipse cx="32" cy="54" rx="22" ry="4" fill="#3D3250" />
      {/* Stem */}
      <path d="M32 52V30" stroke="#4ECDC4" strokeWidth="2.5" strokeLinecap="round" />
      {/* Left leaf */}
      <path d="M32 38C24 32 20 26 26 22C32 18 32 30 32 38Z" fill="#4ECDC4" opacity="0.8" />
      {/* Right leaf */}
      <path d="M32 34C40 28 44 22 38 18C32 14 32 26 32 34Z" fill="#7B72FF" opacity="0.7" />
      {/* Top bud */}
      <circle cx="32" cy="28" r="3" fill="#4ECDC4" opacity="0.9" />
    </svg>
  )
}

function SaplingSvg({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} fill="none">
      <ellipse cx="32" cy="56" rx="24" ry="4" fill="#3D3250" />
      {/* Trunk */}
      <path d="M32 54V24" stroke="#7B72FF" strokeWidth="3" strokeLinecap="round" />
      {/* Left branch */}
      <path d="M32 36L22 26" stroke="#7B72FF" strokeWidth="2" strokeLinecap="round" />
      {/* Right branch */}
      <path d="M32 30L42 22" stroke="#7B72FF" strokeWidth="2" strokeLinecap="round" />
      {/* Leaves cluster - left */}
      <circle cx="20" cy="24" r="5" fill="#4ECDC4" opacity="0.7" />
      <circle cx="24" cy="20" r="4" fill="#4ECDC4" opacity="0.8" />
      {/* Leaves cluster - right */}
      <circle cx="44" cy="20" r="5" fill="#4ECDC4" opacity="0.7" />
      <circle cx="40" cy="16" r="4" fill="#7B72FF" opacity="0.5" />
      {/* Top crown */}
      <circle cx="32" cy="20" r="6" fill="#4ECDC4" opacity="0.6" />
    </svg>
  )
}

function BloomSvg({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} fill="none">
      <defs>
        <radialGradient id="bloom-glow" cx="50%" cy="40%" r="50%">
          <stop offset="0%" stopColor="#FFE66D" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#FFE66D" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="32" cy="56" rx="24" ry="4" fill="#3D3250" />
      {/* Glow behind flower */}
      <circle cx="32" cy="22" r="16" fill="url(#bloom-glow)" />
      {/* Trunk */}
      <path d="M32 54V28" stroke="#7B72FF" strokeWidth="3" strokeLinecap="round" />
      {/* Branches */}
      <path d="M32 40L20 32" stroke="#7B72FF" strokeWidth="2" strokeLinecap="round" />
      <path d="M32 36L44 28" stroke="#7B72FF" strokeWidth="2" strokeLinecap="round" />
      {/* Crown */}
      <circle cx="18" cy="30" r="5" fill="#4ECDC4" opacity="0.7" />
      <circle cx="46" cy="26" r="5" fill="#4ECDC4" opacity="0.7" />
      <circle cx="32" cy="22" r="7" fill="#4ECDC4" opacity="0.6" />
      {/* Flowers */}
      <circle cx="26" cy="18" r="3" fill="#FFE66D" opacity="0.9" />
      <circle cx="38" cy="16" r="3" fill="#FFE66D" opacity="0.9" />
      <circle cx="32" cy="14" r="2.5" fill="#FFE66D" opacity="0.7" />
    </svg>
  )
}

function TreeSvg({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} fill="none">
      <defs>
        <linearGradient id="tree-crown" x1="16" y1="8" x2="48" y2="36">
          <stop offset="0%" stopColor="#4ECDC4" />
          <stop offset="100%" stopColor="#7B72FF" />
        </linearGradient>
      </defs>
      <ellipse cx="32" cy="58" rx="26" ry="4" fill="#3D3250" />
      {/* Trunk */}
      <path d="M32 56V32" stroke="#7B72FF" strokeWidth="4" strokeLinecap="round" />
      {/* Full crown */}
      <ellipse cx="32" cy="22" rx="18" ry="16" fill="url(#tree-crown)" opacity="0.7" />
      <ellipse cx="26" cy="18" rx="10" ry="10" fill="#4ECDC4" opacity="0.5" />
      <ellipse cx="38" cy="16" rx="10" ry="10" fill="#7B72FF" opacity="0.3" />
      {/* Fruit/flowers */}
      <circle cx="22" cy="22" r="2" fill="#FFE66D" opacity="0.9" />
      <circle cx="42" cy="18" r="2" fill="#FFE66D" opacity="0.9" />
      <circle cx="32" cy="12" r="2" fill="#FFE66D" opacity="0.8" />
    </svg>
  )
}

function OakSvg({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} fill="none">
      <defs>
        <linearGradient id="oak-crown" x1="10" y1="6" x2="54" y2="40">
          <stop offset="0%" stopColor="#7B72FF" />
          <stop offset="50%" stopColor="#4ECDC4" />
          <stop offset="100%" stopColor="#FFE66D" />
        </linearGradient>
        <radialGradient id="oak-glow" cx="50%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#7B72FF" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#7B72FF" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Background glow */}
      <circle cx="32" cy="24" r="28" fill="url(#oak-glow)" />
      <ellipse cx="32" cy="58" rx="28" ry="4" fill="#3D3250" />
      {/* Trunk */}
      <path d="M32 56V30" stroke="#7B72FF" strokeWidth="5" strokeLinecap="round" />
      <path d="M30 42L18 34" stroke="#7B72FF" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M34 38L46 30" stroke="#7B72FF" strokeWidth="2.5" strokeLinecap="round" />
      {/* Majestic crown */}
      <ellipse cx="32" cy="20" rx="22" ry="18" fill="url(#oak-crown)" opacity="0.6" />
      <ellipse cx="22" cy="16" rx="12" ry="12" fill="#4ECDC4" opacity="0.4" />
      <ellipse cx="42" cy="14" rx="12" ry="12" fill="#7B72FF" opacity="0.3" />
      <ellipse cx="32" cy="10" rx="14" ry="10" fill="#4ECDC4" opacity="0.3" />
      {/* Golden fruits */}
      <circle cx="18" cy="20" r="2.5" fill="#FFE66D" opacity="0.9" />
      <circle cx="46" cy="16" r="2.5" fill="#FFE66D" opacity="0.9" />
      <circle cx="28" cy="10" r="2" fill="#FFE66D" opacity="0.8" />
      <circle cx="38" cy="8" r="2" fill="#FFE66D" opacity="0.8" />
      <circle cx="32" cy="26" r="2" fill="#FFE66D" opacity="0.7" />
    </svg>
  )
}

const STAGE_COMPONENTS = [SeedlingSvg, SproutSvg, SaplingSvg, BloomSvg, TreeSvg, OakSvg]

// ── Exported Avatar component ─────────────────────────────────────────────────

export default function Avatar({ level, size = 64 }: AvatarProps) {
  const stage = stageFromLevel(level)
  const StageSvg = STAGE_COMPONENTS[stage]
  const { shouldAnimate } = useMotion()

  return (
    <motion.div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
      animate={shouldAnimate ? { rotate: [0, 1, -1, 0.5, 0] } : {}}
      transition={{
        duration: 6,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      <StageSvg size={size} />
    </motion.div>
  )
}

export { STAGE_NAMES, stageFromLevel }
