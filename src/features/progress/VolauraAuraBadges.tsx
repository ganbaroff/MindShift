import { motion } from 'motion/react'
import { useMotion } from '@/shared/hooks/useMotion'
import type { CharacterState } from '@/shared/lib/volaura-bridge'

interface VolauraAuraBadgesProps {
  auraState: CharacterState
}

export function VolauraAuraBadges({ auraState }: VolauraAuraBadgesProps) {
  const { shouldAnimate } = useMotion()

  if (auraState.verified_skills.length === 0) return null

  return (
    <motion.div
      initial={shouldAnimate ? { opacity: 0, y: 12 } : false}
      animate={shouldAnimate ? { opacity: 1, y: 0 } : false}
      transition={shouldAnimate ? { delay: 0.16 } : undefined}
      className="rounded-2xl p-4"
      style={{
        backgroundColor: 'var(--color-surface-card)',
        border: '1px solid rgba(78,205,196,0.15)',
      }}
    >
      <p
        className="text-[11px] uppercase tracking-widest mb-3"
        style={{ color: 'var(--color-teal)' }}
      >
        VOLAURA AURA
      </p>
      <div className="flex flex-wrap gap-2">
        {auraState.verified_skills.map(skill => {
          const tierEmoji =
            skill.badge_tier === 'platinum' ? '💎' :
            skill.badge_tier === 'gold' ? '🥇' :
            skill.badge_tier === 'silver' ? '🥈' :
            skill.badge_tier === 'bronze' ? '🥉' : ''
          return (
            <div
              key={skill.skill_slug}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px]"
              style={{
                backgroundColor: 'rgba(78,205,196,0.08)',
                border: '1px solid rgba(78,205,196,0.15)',
                color: 'var(--color-text-primary)',
              }}
            >
              <span>{tierEmoji}</span>
              <span className="capitalize">{skill.skill_slug.replace(/_/g, ' ')}</span>
              <span style={{ color: 'var(--color-teal)' }}>{Math.round(skill.aura_score)}</span>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}
