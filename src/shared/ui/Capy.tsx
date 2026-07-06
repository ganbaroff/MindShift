/**
 * Capy / Mochi — MindShift's mascot rig. ROUND single-body capybara, cream skin.
 * Two variants share ONE rig:
 *   - 'mochi'  : the friendly cream anchor (default; used across the whole app).
 *   - 'grumpy' : the «Капибара Новости» co-host — cooler taupe fur, a permanent
 *                furrowed brow, and a "forced to work" coffee mug. Comedic foil.
 * Anger is read through brows + squint, never colour (NEVER RED — Foundation Law 1).
 * Pure SVG + motion/react, offline-first. The mouth is an isolated socket
 * (`mouthPath`) so a future viseme set drives lip-sync on either variant.
 */
import { motion } from 'motion/react'
import { useMotion } from '@/shared/hooks/useMotion'

export type CapyVariant = 'mochi' | 'grumpy'
export type CapyMood =
  | 'calm' | 'focused' | 'happy' | 'sleepy' | 'concerned' | 'playful' // mochi
  | 'annoyed' | 'angry' | 'unamused' | 'smug' // grumpy co-host
export type MascotState = 'idle' | 'focused' | 'celebrating' | 'resting' | 'low-energy' | 'encouraging'

const STATE_TO_MOOD: Record<MascotState, CapyMood> = {
  idle: 'calm',
  focused: 'focused',
  celebrating: 'happy',
  resting: 'sleepy',
  'low-energy': 'concerned',
  encouraging: 'playful',
}

type Palette = { body: string; shadow: string; belly: string; nose: string; stroke: string; cheek: string }

// Cream = friendly anchor. Taupe-grey = grumpy co-host (distinct at a glance, still warm-neutral, no red).
const PALETTES: Record<CapyVariant, Palette> = {
  mochi: { body: '#E9D9B5', shadow: '#CBB488', belly: '#F4EBD6', nose: '#5A4632', stroke: '#7A5C3A', cheek: 'rgba(231,140,120,0.30)' },
  grumpy: { body: '#A79E90', shadow: '#827A6C', belly: '#C3BBAD', nose: '#3A352E', stroke: '#564E43', cheek: 'rgba(231,140,120,0.30)' },
}

// Accent colours, variant-independent.
const A = { orange: '#F2994A', leaf: '#7BA05B', zzz: '#9A8358', sparkle: '#F2C94C', mug: '#ECECF2', steam: '#B9B4C9' }

type EyeKey = 'closed' | 'dots' | 'joy' | 'half' | 'soft' | 'narrow' | 'sideHalf'
type MouthKey = 'smile' | 'joySmile' | 'line' | 'flat' | 'frown' | 'smirk'
type BrowKey = 'angry' | 'flat' | 'smug'

const MOOD: Record<CapyMood, { eyes: EyeKey; mouth: MouthKey; cheeks: boolean; brows?: BrowKey; accent?: 'orange' | 'zzz' | 'sparkle' }> = {
  calm: { eyes: 'closed', mouth: 'smile', cheeks: true },
  focused: { eyes: 'dots', mouth: 'smile', cheeks: false },
  happy: { eyes: 'joy', mouth: 'joySmile', cheeks: true, accent: 'sparkle' },
  sleepy: { eyes: 'half', mouth: 'line', cheeks: false, accent: 'zzz' },
  concerned: { eyes: 'soft', mouth: 'smile', cheeks: false },
  playful: { eyes: 'closed', mouth: 'smile', cheeks: true, accent: 'orange' },
  annoyed: { eyes: 'narrow', mouth: 'flat', cheeks: false, brows: 'flat' },
  angry: { eyes: 'narrow', mouth: 'frown', cheeks: false, brows: 'angry' },
  unamused: { eyes: 'sideHalf', mouth: 'line', cheeks: false, brows: 'flat' },
  smug: { eyes: 'sideHalf', mouth: 'smirk', cheeks: false, brows: 'smug' },
}

// Face anchors on the round body: brows y~88, eyes y=100, nose 112, mouth 122.
function Brows({ kind, nose }: { kind?: BrowKey; nose: string }) {
  if (!kind) return null
  if (kind === 'angry') return <>
    <path d="M 74 87 L 91 93" stroke={nose} strokeWidth="3" fill="none" strokeLinecap="round" />
    <path d="M 126 87 L 109 93" stroke={nose} strokeWidth="3" fill="none" strokeLinecap="round" />
  </>
  if (kind === 'smug') return <>
    <path d="M 74 90 Q 82 84, 91 88" stroke={nose} strokeWidth="2.6" fill="none" strokeLinecap="round" />
    <path d="M 109 90 L 125 90" stroke={nose} strokeWidth="2.6" fill="none" strokeLinecap="round" />
  </>
  return <>
    <path d="M 75 90 L 90 90" stroke={nose} strokeWidth="2.6" fill="none" strokeLinecap="round" />
    <path d="M 110 90 L 125 90" stroke={nose} strokeWidth="2.6" fill="none" strokeLinecap="round" />
  </>
}

