import { useEffect, useRef } from 'react'
import { motion } from 'motion/react'
import { useMotion } from '@/shared/hooks/useMotion'

// Research #8: #FF6B6B (coral) removed — red spectrum triggers RSD even in celebrations
// Replaced with #F59E0B amber + soft indigo variant — still festive, zero anxiety
const COLORS = ['#6C63FF', '#4ECDC4', '#F59E0B', '#A8EDEA', '#8B85FF']
const PARTICLE_COUNT = 20

interface Particle {
  id: number
  x: number
  y: number
  color: string
  size: number
  angle: number
  speed: number
}

interface ConfettiProps {
  active: boolean
  onComplete?: () => void
}

export function Confetti({ active, onComplete }: ConfettiProps) {
  const { shouldAnimate } = useMotion()
  const particles = useRef<Particle[]>([])

  useEffect(() => {
    if (active && shouldAnimate) {
      particles.current = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
        id: i,
        x: 50 + (Math.random() - 0.5) * 40,
        y: 50,
        color: COLORS[i % COLORS.length],
        size: 6 + Math.random() * 6,
        angle: Math.random() * 360,
        speed: 0.5 + Math.random() * 1.5,
      }))
    }
  }, [active, shouldAnimate])

  if (!active || !shouldAnimate) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {particles.current.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-sm"
          initial={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            opacity: 1,
            rotate: 0,
          }}
          animate={{
            top: `${p.y + 30 + Math.random() * 30}%`,
            left: `${p.x + (Math.random() - 0.5) * 20}%`,
            opacity: 0,
            rotate: p.angle,
            scale: 0,
          }}
          transition={{ duration: 0.6 + Math.random() * 0.4, ease: 'easeOut' }}
          style={{ background: p.color }}
          onAnimationComplete={p.id === 0 ? onComplete : undefined}
        />
      ))}
    </div>
  )
}
