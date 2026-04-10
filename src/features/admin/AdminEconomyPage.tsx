/**
 * AdminEconomyPage — revenue snapshot publisher
 * Route: /admin/economy
 *
 * Only accessible + functional when logged in as ADMIN_EMAIL.
 * Uses publish-revenue-snapshot edge function (service role, ADMIN_EMAIL check).
 *
 * Shows: previous snapshots + new snapshot form.
 * Rule 1: palette. Rule 3: a11y. Rule 6: plain copy.
 */

import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/shared/lib/supabase'
import { useStore } from '@/store'

interface Snapshot {
  id: string
  period_label: string
  gross_revenue_usd: number
  operating_costs_usd: number
  net_revenue_usd: number
  dividend_pool_usd: number
  dividend_per_share_crystal: number
  published_at: string
}

function formatUSD(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n)
}

export function AdminEconomyPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const userId = useStore(s => s.userId)

  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState<{ ok: boolean; msg: string } | null>(null)

  // Form state
  const [periodLabel, setPeriodLabel]               = useState('')
  const [grossRevenue, setGrossRevenue]             = useState('')
  const [operatingCosts, setOperatingCosts]         = useState('')
  const [dividendPerCrystal, setDividendPerCrystal] = useState('')

  // Computed previews
  const gross   = parseFloat(grossRevenue) || 0
  const costs   = parseFloat(operatingCosts) || 0
  const net     = gross - costs
  const divPool = net * 0.5

  useEffect(() => {
    void loadSnapshots()
  }, [])

  async function loadSnapshots() {
    setIsLoading(true)
    const { data } = await supabase
      .from('revenue_snapshots')
      .select('*')
      .order('published_at', { ascending: false })
      .limit(12)
    if (data) setSnapshots(data as Snapshot[])
    setIsLoading(false)
  }

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return

    const label  = periodLabel.trim()
    const dpsCry = parseFloat(dividendPerCrystal)

    if (!label || gross <= 0 || costs < 0 || isNaN(dpsCry) || dpsCry < 0) {
      setSubmitResult({ ok: false, msg: 'Fill in all required fields with valid numbers.' })
      return
    }

    setIsSubmitting(true)
    setSubmitResult(null)

    const { data, error } = await supabase.functions.invoke('publish-revenue-snapshot', {
      body: {
        period_label:             label,
        gross_revenue_usd:        gross,
        operating_costs_usd:      costs,
        dividend_per_share_crystal: dpsCry,
      },
    })

    if (error) {
      setSubmitResult({ ok: false, msg: error.message ?? 'Failed to publish.' })
    } else {
      const snap = (data as { snapshot?: Snapshot })?.snapshot
      setSubmitResult({ ok: true, msg: `Published: ${snap?.period_label ?? label}` })
      // Reset form
      setPeriodLabel('')
      setGrossRevenue('')
      setOperatingCosts('')
      setDividendPerCrystal('')
      void loadSnapshots()
    }
    setIsSubmitting(false)
  }, [isSubmitting, periodLabel, gross, costs, dividendPerCrystal])

  return (
    <div
      className="flex flex-col min-h-screen px-4 pt-6 pb-24 max-w-xl mx-auto"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          aria-label={t('admin.back', 'Go back')}
          className="w-8 h-8 rounded-full flex items-center justify-center
                     focus-visible:ring-2 focus-visible:ring-[var(--color-teal)] focus-visible:outline-none"
          style={{ background: 'var(--color-surface-card)', color: 'var(--color-text-muted)' }}
        >
          ←
        </button>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {t('admin.title', 'Revenue Publisher')}
          </h1>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {userId ?? 'not logged in'}
          </p>
        </div>
      </div>

      {/* Publish form */}
      <section aria-label={t('admin.formLabel', 'Publish revenue snapshot')} className="mb-8">
        <h2
          aria-hidden="true"
          className="text-xs font-semibold mb-3 uppercase tracking-wider"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {t('admin.newSnapshot', 'New snapshot')}
        </h2>

        <form
          onSubmit={e => void handleSubmit(e)}
          className="rounded-2xl px-4 py-5 flex flex-col gap-4"
          style={{ background: 'var(--color-surface-card)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <Field
            id="period"
            label={t('admin.periodLabel', 'Period (e.g. Q1 2026)')}
            type="text"
            value={periodLabel}
            onChange={setPeriodLabel}
            placeholder="Q1 2026"
            required
          />
          <Field
            id="gross"
            label={t('admin.grossRevenue', 'Gross revenue (USD)')}
            type="number"
            value={grossRevenue}
            onChange={setGrossRevenue}
            placeholder="0.00"
            required
            min="0"
            step="0.01"
          />
          <Field
            id="costs"
            label={t('admin.operatingCosts', 'Operating costs (USD)')}
            type="number"
            value={operatingCosts}
            onChange={setOperatingCosts}
            placeholder="0.00"
            required
            min="0"
            step="0.01"
          />
          <Field
            id="dpc"
            label={t('admin.dividendPerCrystal', 'Dividend per SHARE crystal (FOCUS)')}
            type="number"
            value={dividendPerCrystal}
            onChange={setDividendPerCrystal}
            placeholder="0"
            required
            min="0"
            step="1"
          />

          {/* Preview */}
          {(gross > 0 || costs > 0) && (
            <div
              className="rounded-xl px-3 py-2 text-[11px] flex flex-col gap-1"
              style={{ background: 'rgba(78,205,196,0.06)', color: 'var(--color-text-muted)' }}
            >
              <span>Net revenue: <strong style={{ color: 'var(--color-text-primary)' }}>{formatUSD(net)}</strong></span>
              <span>Dividend pool (50%): <strong style={{ color: 'var(--color-teal)' }}>{formatUSD(divPool)}</strong></span>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="py-3 rounded-2xl text-sm font-semibold transition-all duration-150
                       focus-visible:ring-2 focus-visible:ring-[var(--color-teal)] focus-visible:outline-none
                       active:scale-[0.98] disabled:opacity-50"
            style={{
              background: 'rgba(78,205,196,0.15)',
              border: '1px solid rgba(78,205,196,0.3)',
              color: 'var(--color-teal)',
            }}
          >
            {isSubmitting ? t('admin.publishing', 'Publishing…') : t('admin.publish', 'Publish snapshot')}
          </button>

          {submitResult && (
            <p
              role={submitResult.ok ? 'status' : 'alert'}
              className="text-sm text-center"
              style={{ color: submitResult.ok ? 'var(--color-teal)' : '#D4B4FF' }}
            >
              {submitResult.msg}
            </p>
          )}
        </form>
      </section>

      {/* History */}
      <section aria-label={t('admin.historyLabel', 'Published snapshots')} className="mb-6">
        <h2
          aria-hidden="true"
          className="text-xs font-semibold mb-3 uppercase tracking-wider"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {t('admin.history', 'Published')}
        </h2>

        {isLoading ? (
          <div
            role="status"
            aria-label={t('admin.loading', 'Loading…')}
            className="rounded-2xl h-20 animate-pulse motion-reduce:animate-none"
            style={{ background: 'var(--color-surface-card)' }}
          />
        ) : snapshots.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {t('admin.noSnapshots', 'No snapshots yet.')}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {snapshots.map(s => (
              <div
                key={s.id}
                className="rounded-2xl px-4 py-3"
                style={{ background: 'var(--color-surface-card)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    {s.period_label}
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                    {new Date(s.published_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-4 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                  <span>Gross: {formatUSD(s.gross_revenue_usd)}</span>
                  <span>Net: {formatUSD(s.net_revenue_usd)}</span>
                  <span style={{ color: 'var(--color-primary)' }}>
                    {s.dividend_per_share_crystal} FOCUS/SHARE
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function Field({
  id, label, type, value, onChange, placeholder, required, min, step,
}: {
  id: string; label: string; type: string; value: string
  onChange: (v: string) => void; placeholder?: string
  required?: boolean; min?: string; step?: string
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium mb-1"
        style={{ color: 'var(--color-text-muted)' }}>
        {label}{required && <span aria-hidden="true"> *</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        min={min}
        step={step}
        className="w-full rounded-xl px-3 py-2.5 text-sm
                   focus-visible:ring-2 focus-visible:ring-[var(--color-teal)] focus-visible:outline-none"
        style={{
          background: 'var(--color-surface-raised)',
          color: 'var(--color-text-primary)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      />
    </div>
  )
}
