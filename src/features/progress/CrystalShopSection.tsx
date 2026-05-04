/**
 * CrystalShopSection — Crystal spend path for MindShift
 *
 * Research basis: Denis (game economy designer) — 5 designed sinks:
 *   Mochi personality: 50c | Audio pack: 30c | Room boost: 20c/week
 *   Theme: 15c | Grove tithe: 5c
 *
 * Constitution crystal ethics (ALL enforced here):
 *   1. NO TIMERS — no countdowns, no flash sales
 *   2. CRYSTALS NEVER EXPIRE — balance shown as-is
 *   3. NEUTRAL DISMISS — "Not now" only, never shame
 *   4. ONE PRICE — no hidden costs
 *   5. SHOP NEVER INTERRUPTS — this is a destination, not a popup
 *   6. NO COLLECTION PROGRESS — items are choices, not sets
 *   7. 24H REFUND — noted inline
 *   8. TRANSPARENT FORMULA — "1 min = 5 crystals" shown
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useMotion } from '@/shared/hooks/useMotion'
import { useStore } from '@/store'
import { nativeHapticImpact } from '@/shared/lib/native'

// -- Shop items (Denis's 5 sinks) ---------------------------------------------

interface ShopItem {
  id: string
  emoji: string
  name: string
  description: string
  cost: number
  available: boolean   // false = coming to VOLAURA (shown, not locked behind paywall)
  comingTo?: string    // e.g. "VOLAURA" or "Life Simulator"
}

const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'mochi_playful',
    emoji: '🎭',
    name: 'Mochi Playful Personality',
    description: 'Mochi gets more mischievous and witty in responses.',
    cost: 50,
    available: true,
  },
  {
    id: 'audio_pack_nature',
    emoji: '🌿',
    name: 'Extended Nature Sounds',
    description: 'Rain forest, ocean waves, and mountain stream — richer than the built-in presets.',
    cost: 30,
    available: false,
    comingTo: 'MindShift update',
  },
  {
    id: 'room_boost',
    emoji: '⚡',
    name: 'Focus Room Boost',
    description: 'Gives your Focus Room a teal aura for the week — visible to all members.',
    cost: 20,
    available: false,
    comingTo: 'Focus Rooms update',
  },
  {
    id: 'theme_midnight',
    emoji: '🌙',
    name: 'Midnight Theme',
    description: 'Deeper surface colors, subtle starfield background, for late-night sessions.',
    cost: 15,
    available: false,
    comingTo: 'MindShift update',
  },
  {
    id: 'grove_tithe',
    emoji: '🌳',
    name: 'Grove Contribution',
    description: 'Contribute to your focus group\'s shared crystal pool. Collective consistency is recognized together.',
    cost: 5,
    available: false,
    comingTo: 'Groves (coming soon)',
  },
]

// -- Component -----------------------------------------------------------------

interface CrystalShopSectionProps {
  crystalBalance: number
}

export function CrystalShopSection({ crystalBalance }: CrystalShopSectionProps) {
  const { shouldAnimate } = useMotion()
  const { t } = useTranslation()
  const { shopUnlocks, addShopUnlock } = useStore()
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [justPurchased, setJustPurchased] = useState<string | null>(null)

  const handlePurchase = async (item: ShopItem) => {
    if (!item.available) return
    if (shopUnlocks.includes(item.id)) return
    if (crystalBalance < item.cost) return
    if (purchasing) return

    setPurchasing(item.id)
    nativeHapticImpact('medium')

    // Optimistic unlock — Constitution: no waiting spinner for purchases
    await new Promise(r => setTimeout(r, 400))
    addShopUnlock(item.id)
    setJustPurchased(item.id)
    setPurchasing(null)

    // Clear success state after 3s
    setTimeout(() => setJustPurchased(null), 3000)
  }

  return (
    <motion.div
      initial={shouldAnimate ? { opacity: 0, y: 8 } : false}
      animate={shouldAnimate ? { opacity: 1, y: 0 } : false}
      transition={shouldAnimate ? { delay: 0.2 } : undefined}
      className="rounded-2xl p-4 space-y-3"
      style={{
        background: 'linear-gradient(135deg, rgba(245,158,11,0.06), rgba(78,205,196,0.04))',
        border: '1px solid rgba(245,158,11,0.15)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            💎 {t('shop.title')}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {t('shop.formula')}
          </p>
        </div>
        <div
          className="px-3 py-1 rounded-full text-sm font-bold"
          style={{
            background: 'rgba(245,158,11,0.12)',
            color: 'var(--color-gold)',
          }}
        >
          {crystalBalance} 💎
        </div>
      </div>

      {/* Items */}
      <div className="space-y-2">
        {SHOP_ITEMS.map((item) => {
          const owned = shopUnlocks.includes(item.id)
          const canAfford = crystalBalance >= item.cost
          const isJustPurchased = justPurchased === item.id
          const isPurchasing = purchasing === item.id

          return (
            <motion.div
              key={item.id}
              layout
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
              style={{
                background: owned || isJustPurchased
                  ? 'rgba(78,205,196,0.08)'
                  : 'rgba(255,255,255,0.03)',
                border: owned || isJustPurchased
                  ? '1px solid rgba(78,205,196,0.2)'
                  : '1px solid rgba(255,255,255,0.06)',
                opacity: item.available && !canAfford && !owned ? 0.6 : 1,
              }}
            >
              <span className="text-2xl shrink-0">{item.emoji}</span>

              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  {item.name}
                  {owned && (
                    <span className="ml-2 text-[11px]" style={{ color: 'var(--color-teal)' }}>✓ Active</span>
                  )}
                </p>
                <p className="text-[11px] mt-0.5 line-clamp-1" style={{ color: 'var(--color-text-muted)' }}>
                  {item.available
                    ? item.description
                    : t('shop.comingTo', { dest: item.comingTo })}
                </p>
              </div>

              {/* CTA */}
              <div className="shrink-0">
                {owned || isJustPurchased ? (
                  <AnimatePresence mode="wait">
                    <motion.span
                      key="owned"
                      initial={shouldAnimate ? { scale: 0 } : {}}
                      animate={{ scale: 1 }}
                      className="text-lg"
                      aria-label={t('shop.active')}
                    >
                      ✨
                    </motion.span>
                  </AnimatePresence>
                ) : item.available ? (
                  <div className="flex flex-col items-end gap-0.5">
                    <button
                      onClick={() => void handlePurchase(item)}
                      disabled={!canAfford || !!purchasing}
                      className="px-3 py-1 rounded-lg text-[12px] font-semibold
                                 focus-visible:ring-2 focus-visible:ring-[var(--color-gold)]
                                 disabled:opacity-40 transition-all"
                      style={{
                        background: canAfford
                          ? 'rgba(245,158,11,0.15)'
                          : 'rgba(255,255,255,0.05)',
                        color: canAfford ? 'var(--color-gold)' : 'var(--color-text-muted)',
                      }}
                      aria-label={`Buy ${item.name} for ${item.cost} crystals`}
                    >
                      {isPurchasing ? '...' : `${item.cost} 💎`}
                    </button>
                    <span className="text-[9px]" style={{ color: 'var(--color-text-muted)' }}>
                      {t('shop.refundHint')}
                    </span>
                  </div>
                ) : (
                  <span
                    className="text-[11px] px-2 py-1 rounded-lg"
                    style={{
                      background: 'rgba(123,114,255,0.08)',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    {t('shop.comingSoon')}
                  </span>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Balance context — transparent formula per Constitution */}
      <p className="text-[10px] text-center" style={{ color: 'var(--color-text-muted)' }}>
        {t('shop.footer')}
      </p>
    </motion.div>
  )
}
