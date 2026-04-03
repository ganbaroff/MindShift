/**
 * DiscoveryCard — brief celebration when Mochi finds something.
 *
 * "Mochi found a 🌸 Cherry blossom!"
 * Auto-dismisses after 4 seconds. Tap to dismiss immediately.
 * Rare items show gold border.
 */

import { useEffect, memo } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { useMotion } from '@/shared/hooks/useMotion'
import type { Discovery } from '@/shared/lib/mochiDiscoveries'

interface DiscoveryCardProps {
  discovery: Discovery
  onDismiss: () => void
}

const RARITY_STYLES = {
  common:   { border: 'rgba(78,205,196,0.20)',  bg: 'rgba(78,205,196,0.06)' },
  uncommon: { border: 'rgba(123,114,255,0.25)', bg: 'rgba(123,114,255,0.08)' },
  rare:     { border: 'rgba(245,158,11,0.35)',   bg: 'rgba(245,158,11,0.10)' },
}

function DiscoveryCardInner({ discovery, onDismiss }: DiscoveryCardProps) {
  const { shouldAnimate, t: transition } = useMotion()
  const { t } = useTranslation()
  const style = RARITY_STYLES[discovery.rarity]

  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  return (
    <motion.button
      onClick={onDismiss}
      initial={shouldAnimate ? { opacity: 0, scale: 0.9, y: 8 } : false}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={shouldAnimate ? { opacity: 0, scale: 0.9, y: -8 } : {}}
      transition={transition('expressive')}
      className="w-full px-3 py-2.5 rounded-xl text-left cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
      style={{
        background: style.bg,
        border: `1px solid ${style.border}`,
      }}
      aria-label="Dismiss discovery"
    >
      <p className="text-[13px]" style={{ color: 'var(--color-text-primary)' }}>
        <span className="text-[16px] mr-1">{discovery.emoji}</span>
        {t('mochi.foundItem', { name: '' })}<span className="font-medium">{discovery.name}</span>
        {discovery.rarity === 'rare' && <span className="ml-1 text-[10px]" style={{ color: 'var(--color-gold)' }}>{t('mochi.rare')}</span>}
      </p>
    </motion.button>
  )
}

export const DiscoveryCard = memo(DiscoveryCardInner)
