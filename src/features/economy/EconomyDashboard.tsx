/**
 * EconomyDashboard — transparent crystal economy + revenue sharing page
 *
 * Route: /economy
 * Shows: crystal formula, revenue snapshots, shareholder mechanics.
 * Data from revenue_snapshots table (best-effort — empty state if not yet deployed).
 *
 * Guardrails: Rule 1 (palette), Rule 3 (a11y), Rule 6 (plain copy), Rule 8 (≤400 lines)
 */

import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useMotion } from '@/shared/hooks/useMotion'
import { supabase } from '@/shared/lib/supabase'
import { useStore } from '@/store'
import { useNavigate } from 'react-router-dom'

interface RevenueSnapshot {
  id: string
  period_label: string
  gross_revenue_usd: number
  operating_costs_usd: number
  net_revenue_usd: number
  dividend_pool_usd: number
  dividend_per_share_crystal: number
  published_at: string
}

const CRYSTAL_RULES = [
  { emoji: '⏱', label: '1 min focus = 5 FOCUS crystals', detail: 'Earned automatically each session.' },
  { emoji: '💎', label: 'FOCUS crystals never expire', detail: 'Your balance survives any break.' },
  { emoji: '🌟', label: 'SHARE crystals from dividends', detail: 'Distributed to shareholders each period.' },
  { emoji: '🔒', label: 'No timers. No flash sales.', detail: 'Shop is a destination, not a popup.' },
  { emoji: '↩', label: '24h refund on all purchases', detail: 'Impulse safety net, always.' },
]

