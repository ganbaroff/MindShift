import React from 'react'
import { motion } from 'motion/react'
import { useMotion } from '@/shared/hooks/useMotion'
import { useTranslation } from 'react-i18next'
import type { Community } from './useCommunity'

interface CommunityCardProps {
  community: Community
  isJoining: boolean
  onJoin: (c: Community) => void
}

export const CommunityCard = React.memo(function CommunityCard({
  community,
  isJoining,
  onJoin,
}: CommunityCardProps) {
  const { shouldAnimate, t: transition } = useMotion()
  const { t } = useTranslation()

  return (
    <motion.div
      initial={shouldAnimate ? { opacity: 0, y: 8 } : {}}
      animate={{ opacity: 1, y: 0 }}
      transition={shouldAnimate ? transition() : { duration: 0 }}
      className="rounded-2xl px-4 py-4"
      style={{ background: 'var(--color-surface-card)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {community.name}
          </p>
          <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
            {community.member_count} {community.member_count === 1 ? 'member' : 'members'}
          </p>
        </div>
        <button
          onClick={() => onJoin(community)}
          disabled={isJoining}
          aria-label={isJoining
            ? t('community.joiningLabel', { name: community.name, defaultValue: `Joining ${community.name}` })
            : t('community.joinLabel', { name: community.name, defaultValue: `Join ${community.name}` })
          }
          aria-busy={isJoining}
          className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150
                     focus-visible:ring-2 focus-visible:ring-[var(--color-teal)] focus-visible:outline-none
                     active:scale-95 disabled:opacity-50"
          style={{
            background: 'rgba(78,205,196,0.15)',
            border: '1px solid rgba(78,205,196,0.3)',
            color: 'var(--color-teal)',
          }}
        >
          {isJoining ? '…' : t('community.join', 'Join')}
        </button>
      </div>

      {community.constitution && (
        <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
          {community.constitution}
        </p>
      )}
    </motion.div>
  )
}, (prev, next) =>
  prev.community.id === next.community.id &&
  prev.community.member_count === next.community.member_count &&
  prev.isJoining === next.isJoining
)
