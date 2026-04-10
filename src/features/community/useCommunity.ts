/**
 * useCommunity — hook for community membership and agent access
 *
 * Manages:
 * - Fetching user's communities
 * - Joining a community (via community-join edge function)
 * - Community agent roster
 * - Crystal balance for SHARE type
 */

import { useState, useEffect, useCallback } from 'react'
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
  joinCommunity: (communityId: string, alias?: string) => Promise<{ success: boolean; error?: string }>
}

export function useCommunity(): UseCommunityReturn {
  const userId = useStore(s => s.userId)
  const [openCommunities, setOpenCommunities] = useState<Community[]>([])
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [agents, setAgents] = useState<CommunityAgent[]>([])
  const [crystalBalance, setCrystalBalance] = useState({ focus: 0, share: 0 })
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!userId || userId.startsWith('guest_')) return
    void loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  async function loadData() {
    setIsLoading(true)
    try {
      await Promise.all([
        loadOpenCommunities(),
        loadMemberships(),
        loadPublicAgents(),
        loadCrystalBalance(),
      ])
    } finally {
      setIsLoading(false)
    }
  }

  async function loadOpenCommunities() {
    const { data } = await supabase
      .from('communities')
      .select('id, slug, name, tier, entry_cost_crystals, is_anonymous, member_count, constitution')
      .eq('tier', 'OPEN')
      .order('member_count', { ascending: false })
    if (data) setOpenCommunities(data as Community[])
  }

  async function loadMemberships() {
    if (!userId) return
    const { data } = await supabase
      .from('community_memberships')
      .select(`
        community_id,
        badge_id,
        role,
        is_shareholder,
        joined_at,
        communities (name, tier)
      `)
      .eq('user_id', userId)
    if (data) {
      setMemberships(data.map((m: Record<string, unknown>) => ({
        community_id:    m.community_id as string,
        community_name:  (m.communities as { name: string } | null)?.name ?? '',
        tier:            (m.communities as { tier: string } | null)?.tier as 'OPEN' | 'ELITE',
        badge_id:        m.badge_id as string,
        role:            m.role as 'MEMBER' | 'MODERATOR' | 'FOUNDER',
        is_shareholder:  m.is_shareholder as boolean,
        joined_at:       m.joined_at as string,
      })))
    }
  }

  async function loadPublicAgents() {
    const { data } = await supabase
      .from('agents')
      .select('id, slug, display_name, tier, rank, state, personality')
      .is('community_id', null)           // public agents only
      .order('tier')
    if (data) setAgents(data as CommunityAgent[])
  }

  async function loadCrystalBalance() {
    if (!userId) return
    // Supabase typed client doesn't know our custom RPC signatures yet —
    // cast through unknown to number safely.
    const [focusResp, shareResp] = await Promise.all([
      supabase.rpc('get_crystal_balance' as Parameters<typeof supabase.rpc>[0], { p_user_id: userId, p_type: 'FOCUS' } as never),
      supabase.rpc('get_crystal_balance' as Parameters<typeof supabase.rpc>[0], { p_user_id: userId, p_type: 'SHARE' } as never),
    ])
    setCrystalBalance({
      focus: ((focusResp.data as unknown) as number) ?? 0,
      share: ((shareResp.data as unknown) as number) ?? 0,
    })
  }

  const joinCommunity = useCallback(async (communityId: string, alias?: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return { success: false, error: 'Not authenticated' }

      const resp = await supabase.functions.invoke('community-join', {
        body: { communityId, alias },
      })

      if (resp.error) return { success: false, error: resp.error.message }

      // Refresh local data after join
      await Promise.all([loadMemberships(), loadCrystalBalance()])
      return { success: true }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  return { openCommunities, memberships, agents, crystalBalance, isLoading, joinCommunity }
}