function formatUSD(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

export function EconomyDashboard() {
  const { shouldAnimate, t: transition } = useMotion()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const userId = useStore(s => s.userId)

  const [snapshots, setSnapshots] = useState<RevenueSnapshot[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [crystalBalance, setCrystalBalance] = useState({ focus: 0, share: 0 })

  useEffect(() => {
    void fetchData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  async function fetchData() {
    setIsLoading(true)
    const tasks: Promise<void>[] = [
      // Revenue snapshots — public table, no auth needed
      Promise.resolve(
        supabase
          .from('revenue_snapshots')
          .select('*')
          .order('published_at', { ascending: false })
          .limit(6),
      ).then(({ data }) => { if (data) setSnapshots(data as RevenueSnapshot[]) }),
    ]

    if (userId && !userId.startsWith('guest_')) {
      tasks.push(
        Promise.all([
          supabase.rpc('get_crystal_balance' as never, { p_user_id: userId, p_type: 'FOCUS' } as never),
          supabase.rpc('get_crystal_balance' as never, { p_user_id: userId, p_type: 'SHARE' } as never),
        ]).then(([f, s]) => {
          setCrystalBalance({
            focus: ((f.data as unknown) as number) ?? 0,
            share: ((s.data as unknown) as number) ?? 0,
          })
        }),
      )
    }

    await Promise.all(tasks)
    setIsLoading(false)
  }

  const latest = snapshots[0] ?? null

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
        className="mb-6 flex items-center gap-3"
      >
        <button
          onClick={() => navigate(-1)}
          aria-label={t('economy.back', 'Go back')}
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0
                     focus-visible:ring-2 focus-visible:ring-[var(--color-teal)] focus-visible:outline-none"
          style={{ background: 'var(--color-surface-card)', color: 'var(--color-text-muted)' }}
        >
          ←
        </button>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {t('economy.title', 'Crystal Economy')}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {t('economy.subtitle', 'How crystals work. How revenue is shared.')}
          </p>
        </div>
      </motion.div>

      {/* My balance — only when logged in */}
      {userId && !userId.startsWith('guest_') && (
        <motion.section
          aria-label={t('economy.myBalance', 'My crystal balance')}
          initial={shouldAnimate ? { opacity: 0 } : {}}
          animate={{ opacity: 1 }}
          transition={shouldAnimate ? transition() : { duration: 0 }}
          className="flex gap-3 mb-6"
        >
          <BalancePill
            emoji="💎"
            label={t('economy.focus', 'Focus')}
            value={crystalBalance.focus}
            color="var(--color-teal)"
            border="rgba(78,205,196,0.15)"
          />
          <BalancePill
            emoji="🌟"
            label={t('economy.share', 'Share')}
            value={crystalBalance.share}
            color="var(--color-primary)"
            border="rgba(123,114,255,0.15)"
          />
        </motion.section>
      )}

      {/* Crystal rules */}
      <motion.section
        aria-label={t('economy.rulesLabel', 'Crystal economy rules')}
        initial={shouldAnimate ? { opacity: 0, y: 8 } : {}}
        animate={{ opacity: 1, y: 0 }}
        transition={shouldAnimate ? transition() : { duration: 0 }}
        className="mb-6"
      >
        <h2
          aria-hidden="true"
          className="text-xs font-semibold mb-3 uppercase tracking-wider"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {t('economy.howItWorks', 'How it works')}
        </h2>
        <div className="flex flex-col gap-2">
          {CRYSTAL_RULES.map(rule => (
            <div
              key={rule.label}
              className="rounded-2xl px-4 py-3 flex items-start gap-3"
              style={{ background: 'var(--color-surface-card)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <span aria-hidden="true" className="text-lg shrink-0 mt-0.5">{rule.emoji}</span>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  {rule.label}
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  {rule.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Revenue sharing */}
      <motion.section
        aria-label={t('economy.revenueLabel', 'Revenue sharing')}
        initial={shouldAnimate ? { opacity: 0, y: 8 } : {}}
        animate={{ opacity: 1, y: 0 }}
        transition={shouldAnimate ? { ...(transition() as object), delay: 0.05 } : { duration: 0 }}
        className="mb-6"
      >
        <h2
          aria-hidden="true"
          className="text-xs font-semibold mb-3 uppercase tracking-wider"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {t('economy.revenueSharing', 'Revenue sharing')}
        </h2>
        <div
          className="rounded-2xl px-4 py-4 mb-3"
          style={{ background: 'var(--color-surface-card)', border: '1px solid rgba(123,114,255,0.15)' }}
        >
          <p className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
            {t('economy.formula', '50% of net revenue → dividend pool')}
          </p>
          <p className="text-[12px] leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
            {t('economy.formulaDetail',
              'ELITE community shareholders receive FOCUS crystal dividends each period, ' +
              'proportional to their staked SHARE crystals. ' +
              'Every snapshot below is the unedited calculation — no hidden adjustments.',
            )}
          </p>
        </div>

        {/* Snapshots */}
        {isLoading ? (
          <div
            role="status"
            aria-label={t('economy.loadingSnapshots', 'Loading revenue data…')}
            className="flex flex-col gap-2"
          >
            {[1, 2].map(i => (
              <div
                key={i}
                className="rounded-2xl h-24 animate-pulse motion-reduce:animate-none"
                style={{ background: 'var(--color-surface-card)' }}
              />
            ))}
          </div>
        ) : snapshots.length === 0 ? (
          <div
            className="rounded-2xl px-4 py-4 text-center"
            style={{ background: 'var(--color-surface-card)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              {t('economy.noSnapshots', 'First revenue snapshot coming soon.')}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {snapshots.map(snap => (
              <SnapshotCard key={snap.id} snap={snap} />
            ))}
          </div>
        )}
      </motion.section>

      {/* Latest snapshot highlight */}
      {latest && (
        <motion.div
          initial={shouldAnimate ? { opacity: 0 } : {}}
          animate={{ opacity: 1 }}
          transition={shouldAnimate ? { ...(transition() as object), delay: 0.1 } : { duration: 0 }}
          className="rounded-2xl px-4 py-4 mb-6"
          style={{
            background: 'rgba(123,114,255,0.08)',
            border: '1px solid rgba(123,114,255,0.2)',
          }}
        >
          <p className="text-xs font-semibold mb-1" style={{ color: 'var(--color-primary)' }}>
            {t('economy.latestDividend', 'Latest dividend per SHARE crystal')}
          </p>
          <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {latest.dividend_per_share_crystal.toLocaleString()}
            <span className="text-sm font-normal ml-2" style={{ color: 'var(--color-text-muted)' }}>
              FOCUS
            </span>
          </p>
          <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {t('economy.forPeriod', 'For period')} {latest.period_label} · {formatDate(latest.published_at)}
          </p>
        </motion.div>
      )}
    </div>
  )
}

function BalancePill({ emoji, label, value, color, border }: {
  emoji: string; label: string; value: number; color: string; border: string
}) {
  return (
    <div
      role="group"
      aria-label={`${label}: ${value.toLocaleString()}`}
      className="flex-1 rounded-2xl px-4 py-3 flex items-center gap-2"
      style={{ background: 'var(--color-surface-card)', border: `1px solid ${border}` }}
    >
      <span aria-hidden="true" className="text-lg">{emoji}</span>
      <div aria-hidden="true">
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
        <p className="text-lg font-bold" style={{ color }}>{value.toLocaleString()}</p>
      </div>
    </div>
  )
}

function SnapshotCard({ snap }: { snap: RevenueSnapshot }) {
  return (
    <div
      className="rounded-2xl px-4 py-4"
      style={{ background: 'var(--color-surface-card)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {snap.period_label}
        </p>
        <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
          {formatDate(snap.published_at)}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'Gross revenue', value: formatUSD(snap.gross_revenue_usd) },
          { label: 'Operating costs', value: formatUSD(snap.operating_costs_usd) },
          { label: 'Net revenue', value: formatUSD(snap.net_revenue_usd) },
          { label: 'Dividend pool', value: formatUSD(snap.dividend_pool_usd) },
        ].map(row => (
          <div key={row.label}>
            <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{row.label}</p>
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{row.value}</p>
          </div>
        ))}
      </div>
      <div
        className="mt-3 pt-3 border-t flex items-center justify-between"
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}
      >
        <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Per SHARE crystal</p>
        <p className="text-sm font-bold" style={{ color: 'var(--color-primary)' }}>
          {snap.dividend_per_share_crystal.toLocaleString()} FOCUS
        </p>
      </div>
    </div>
  )
}
