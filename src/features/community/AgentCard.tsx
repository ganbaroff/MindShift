import React from 'react'
import { motion } from 'motion/react'
import { useMotion } from '@/shared/hooks/useMotion'
import { useTranslation } from 'react-i18next'
import type { CommunityAgent } from './useCommunity'

const AGENT_STATE_COLOR: Record<string, string> = {
  idle:       'var(--color-text-muted)',
  listening:  'var(--color-teal)',
  working:    'var(--color-primary)',
  recovering: 'var(--color-gold)',
  offline:    'var(--color-text-muted)',
}

const RANK_LABEL: Record<string, string> = {
  PROBATIONARY: 'New',
  MEMBER:       'Member',
  SENIOR:       'Senior',
  LEAD:         'Lead',
  QUARANTINE:   'Review',
}

interface AgentCardProps {
  agent: CommunityAgent
  onChat?: (agent: CommunityAgent) => void
}

export const AgentCard = React.memo(function AgentCard({ agent, onChat }: AgentCardProps) {
  const { shouldAnimate, t: transition } = useMotion()
  const { t } = useTranslation()
  const stateColor = AGENT_STATE_COLOR[agent.state] ?? 'var(--color-text-muted)'

  return (
    <motion.div
      initial={shouldAnimate ? { opacity: 0, x: -8 } : {}}
      animate={{ opacity: 1, x: 0 }}
      transition={shouldAnimate ? transition() : { duration: 0 }}
      className="rounded-2xl px-4 py-3 flex items-center gap-3"
      style={{ background: 'var(--color-surface-card)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Avatar + state dot */}
      <div className="relative shrink-0">
        <div
          aria-hidden="true"
          className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
          style={{ background: 'var(--color-surface-raised)' }}
        >
          🤖
        </div>
        {/* State dot — decorative; state conveyed by text label below */}
        <div
          aria-hidden="true"
          className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2"
          style={{ background: stateColor, borderColor: 'var(--color-surface-card)' }}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {agent.display_name}
          </p>
          {agent.tier === 'PRO' && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
              style={{ background: 'var(--color-gold-alpha)', color: 'var(--color-gold)' }}
            >
              PRO
            </span>
          )}
        </div>
        <p className="text-[11px] truncate" style={{ color: 'var(--color-text-muted)' }}>
          {agent.personality.catchphrase}
        </p>
      </div>

      <div className="text-right shrink-0 flex flex-col items-end gap-1">
        {/* Use text-primary so contrast passes at 10px (APCA Lc 60+) */}
        <p className="text-[10px]" style={{ color: 'var(--color-text-primary)' }}>
          {agent.state}
        </p>
        <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
          {RANK_LABEL[agent.rank] ?? agent.rank}
        </p>
        {onChat && agent.state !== 'offline' && (
          <button
            onClick={() => onChat(agent)}
            aria-label={t('community.chatWith', { name: agent.display_name, defaultValue: `Chat with ${agent.display_name}` })}
            className="text-[10px] px-2 py-0.5 rounded-full font-medium mt-0.5
                       focus-visible:ring-2 focus-visible:ring-[var(--color-teal)] focus-visible:outline-none
                       active:scale-95 transition-all duration-150"
            style={{
              background: 'rgba(78,205,196,0.12)',
              border: '1px solid rgba(78,205,196,0.25)',
              color: 'var(--color-teal)',
            }}
          >
            {t('community.chatBtn', 'Chat')}
          </button>
        )}
      </div>
    </motion.div>
  )
}, (prev, next) =>
  prev.agent.id === next.agent.id &&
  prev.agent.state === next.agent.state &&
  prev.agent.rank === next.agent.rank &&
  prev.onChat === next.onChat,
)
