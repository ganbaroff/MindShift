/**
 * CommunityScreen — Sprint AG-2
 *
 * Shows:
 * - User's memberships (with badge + role)
 * - Public OPEN communities to join
 * - Public agents roster (FREE tier visible to all)
 *
 * Design rules:
 * - No red (Rule 1). ADHD-safe palette: teal/indigo/gold.
 * - Shame-free: "Join" not "Unlock". No pressure copy.
 * - One primary action per section (Rule 5).
 * - All animations via useMotion (Rule 2).
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useMotion } from '@/shared/hooks/useMotion'
import { useCommunity } from './useCommunity'
import type { Community, Membership, CommunityAgent } from './useCommunity'

// -- Agent state color (no red) ------------------------------------------------
const AGENT_STATE_COLOR: Record<string, string> = {
  idle:       'var(--color-text-muted)',
  listening:  'var(--color-teal)',
  working:    'var(--color-primary)',
  recovering: '#F59E0B',
  offline:    'var(--color-text-muted)',
}

const RANK_LABEL: Record<string, string> = {
  PROBATIONARY: 'New',
  MEMBER:       'Member',
  SENIOR:       'Senior',
  LEAD:         'Lead',
  QUARANTINE:   'Review',
}

// -- Component -----------------------------------------------------------------

export function CommunityScreen() {
  const { shouldAnimate, t: transition } = useMotion()
  const { t } = useTranslation()
  const {
    openCommunities,
    memberships,
    agents,
    crystalBalance,
    isLoading,
    joinCommunity,
  } = useCommunity()

  const [joiningId, setJoiningId]   = useState<string | null>(null)
  const [joinError, setJoinError]   = useState<string | null>(null)
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null)

  async function handleJoin(community: Community) {
    setJoiningId(community.id)
    setJoinError(null)
    setJoinSuccess(null)
    const result = await joinCommunity(community.id)
    setJoiningId(null)
    if (result.success) {
      setJoinSuccess(community.name)
      setTimeout(() => setJoinSuccess(null), 3000)
    } else {
      setJoinError(result.error ?? 'Something went wrong')
      setTimeout(() => setJoinError(null), 4000)
    }
  }

  const joinedIds = new Set(memberships.map(m => m.community_id))

  return (
    <div
      className="flex flex-col min-h-screen px-4 pt-6 pb-24"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* Header */}
      <motion.div
        initial={shouldAnimate ? { opacity: 0, y: -8 } : {}}
        animate={{ opacity: 1, y: 0 }}
        transition={transition()}
        className="mb-6"
      >
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
          {t('community.title', 'Community')}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
          {t('community.subtitle', 'Agents and people who focus together.')}
        </p>
      </motion.div>

      {/* Crystal balance strip */}
      <motion.div
        initial={shouldAnimate ? { opacity: 0 } : {}}
        animate={{ opacity: 1 }}
        transition={transition()}
        className="flex gap-3 mb-6"
      >
        <div
          className="flex-1 rounded-2xl px-4 py-3 flex items-center gap-2"
          style={{ background: 'var(--color-surface-card)', border: '1px solid rgba(78,205,196,0.15)' }}
        >
          <span className="text-lg">💎</span>
          <div>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {t('community.focusCrystals', 'Focus')}
            </p>
            <p className="text-lg font-bold" style={{ color: 'var(--color-teal)' }}>
              {crystalBalance.focus.toLocaleString()}
            </p>
          </div>
        </div>
        <div
          className="flex-1 rounded-2xl px-4 py-3 flex items-center gap-2"
          style={{ background: 'var(--color-surface-card)', border: '1px solid rgba(123,114,255,0.15)' }}
        >
          <span className="text-lg">🌟</span>
          <div>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {t('community.shareCrystals', 'Share')}
            </p>
            <p className="text-lg font-bold" style={{ color: 'var(--color-primary)' }}>
              {crystalBalance.share.toLocaleString()}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Toast: join result */}
      <AnimatePresence>
        {(joinError || joinSuccess) && (
          <motion.div
            initial={shouldAnimate ? { opacity: 0, y: -8 } : {}}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={transition()}
            className="mb-4 px-4 py-3 rounded-2xl text-sm font-medium"
            style={{
              background: joinSuccess
                ? 'rgba(78,205,196,0.12)'
                : 'rgba(212,180,255,0.12)',
              border: `1px solid ${joinSuccess ? 'rgba(78,205,196,0.3)' : 'rgba(212,180,255,0.3)'}`,
              color: joinSuccess ? 'var(--color-teal)' : '#D4B4FF',
            }}
          >
            {joinSuccess ? `Joined ${joinSuccess}!` : joinError}
          </motion.div>
        )}
      </AnimatePresence>

      {/* My memberships */}
      {memberships.length > 0 && (
        <section className="mb-6">
          <p className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
            {t('community.myGroups', 'My groups')}
          </p>
          <div className="flex flex-col gap-2">
            {memberships.map(m => (
              <MembershipCard key={m.community_id} membership={m} />
            ))}
          </div>
        </section>
      )}

      {/* Agents */}
      <section className="mb-6">
        <p className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
          {t('community.agents', 'World inhabitants')}
        </p>
        {isLoading ? (
          <AgentsSkeleton />
        ) : (
          <div className="flex flex-col gap-2">
            {agents.map(agent => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        )}
      </section>

      {/* Open communities to join */}
      {openCommunities.filter(c => !joinedIds.has(c.id)).length > 0 && (
        <section className="mb-6">
          <p className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
            {t('community.discover', 'Discover')}
          </p>
          <div className="flex flex-col gap-3">
            {openCommunities
              .filter(c => !joinedIds.has(c.id))
              .map(community => (
                <CommunityCard
                  key={community.id}
                  community={community}
                  isJoining={joiningId === community.id}
                  onJoin={handleJoin}
                />
              ))}
          </div>
        </section>
      )}
    </div>
  )
}