function Eyes({ kind, nose }: { kind: EyeKey; nose: string }) {
  switch (kind) {
    case 'dots':
      return <><circle cx="82" cy="100" r="3" fill={nose} /><circle cx="118" cy="100" r="3" fill={nose} /></>
    case 'joy':
      return <>
        <path d="M 76 102 Q 82 96, 88 102" stroke={nose} strokeWidth="2.6" fill="none" strokeLinecap="round" />
        <path d="M 112 102 Q 118 96, 124 102" stroke={nose} strokeWidth="2.6" fill="none" strokeLinecap="round" />
      </>
    case 'half':
      return <>
        <path d="M 76 100 Q 82 102, 88 100" stroke={nose} strokeWidth="2.6" fill="none" strokeLinecap="round" />
        <path d="M 112 100 Q 118 102, 124 100" stroke={nose} strokeWidth="2.6" fill="none" strokeLinecap="round" />
      </>
    case 'soft':
      return <>
        <circle cx="82" cy="101" r="2.8" fill={nose} /><circle cx="118" cy="101" r="2.8" fill={nose} />
        <path d="M 77 94 Q 82 92, 87 94" stroke={nose} strokeWidth="1.7" fill="none" strokeLinecap="round" opacity="0.7" />
        <path d="M 113 94 Q 118 92, 123 94" stroke={nose} strokeWidth="1.7" fill="none" strokeLinecap="round" opacity="0.7" />
      </>
    case 'narrow':
      return <>
        <path d="M 75 99 L 89 99" stroke={nose} strokeWidth="2.6" fill="none" strokeLinecap="round" />
        <path d="M 111 99 L 125 99" stroke={nose} strokeWidth="2.6" fill="none" strokeLinecap="round" />
        <circle cx="83" cy="102" r="2" fill={nose} /><circle cx="117" cy="102" r="2" fill={nose} />
      </>
    case 'sideHalf':
      return <>
        <path d="M 75 99 Q 82 97, 89 99" stroke={nose} strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <path d="M 111 99 Q 118 97, 125 99" stroke={nose} strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <circle cx="86" cy="101.5" r="2.4" fill={nose} /><circle cx="122" cy="101.5" r="2.4" fill={nose} />
      </>
    case 'closed':
    default:
      return <>
        <path d="M 76 100 Q 82 104, 88 100" stroke={nose} strokeWidth="2.6" fill="none" strokeLinecap="round" />
        <path d="M 112 100 Q 118 104, 124 100" stroke={nose} strokeWidth="2.6" fill="none" strokeLinecap="round" />
      </>
  }
}

function Mouth({ kind, override, nose }: { kind: MouthKey; override?: string; nose: string }) {
  if (override) return <path d={override} stroke={nose} strokeWidth="2" fill="none" strokeLinecap="round" />
  if (kind === 'joySmile') return <path d="M 92 121 Q 100 129, 108 121 Q 100 127, 92 121 Z" fill={nose} opacity="0.85" />
  if (kind === 'line') return <path d="M 95 122 L 105 122" stroke={nose} strokeWidth="2" fill="none" strokeLinecap="round" />
  if (kind === 'flat') return <path d="M 92 123 L 108 123" stroke={nose} strokeWidth="2" fill="none" strokeLinecap="round" />
  if (kind === 'frown') return <path d="M 92 126 Q 100 121, 108 126" stroke={nose} strokeWidth="2" fill="none" strokeLinecap="round" />
  if (kind === 'smirk') return <path d="M 93 124 Q 101 126, 108 120" stroke={nose} strokeWidth="2" fill="none" strokeLinecap="round" />
  return <path d="M 93 122 Q 100 127, 107 122" stroke={nose} strokeWidth="2" fill="none" strokeLinecap="round" />
}

