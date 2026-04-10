import React from 'react'
import { motion } from 'motion/react'
import { useMotion } from '@/shared/hooks/useMotion'
import type { Membership } from './useCommunity'

export const MembershipCard = React.memo(function MembershipCard({ membership }: { membership: Membership }) {
  const { shouldAnimate, t: transition } = useMotion()

  return (
    <motion.div
      initial={shouldAnimate ? { opacity: 0, x: -8 } : {}}
      animate={{ opacity: 1, x: 0 }}
      transition={shouldAnimate ? transition() : { duration: 0 }}
      className="rounded-2xl px-4 py-3 flex items-center gap-3"
      style={{ background: 'var(--color-surface-card)', border: '1px solid rgba(123,114,255,0.15)' }}
    >
      {/* Decorative avatar — role/shareholder conveyed by text below */}
      <div
        aria-hidden="true"
        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
        style={{ background: 'rgba(123,114,255,0.15)', color: 'var(--color-primary)' }}
      >
        {membership.is_shareholder ? '⬡' : membership.role[0]}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
          {membership.community_name}
        </p>
        <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
          {membership.tier} · {membership.role}
          {membership.is_shareholder ? ' · Shareholder' : ''}
        </p>
      </div>

      <div
        aria-label={`Member badge ${membership.badge_id.slice(0, 6)}`}
        className="text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0"
        style={{ background: 'rgba(123,114,255,0.12)', color: 'var(--color-primary)' }}
      >
        #{membership.badge_id.slice(0, 6)}
      </div>
    </motion.div>
  )
}, (prev, next) =>
  prev.membership.community_id === next.membership.community_id &&
  prev.membership.role === next.membership.role &&
  prev.membership.is_shareholder === next.membership.is_shareholder
)