// -- MembershipCard ------------------------------------------------------------

function MembershipCard({ membership }: { membership: Membership }) {
  const { shouldAnimate, t: transition } = useMotion()
  return (
    <motion.div
      initial={shouldAnimate ? { opacity: 0, x: -8 } : {}}
      animate={{ opacity: 1, x: 0 }}
      transition={transition()}
      className="rounded-2xl px-4 py-3 flex items-center gap-3"
      style={{ background: 'var(--color-surface-card)', border: '1px solid rgba(123,114,255,0.15)' }}
    >
      <div
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
        className="text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0"
        style={{ background: 'rgba(123,114,255,0.12)', color: 'var(--color-primary)' }}
      >
        #{membership.badge_id.slice(0, 6)}
      </div>
    </motion.div>
  )
}

// -- AgentCard -----------------------------------------------------------------

function AgentCard({ agent }: { agent: CommunityAgent }) {
  const { shouldAnimate, t: transition } = useMotion()
  const stateColor = AGENT_STATE_COLOR[agent.state] ?? 'var(--color-text-muted)'

  return (
    <motion.div
      initial={shouldAnimate ? { opacity: 0, x: -8 } : {}}
      animate={{ opacity: 1, x: 0 }}
      transition={transition()}
      className="rounded-2xl px-4 py-3 flex items-center gap-3"
      style={{ background: 'var(--color-surface-card)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* State dot */}
      <div className="relative shrink-0">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
          style={{ background: 'var(--color-surface-raised)' }}
        >
          🤖
        </div>
        <div
          className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2"
          style={{
            background: stateColor,
            borderColor: 'var(--color-surface-card)',
          }}
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
              style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}
            >
              PRO
            </span>
          )}
        </div>
        <p className="text-[11px] truncate" style={{ color: 'var(--color-text-muted)' }}>
          {agent.personality.catchphrase}
        </p>
      </div>

      <div className="text-right shrink-0">
        <p className="text-[10px]" style={{ color: stateColor }}>
          {agent.state}
        </p>
        <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
          {RANK_LABEL[agent.rank] ?? agent.rank}
        </p>
      </div>
    </motion.div>
  )
}

// -- CommunityCard -------------------------------------------------------------

function CommunityCard({
  community,
  isJoining,
  onJoin,
}: {
  community: Community
  isJoining: boolean
  onJoin: (c: Community) => void
}) {
  const { shouldAnimate, t: transition } = useMotion()

  return (
    <motion.div
      initial={shouldAnimate ? { opacity: 0, y: 8 } : {}}
      animate={{ opacity: 1, y: 0 }}
      transition={transition()}
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
          className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150
                     focus-visible:ring-2 focus-visible:ring-[var(--color-teal)] focus-visible:outline-none
                     active:scale-95 disabled:opacity-50"
          style={{
            background: 'rgba(78,205,196,0.15)',
            border: '1px solid rgba(78,205,196,0.3)',
            color: 'var(--color-teal)',
          }}
          aria-label={`Join ${community.name}`}
        >
          {isJoining ? '…' : 'Join'}
        </button>
      </div>

      {community.constitution && (
        <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
          {community.constitution}
        </p>
      )}
    </motion.div>
  )
}

// -- Skeleton ------------------------------------------------------------------

function AgentsSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {[1, 2, 3].map(i => (
        <div
          key={i}
          className="rounded-2xl px-4 py-3 h-16 animate-pulse motion-reduce:animate-none"
          style={{ background: 'var(--color-surface-card)' }}
        />
      ))}
    </div>
  )
}