function Accent({ kind, stroke }: { kind?: 'orange' | 'zzz' | 'sparkle'; stroke: string }) {
  if (kind === 'orange') return (
    <g>
      <ellipse cx="100" cy="44" rx="11" ry="10.5" fill={A.orange} stroke={stroke} strokeWidth="1.8" />
      <ellipse cx="96" cy="40" rx="3" ry="2" fill="#F8B978" opacity="0.7" />
      <path d="M 100 34 Q 104 30, 108 32 Q 105 36, 100 36 Z" fill={A.leaf} stroke={stroke} strokeWidth="1.4" strokeLinejoin="round" />
    </g>
  )
  if (kind === 'zzz') return (
    <g opacity="0.85">
      <text x="150" y="60" fontSize="15" fontWeight="700" fill={A.zzz}>z</text>
      <text x="159" y="49" fontSize="11" fontWeight="700" fill={A.zzz} opacity="0.7">z</text>
    </g>
  )
  if (kind === 'sparkle') return (
    <path d="M 154 56 L 157 62 L 163 64 L 157 66 L 154 72 L 151 66 L 145 64 L 151 62 Z" fill={A.sparkle} stroke={A.orange} strokeWidth="1.2" strokeLinejoin="round" />
  )
  return null
}

// Grumpy signature: the "they make us work" coffee mug, lower-right.
function CoffeeMug({ stroke }: { stroke: string }) {
  return (
    <g>
      <path d="M 147 128 q -3 -4 0 -8" stroke={A.steam} strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.55" />
      <path d="M 154 128 q 3 -4 0 -8" stroke={A.steam} strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.55" />
      <rect x="142" y="131" width="19" height="16" rx="3.5" fill={A.mug} stroke={stroke} strokeWidth="1.8" />
      <path d="M 161 135 q 7 0 7 5 q 0 5 -7 5" fill="none" stroke={stroke} strokeWidth="1.8" />
      <line x1="145" y1="135.5" x2="158" y2="135.5" stroke={stroke} strokeWidth="1.2" opacity="0.4" />
    </g>
  )
}

interface CapyProps {
  state?: MascotState
  mood?: CapyMood
  /** 'mochi' = friendly cream anchor (default). 'grumpy' = taupe co-host. */
  variant?: CapyVariant
  size?: number
  /** Viseme mouth path `d` (overrides mood mouth) — drives lip-sync. */
  mouthPath?: string
  label?: string
  className?: string
}

export function Capy({ state = 'idle', mood, variant = 'mochi', size = 96, mouthPath, label, className }: CapyProps) {
  const { shouldAnimate } = useMotion()
  const m = mood ?? (variant === 'grumpy' ? 'annoyed' : STATE_TO_MOOD[state])
  const cfg = MOOD[m]
  const p = PALETTES[variant]

  return (
    <motion.svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 200 200"
      role="img"
      aria-label={label ?? `${variant === 'grumpy' ? 'Grumpy capybara' : 'Mochi'} is ${m}`}
      animate={shouldAnimate ? { y: [0, -4, 0] } : {}}
      transition={shouldAnimate ? { duration: 2.6, repeat: Infinity, ease: 'easeInOut' } : {}}
    >
      {/* ground shadow */}
      <ellipse cx="100" cy="182" rx="50" ry="5" fill={p.stroke} opacity="0.10" />

      {/* ears (behind body) */}
      <ellipse cx="68" cy="66" rx="12" ry="14" fill={p.body} stroke={p.stroke} strokeWidth="2.2" />
      <ellipse cx="68" cy="67" rx="6" ry="7.5" fill={p.shadow} />
      <ellipse cx="132" cy="66" rx="12" ry="14" fill={p.body} stroke={p.stroke} strokeWidth="2.2" />
      <ellipse cx="132" cy="67" rx="6" ry="7.5" fill={p.shadow} />

      {/* ONE round body */}
      <ellipse cx="100" cy="112" rx="58" ry="55" fill={p.body} stroke={p.stroke} strokeWidth="2.4" />
      {/* belly highlight */}
      <ellipse cx="100" cy="126" rx="36" ry="26" fill={p.belly} opacity="0.45" />

      {/* cheeks */}
      {cfg.cheeks && (
        <>
          <ellipse cx="64" cy="116" rx="8" ry="4.5" fill={p.cheek} />
          <ellipse cx="136" cy="116" rx="8" ry="4.5" fill={p.cheek} />
        </>
      )}

      <Brows kind={cfg.brows} nose={p.nose} />
      <Eyes kind={cfg.eyes} nose={p.nose} />
      <ellipse cx="100" cy="112" rx="4" ry="2.8" fill={p.nose} />
      <Mouth kind={cfg.mouth} override={mouthPath} nose={p.nose} />
      <Accent kind={cfg.accent} stroke={p.stroke} />
      {variant === 'grumpy' && <CoffeeMug stroke={p.stroke} />}
    </motion.svg>
  )
}
