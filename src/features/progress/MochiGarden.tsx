import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useMotion } from '@/shared/hooks/useMotion'
import { useStore } from '@/store'
import { DISCOVERIES } from '@/shared/lib/mochiDiscoveries'

export function MochiGarden() {
  const { shouldAnimate } = useMotion()
  const { t } = useTranslation()
  const mochiDiscoveries = useStore(s => s.mochiDiscoveries)

  if (mochiDiscoveries.length === 0) return null

  return (
    <motion.div
      initial={shouldAnimate ? { opacity: 0, y: 12 } : false}
      animate={shouldAnimate ? { opacity: 1, y: 0 } : false}
      className="rounded-2xl p-4"
      style={{
        background: 'linear-gradient(135deg, rgba(78,205,196,0.06), rgba(123,114,255,0.04))',
        border: '1px solid rgba(78,205,196,0.12)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[14px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {t('mochi.garden')}
        </h3>
        <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
          {t('mochi.found', { count: mochiDiscoveries.length, total: DISCOVERIES.length })}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {DISCOVERIES.map(d => {
          const found = mochiDiscoveries.includes(d.id)
          return (
            <div
              key={d.id}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[16px]"
              style={{
                background: found
                  ? d.rarity === 'rare' ? 'rgba(245,158,11,0.12)' : 'rgba(78,205,196,0.08)'
                  : 'rgba(37,40,64,0.5)',
                border: found && d.rarity === 'rare'
                  ? '1px solid rgba(245,158,11,0.3)'
                  : '1px solid transparent',
                opacity: found ? 1 : 0.3,
              }}
              title={found ? `${d.emoji} ${d.name}` : '???'}
            >
              {found ? d.emoji : '?'}
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}
