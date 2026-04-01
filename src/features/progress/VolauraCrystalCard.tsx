import { motion } from 'motion/react'
import { useMotion } from '@/shared/hooks/useMotion'
import type { CharacterState } from '@/shared/lib/volaura-bridge'

interface VolauraCrystalCardProps {
  auraState: CharacterState
}

export function VolauraCrystalCard({ auraState }: VolauraCrystalCardProps) {
  const { shouldAnimate } = useMotion()

  if (auraState.crystal_balance <= 0) return null

  return (
    <motion.div
      initial={shouldAnimate ? { opacity: 0, y: 12 } : false}
      animate={shouldAnimate ? { opacity: 1, y: 0 } : false}
      transition={shouldAnimate ? { delay: 0.15 } : undefined}
      className="rounded-2xl p-3 flex items-center justify-between"
      style={{
        background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(78,205,196,0.04))',
        border: '1px solid rgba(245,158,11,0.18)',
      }}
    >
      <div>
        <p
          className="text-[11px] uppercase tracking-widest mb-0.5"
          style={{ color: 'var(--color-gold)' }}
        >
          VOLAURA
        </p>
        <p className="text-[20px] font-bold" style={{ color: 'var(--color-gold)' }}>
          💎 {auraState.crystal_balance}
        </p>
        <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
          crystals earned
        </p>
      </div>
      {auraState.login_streak > 0 && (
        <div className="text-right">
          <p className="text-[18px] font-bold" style={{ color: 'var(--color-teal)' }}>
            {auraState.login_streak}
          </p>
          <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>day streak</p>
        </div>
      )}
    </motion.div>
  )
}
