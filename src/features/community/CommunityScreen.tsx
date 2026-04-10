/**
 * CommunityScreen — Sprint AG-2 (hardened)
 *
 * Agents as world inhabitants + community discovery.
 * All guardrail + a11y fixes applied per audit (2026-04-10).
 */

import { useCallback, useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useMotion } from '@/shared/hooks/useMotion'
import { useCommunity } from './useCommunity'
import { AgentCard }      from './AgentCard'
import { MembershipCard } from './MembershipCard'
import { CommunityCard }  from './CommunityCard'
import { useState } from 'react'
import type { Community } from './useCommunity'

export function CommunityScreen() {
  const { shouldAnimate, t: transition } = useMotion()
  const { t } = useTranslation()
  const {
    openCommunities,
    memberships,
    agents,
    crystalBalance,
    isLoading,
    loadError,
    joinCommunity,
  } = useCommunity()

  const [joiningId, setJoiningId]     = useState<string | null>(null)
  const [joinError, setJoinError]     = useState<string | null>(null)
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null)

  // Clear timers on unmount (P2 fix)
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const errorTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => {
    if (successTimerRef.current) clearTimeout(successTimerRef.current)
    if (errorTimerRef.current)   clearTimeout(errorTimerRef.current)
  }, [])

  const handleJoin = useCallback(async (community: Community) => {
    if (joiningId) return  // prevent concurrent joins (P1 fix)
    setJoiningId(community.id)
    setJoinError(null)
    setJoinSuccess(null)
    const result = await joinCommunity(community.id)
    setJoiningId(null)
    if (result.success) {
      setJoinSuccess(community.name)
      if (successTimerRef.current) clearTimeout(successTimerRef.current)
      successTimerRef.current = setTimeout(() => setJoinSuccess(null), 3000)
    } else {
      // Warm, specific error copy (Rule 6)
      setJoinError(result.error?.includes('Insufficient')
        ? t('community.errorInsufficient', 'Not enough Share crystals.')
        : result.error?.includes('Already')
        ? t('community.errorAlready', 'Already in this community.')
        : t('community.errorGeneric', "Couldn't join right now. Try again in a moment.")
      )
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
      errorTimerRef.current = setTimeout(() => setJoinError(null), 4000)
    }
  }, [joiningId, joinCommunity, t])

  // Memoize filtered list (P1 fix)
  const joinedIds = useMemo(() => new Set(memberships.map(m => m.community_id)), [memberships])
  const availableCommunities = useMemo(
    () => openCommunities.filter(c => !joinedIds.has(c.id)),
    [openCommunities, joinedIds]
  )

  return (
    <div
      className="flex flex-col min-h-screen px-4 pt-6 pb-24"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* Header */}
      <motion.div
        initial={shouldAnimate ? { opacity: 0, y: -8 } : {}}
        animate={{ opacity: 1, y: 0 }}
        transition={shouldAnimate ? transition() : { duration: 0 }}
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
        transition={shouldAnimate ? transition() : { duration: 0 }}
        className="flex gap-3 mb-6"
      >
        {/* role="group" + aria-label ties the number to its label (a11y fix) */}
        <div
          role="group"
          aria-label={`${t('community.focusCrystals', 'Focus crystals')}: ${crystalBalance.focus.toLocaleString()}`}
          className="flex-1 rounded-2xl px-4 py-3 flex items-center gap-2"
          style={{ background: 'var(--color-surface-card)', border: '1px solid rgba(78,205,196,0.15)' }}
        >
          <span aria-hidden="true" className="text-lg">💎</span>
          <div aria-hidden="true">
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {t('community.focusCrystals', 'Focus')}
            </p>
            <p className="text-lg font-bold" style={{ color: 'var(--color-teal)' }}>
              {crystalBalance.focus.toLocaleString()}
            </p>
          </div>
        </div>
        <div
          role="group"
          aria-label={`${t('community.shareCrystals', 'Share crystals')}: ${crystalBalance.share.toLocaleString()}`}
          className="flex-1 rounded-2xl px-4 py-3 flex items-center gap-2"
          style={{ background: 'var(--color-surface-card)', border: '1px solid rgba(123,114,255,0.15)' }}
        >
          <span aria-hidden="true" className="text-lg">🌟</span>
          <div aria-hidden="true">
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {t('community.shareCrystals', 'Share')}
            </p>
            <p className="text-lg font-bold" style={{ color: 'var(--color-primary)' }}>
              {crystalBalance.share.toLocaleString()}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Load error (non-shame, indigo/purple) */}
      {loadError && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-4 px-4 py-3 rounded-2xl text-sm"
          style={{
            background: 'rgba(212,180,255,0.10)',
            border: '1px solid rgba(212,180,255,0.25)',
            color: '#D4B4FF',
          }}
        >
          {t('community.loadError', 'Some data took too long. Pull to refresh.')}
        </div>
      )}

      {/* Join result toast — role="status"/"alert" for screen readers */}
      <AnimatePresence>
        {(joinError || joinSuccess) && (
          <motion.div
            role={joinSuccess ? 'status' : 'alert'}
            aria-live={joinSuccess ? 'polite' : 'assertive'}
            aria-atomic="true"
            initial={shouldAnimate ? { opacity: 0, y: -8 } : {}}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={shouldAnimate ? transition() : { duration: 0 }}
            className="mb-4 px-4 py-3 rounded-2xl text-sm font-medium"
            style={{
              background: joinSuccess ? 'rgba(78,205,196,0.12)' : 'rgba(212,180,255,0.12)',
              border: `1px solid ${joinSuccess ? 'rgba(78,205,196,0.3)' : 'rgba(212,180,255,0.3)'}`,
              color: joinSuccess ? 'var(--color-teal)' : '#D4B4FF',
            }}
          >
            {joinSuccess
              ? t('community.joinedName', { name: joinSuccess, defaultValue: `You're in — ${joinSuccess}.` })
              : joinError}
          </motion.div>
        )}
      </AnimatePresence>

      {/* My memberships */}
      {memberships.length > 0 && (
        <section aria-label={t('community.myGroups', 'My groups')} className="mb-6">
          <h2
            aria-hidden="true"
            className="text-xs font-semibold mb-3 uppercase tracking-wider"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {t('community.myGroups', 'My groups')}
          </h2>
          <div role="list" className="flex flex-col gap-2">
            {memberships.map(m => (
              <div role="listitem" key={m.community_id}>
                <MembershipCard membership={m} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Agents — world inhabitants */}
      <section aria-label={t('community.agents', 'World inhabitants')} className="mb-6">
        <h2
          aria-hidden="true"
          className="text-xs font-semibold mb-3 uppercase tracking-wider"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {t('community.agents', 'World inhabitants')}
        </h2>
        {isLoading ? (
          <div
            role="status"
            aria-label={t('community.loadingAgents', 'Loading agents…')}
            aria-busy="true"
          >
            <AgentsSkeleton />
          </div>
        ) : (
          <div role="list" className="flex flex-col gap-2">
            {agents.map(agent => (
              <div role="listitem" key={agent.id}>
                <AgentCard agent={agent} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Discover: open communities */}
      {availableCommunities.length > 0 && (
        <section aria-label={t('community.discover', 'Discover communities')} className="mb-6">
          <h2
            aria-hidden="true"
            className="text-xs font-semibold mb-3 uppercase tracking-wider"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {t('community.discover', 'Discover')}
          </h2>
          <div className="flex flex-col gap-3">
            {availableCommunities.map(community => (
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
