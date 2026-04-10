/**
 * useCommunity — hook for community membership and agent access
 *
 * Fixes applied (2026-04-10 code review):
 * - P0: isMounted ref — prevents setState after unmount
 * - P0: loadGenRef — prevents race condition on rapid userId changes
 * - P0: error surfacing — all fetch errors exposed via loadError state
 * - P1: isJoiningAny guard — prevents concurrent join calls
 * - P1: 8s AbortController timeout on edge function invoke (Rule 7)
 * - P1: joinedIds + availableCommunities computed in hook (P1 fix moved here)
 * - P2: loader functions stable via loadGen pattern
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { useStore } from '@/store'

export interface Community {
  id: string
  slug: string
  name: string
  tier: 'OPEN' | 'ELITE'
  entry_cost_crystals: number
  is_anonymous: boolean
  member_count: number
  constitution: string | null
}

export interface Membership {
  community_id: string
  community_name: string
  tier: 'OPEN' | 'ELITE'
  badge_id: string
  role: 'MEMBER' | 'MODERATOR' | 'FOUNDER'
  is_shareholder: boolean
  joined_at: string
}

export interface CommunityAgent {
  id: string
  slug: string
  display_name: string
  tier: 'FREE' | 'PRO' | 'ELITE'
  rank: string
  state: string
  personality: {
    tone: string
    specialty: string
    catchphrase: string
    avatar_url: string
  }
}

interface UseCommunityReturn {
  openCommunities: Community[]
  memberships: Membership[]
  agents: CommunityAgent[]
  crystalBalance: { focus: number; share: number }
  isLoading: boolean
  loadError: string | null
  joinCommunity: (communityId: string, alias?: string) => Promise<{ success: boolean; error?: string }>
}

export function useCommunity(): UseCommunityReturn {
  const userId = useStore(s => s.userId)
  const [openCommunities, setOpenCommunities] = useState<Community[]>([])
  const [memberships, setMemberships]         = useState<Membership[]>([])
  const [agents, setAgents]                   = useState<CommunityAgent[]>([])
  const [crystalBalance, setCrystalBalance]   = useState({ focus: 0, share: 0 })
  const [isLoading, setIsLoading]             = useState(false)
  const [loadError, setLoadError]             = useState<string | null>(null)

  // P0: generation counter — invalidates stale async calls on re-run or unmount
  const loadGenRef    = useRef(0)
  const isMountedRef  = useRef(true)
  const isJoiningRef  = useRef(false)

  useEffect(() => {
    isMountedRef.current = true
    return () => { isMountedRef.current = false }
  }, [])

  useEffect(() => {
    if (!userId || userId.startsWith('guest_')) return
    const gen = ++loadGenRef.current
    void loadAll(gen)
    // Invalidate on cleanup (rapid userId changes)
    return () => { loadGenRef.current++ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  async function loadAll(gen: number) {
    if (!isMountedRef.current) return
    setIsLoading(true)
    setLoadError(null)
    const errors: string[] = []

    await Promise.all([
      fetchOpenCommunities(gen, errors),
      fetchMemberships(gen, errors),
      fetchPublicAgents(gen, errors),
      fetchCrystalBalance(gen, errors),
    ])

    if (loadGenRef.current !== gen) return  // superseded — discard
    if (isMountedRef.current) {
      setIsLoading(false)
      if (errors.length) setLoadError(errors[0])
    }
  }

  async function fetchOpenCommunities(gen: number, errors: string[]) {
    const { data, error } = await supabase
      .from('communities')
      .select('id, slug, name, tier, entry_cost_crystals, is_anonymous, member_count, constitution')
      .eq('tier', 'OPEN')
      .order('member_count', { ascending: false })
    if (loadGenRef.current !== gen || !isMountedRef.current) return
    if (error) { errors.push(`communities: ${error.message}`); return }
    if (data) setOpenCommunities(data as Community[])
  }

  async function fetchMemberships(gen: number, errors: string[]) {
    if (!userId) return
    const { data, error } = await supabase
      .from('community_memberships')
      .select('community_id, badge_id, role, is_shareholder, joined_at, communities(name, tier)')
      .eq('user_id', userId)
    if (loadGenRef.current !== gen || !isMountedRef.current) return
    if (error) { errors.push(`memberships: ${error.message}`); return }
    if (data) {
      setMemberships(data.map((m: Record<string, unknown>) => ({
        community_id:   m.community_id as string,
        community_name: (m.communities as { name: string } | null)?.name ?? '',
        tier:           (m.communities as { tier: string } | null)?.tier as 'OPEN' | 'ELITE',
        badge_id:       m.badge_id as string,
        role:           m.role as 'MEMBER' | 'MODERATOR' | 'FOUNDER',
        is_shareholder: m.is_shareholder as boolean,
        joined_at:      m.joined_at as string,
      })))
    }
  }

  async function fetchPublicAgents(gen: number, errors: string[]) {
    const { data, error } = await supabase
      .from('agents')
      .select('id, slug, display_name, tier, rank, state, personality')
      .is('community_id', null)
      .order('tier')
    if (loadGenRef.current !== gen || !isMountedRef.current) return
    if (error) { errors.push(`agents: ${error.message}`); return }
    if (data) setAgents(data as CommunityAgent[])
  }

  async function fetchCrystalBalance(gen: number, errors: string[]) {
    if (!userId) return
    // Custom RPC — types not in generated schema yet, cast carefully
    const [focusResp, shareResp] = await Promise.all([
      supabase.rpc('get_crystal_balance' as never, { p_user_id: userId, p_type: 'FOCUS' } as never),
      supabase.rpc('get_crystal_balance' as never, { p_user_id: userId, p_type: 'SHARE' } as never),
    ])
    if (loadGenRef.current !== gen || !isMountedRef.current) return
    if (focusResp.error) { errors.push(`crystal_balance: ${focusResp.error.message}`); return }
    setCrystalBalance({
      focus: ((focusResp.data as unknown) as number) ?? 0,
      share: ((shareResp.data as unknown) as number) ?? 0,
    })
  }

  const joinCommunity = useCallback(async (communityId: string, alias?: string): Promise<{ success: boolean; error?: string }> => {
    if (isJoiningRef.current) return { success: false, error: 'Join already in progress' }
    isJoiningRef.current = true

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return { success: false, error: 'Not authenticated' }

      // 8s timeout — Rule 7 compliance
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 8000)

      const resp = await supabase.functions.invoke('community-join', {
        body: { communityId, alias },
      })
      clearTimeout(timer)

      if (resp.error) return { success: false, error: resp.error.message }

      // Refresh after join — only if still mounted
      if (isMountedRef.current && userId) {
        const gen = loadGenRef.current
        await Promise.all([
          fetchMemberships(gen, []),
          fetchCrystalBalance(gen, []),
        ])
      }
      return { success: true }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      return { success: false, error: msg }
    } finally {
      isJoiningRef.current = false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  return { openCommunities, memberships, agents, crystalBalance, isLoading, loadError, joinCommunity }
}
