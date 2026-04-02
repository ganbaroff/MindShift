/**
 * PlanSection — subscription plan banner + upgrade CTA
 */

import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useMotion } from '@/shared/hooks/useMotion'
import { useStore } from '@/store'
import { supabase } from '@/shared/lib/supabase'

export function PlanSection() {
  const { t } = useTranslation()
  const { shouldAnimate } = useMotion()
  const { subscriptionTier, setSubscription } = useStore()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  // ── Stripe return leg — sync tier from DB when redirected back after checkout ──
  useEffect(() => {
    if (searchParams.get('upgrade') !== 'success') return
    // Clear the param immediately so page refresh doesn't re-trigger
    navigate('/settings', { replace: true })
    void supabase
      .from('users')
      .select('subscription_tier, trial_ends_at')
      .limit(1)
      .single()
      .then(({ data }) => {
        const row = data as { subscription_tier?: string; trial_ends_at?: string | null } | null
        // Webhook may not have processed yet — default to 'pro' optimistically
        const tier = ((row?.subscription_tier) ?? 'pro') as 'free' | 'pro_trial' | 'pro'
        setSubscription(tier, row?.trial_ends_at ?? null)
        toast.success(t('settings.upgradeSuccess'), { duration: 6000 })
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [upgrading, setUpgrading] = useState(false)
  const handleUpgrade = async () => {
    setUpgrading(true)
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { plan: 'pro_monthly' },
      })
      if (error || !data?.url) throw error ?? new Error('No checkout URL')
      window.location.href = data.url
    } catch {
      toast.error(t('settings.upgradeError'))
    } finally {
      setUpgrading(false)
    }
  }

  const planLabel =
    subscriptionTier === 'pro'       ? 'MindShift Pro' :
    subscriptionTier === 'pro_trial' ? 'MindShift Pro Trial' :
    'MindShift Free'

  return (
    <div className="rounded-2xl p-3 flex items-center justify-between" style={{ backgroundColor: 'var(--color-surface-card)' }}>
      <p className="text-[15px]" style={{ color: 'var(--color-text-primary)' }}>🌱 {planLabel}</p>
      {(subscriptionTier === 'pro' || subscriptionTier === 'pro_trial') ? (
        <span
          className="px-2.5 py-1 rounded-full text-[12px] font-semibold"
          style={{ background: 'rgba(78,205,196,0.15)', color: 'var(--color-teal)', border: '1px solid rgba(78,205,196,0.3)' }}
        >
          {t('settings.proBadge')}
        </span>
      ) : (
        <motion.button
          whileTap={shouldAnimate ? { scale: 0.97 } : undefined}
          onClick={handleUpgrade}
          disabled={upgrading}
          aria-label={t('settings.upgradeCTA')}
          className="px-3 py-1.5 rounded-xl text-[13px] font-medium focus-visible:ring-2 focus-visible:ring-[#4ECDC4]"
          style={{
            background: 'rgba(78,205,196,0.12)',
            color: 'var(--color-teal)',
            border: '1px solid rgba(78,205,196,0.25)',
            opacity: upgrading ? 0.6 : 1,
          }}
        >
          {upgrading ? t('settings.upgrading') : t('settings.upgradeCTA')}
        </motion.button>
      )}
    </div>
  )
}
