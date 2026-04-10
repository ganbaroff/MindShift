/**
 * ShareholderPanel — shareholder position info for the current user
 *
 * Shows: staked SHARE crystals per community, pending dividend estimate,
 * how-it-works explanation.
 * Guest users see an explanation with a sign-in prompt.
 */

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/shared/lib/supabase'
import { useStore } from '@/store'

interface Position {
  community_id: string
  staked_crystals: number
  communities: { name: string; tier: string } | null
}

interface ShareholderPanelProps {
  latestDividend: number  // FOCUS per SHARE crystal, from latest snapshot
}

export function ShareholderPanel({ latestDividend }: ShareholderPanelProps) {
  const { t } = useTranslation()
  const userId = useStore(s => s.userId)

  const [positions, setPositions] = useState<Position[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!userId || userId.startsWith('guest_')) return
    setIsLoading(true)
    void supabase
      .from('shareholder_positions')
      .select('community_id, staked_crystals, communities(name, tier)')
      .eq('user_id', userId)
      .then(({ data }) => {
        if (data) setPositions(data as Position[])
        setIsLoading(false)
      })
  }, [userId])

  const totalStaked = positions.reduce((s, p) => s + p.staked_crystals, 0)
  const estimatedDividend = totalStaked * latestDividend

  if (!userId || userId.startsWith('guest_')) {
    return (
      <div
        className="rounded-2xl px-4 py-4"
        style={{ background: 'var(--color-surface-card)', border: '1px solid rgba(123,114,255,0.15)' }}
      >
        <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
          {t('economy.shareholderTitle', 'Become a shareholder')}
        </p>
        <p className="text-[12px] leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
          {t('economy.shareholderGuest',
            'Sign in and join an ELITE community to earn SHARE crystals and receive dividends.',
          )}
        </p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div
        role="status"
        aria-label={t('economy.loadingPositions', 'Loading shareholder positions…')}
        className="rounded-2xl h-24 animate-pulse motion-reduce:animate-none"
        style={{ background: 'var(--color-surface-card)' }}
      />
    )
  }

  if (positions.length === 0) {
    return (
      <div
        className="rounded-2xl px-4 py-4"
        style={{ background: 'var(--color-surface-card)', border: '1px solid rgba(123,114,255,0.15)' }}
      >
        <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
          {t('economy.shareholderTitle', 'Shareholder positions')}
        </p>
        <p className="text-[12px] leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
          {t('economy.noPositions',
            'No positions yet. Join an ELITE community to stake SHARE crystals and earn dividends.',
          )}
        </p>
      </div>
    )
  }

  return (
    <section
      aria-label={t('economy.shareholderLabel', 'Your shareholder positions')}
      className="flex flex-col gap-2"
    >
      {/* Summary */}
      <div
        className="rounded-2xl px-4 py-4 flex items-center justify-between"
        style={{ background: 'rgba(123,114,255,0.08)', border: '1px solid rgba(123,114,255,0.2)' }}
      >
        <div>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {t('economy.totalStaked', 'Total staked')}
          </p>
          <p className="text-xl font-bold" style={{ color: 'var(--color-primary)' }}>
            {totalStaked.toLocaleString()}
            <span className="text-sm font-normal ml-1" style={{ color: 'var(--color-text-muted)' }}>SHARE</span>
          </p>
        </div>
        {latestDividend > 0 && (
          <div className="text-right">
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {t('economy.estimatedNext', 'Est. next payout')}
            </p>
            <p className="text-xl font-bold" style={{ color: 'var(--color-teal)' }}>
              {estimatedDividend.toLocaleString()}
              <span className="text-sm font-normal ml-1" style={{ color: 'var(--color-text-muted)' }}>FOCUS</span>
            </p>
          </div>
        )}
      </div>

      {/* Per-community breakdown */}
      {positions.map(pos => (
        <div
          key={pos.community_id}
          className="rounded-2xl px-4 py-3 flex items-center justify-between"
          style={{ background: 'var(--color-surface-card)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
              {pos.communities?.name ?? 'Unknown community'}
            </p>
            <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
              {pos.communities?.tier ?? 'ELITE'}
            </p>
          </div>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>
            {pos.staked_crystals.toLocaleString()} SHARE
          </p>
        </div>
      ))}
    </section>
  )
}
