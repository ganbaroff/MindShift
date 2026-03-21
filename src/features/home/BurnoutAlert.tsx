import { memo } from 'react'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useMotion } from '@/shared/hooks/useMotion'
import { useNavigate } from 'react-router-dom'

interface BurnoutAlertProps {
  score: number
}

/**
 * BurnoutAlert — shown on ProgressPage when burnoutScore > 40.
 * Amber card (41-65) or purple card (66+). ADHD-safe, no shame.
 */
export const BurnoutAlert = memo(function BurnoutAlert({ score }: BurnoutAlertProps) {
  const { shouldAnimate } = useMotion()
  const { t } = useTranslation()
  const navigate = useNavigate()

  if (score <= 40) return null

  const isBurnout = score > 65
  const bgColor = isBurnout
    ? 'rgba(123,114,255,0.10)'
    : 'rgba(245,158,11,0.08)'
  const borderColor = isBurnout
    ? 'rgba(123,114,255,0.25)'
    : 'rgba(245,158,11,0.15)'
  const textColor = isBurnout ? '#C8C0FF' : '#F59E0B'
  const emoji = isBurnout ? '🌙' : '🌿'
  const title = isBurnout
    ? t('burnout.needsBreather')
    : t('burnout.fatigueShowing')
  const description = isBurnout
    ? t('burnout.pushingHard')
    : t('burnout.buildingTension')
  const ctaLabel = isBurnout
    ? t('burnout.takeBreather')
    : t('burnout.tryFiveMin')

  const handleCTA = () => {
    navigate('/focus?quick=1')
  }

  return (
    <motion.div
      initial={shouldAnimate ? { opacity: 0, y: 12 } : false}
      animate={shouldAnimate ? { opacity: 1, y: 0 } : false}
      className="rounded-2xl p-3"
      style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}` }}
    >
      <div className="flex items-start gap-2.5 mb-2">
        <span className="text-[18px] shrink-0">{emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold" style={{ color: textColor }}>
            {title}
          </p>
          <p className="text-[12px] mt-0.5 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
            {description}
          </p>
        </div>
      </div>
      <button
        onClick={handleCTA}
        className="w-full py-2 rounded-xl text-[13px] font-medium transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2"
        style={{
          background: isBurnout ? 'rgba(123,114,255,0.15)' : 'rgba(245,158,11,0.12)',
          border: `1px solid ${borderColor}`,
          color: textColor,
        }}
        aria-label={ctaLabel}
      >
        {ctaLabel} →
      </button>
    </motion.div>
  )
})
