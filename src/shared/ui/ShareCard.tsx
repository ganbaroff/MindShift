/**
 * ShareCard — Shareable achievement / stats card (P1 Gen Z)
 *
 * Renders a branded 9:16 card with achievement info.
 * Supports Web Share API (native share) with fallback to clipboard copy.
 * Uses existing palette — no new colors or styles.
 */

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useMotion } from '@/shared/hooks/useMotion'
import { useStore } from '@/store'
import { canShare, nativeShare } from '@/shared/lib/native'

interface ShareCardProps {
  /** Badge emoji */
  emoji: string
  /** Badge name */
  title: string
  /** Description or fact */
  subtitle: string
  /** Optional stat to highlight */
  stat?: string
  /** Called when sheet is dismissed */
  onClose: () => void
}

export function ShareCard({ emoji, title, subtitle, stat, onClose }: ShareCardProps) {
  const { t } = useMotion()
  const { xpTotal } = useStore()
  const [copied, setCopied] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  // Compute XP tier name
  const TIER_NAMES = ['Seedling','Sprout','Grower','Bloomer','Flourisher','Cultivator','Nurturer','Luminary','Pathfinder','Sage']
  const level = Math.min(Math.floor(xpTotal / 1000), TIER_NAMES.length - 1)
  const tierName = TIER_NAMES[level]

  const shareText = `${emoji} ${title} — ${subtitle}\n🌱 ${tierName} · ${xpTotal} XP\n\nMindShift — Focus made kind`

  const handleShare = useCallback(async () => {
    if (canShare()) {
      await nativeShare({ text: shareText, title: 'MindShift Achievement' })
    } else {
      try {
        await navigator.clipboard.writeText(shareText)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch {
        // Fallback: do nothing
      }
    }
  }, [shareText])

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center px-6"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={t('expressive')}
          onClick={e => e.stopPropagation()}
          className="w-full max-w-[280px] flex flex-col"
        >
          {/* Card */}
          <div
            ref={cardRef}
            className="rounded-3xl overflow-hidden"
            style={{
              aspectRatio: '9/16',
              background: 'linear-gradient(160deg, #1A1B30 0%, #0F1117 40%, #141228 100%)',
              border: '1px solid rgba(123,114,255,0.15)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
            }}
          >
            <div className="h-full flex flex-col items-center justify-center px-6 gap-5 relative">
              {/* Ambient glow */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'radial-gradient(ellipse 60% 35% at 50% 25%, rgba(123,114,255,0.15), transparent)',
                }}
              />

              {/* Emoji */}
              <motion.p
                className="text-6xl relative z-10"
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                {emoji}
              </motion.p>

              {/* Title */}
              <div className="text-center relative z-10">
                <h3 className="text-lg font-bold" style={{ color: '#E8E8F0' }}>
                  {title}
                </h3>
                <p className="text-sm mt-1.5" style={{ color: '#8B8BA7' }}>
                  {subtitle}
                </p>
              </div>

              {/* Stat */}
              {stat && (
                <div
                  className="px-4 py-2 rounded-xl relative z-10"
                  style={{ background: 'rgba(78,205,196,0.08)', border: '1px solid rgba(78,205,196,0.15)' }}
                >
                  <p className="text-sm font-medium" style={{ color: '#4ECDC4' }}>{stat}</p>
                </div>
              )}

              {/* XP tier */}
              <div className="relative z-10 flex items-center gap-2">
                <span className="text-xs" style={{ color: '#7B72FF' }}>🌱 {tierName}</span>
                <span className="text-xs" style={{ color: '#5A5B72' }}>·</span>
                <span className="text-xs" style={{ color: '#5A5B72' }}>{xpTotal} XP</span>
              </div>

              {/* Brand */}
              <div className="absolute bottom-6 left-0 right-0 text-center">
                <p className="text-[10px] font-medium tracking-wider" style={{ color: '#5A5B72' }}>
                  MINDSHIFT — FOCUS MADE KIND
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleShare}
              className="flex-1 py-3 rounded-2xl font-semibold text-sm"
              style={{ background: '#7B72FF', color: '#FFFFFF' }}
            >
              {copied ? 'Copied!' : canShare() ? 'Share' : 'Copy text'}
            </button>
            <button
              onClick={onClose}
              className="py-3 px-5 rounded-2xl text-sm"
              style={{ background: '#1E2136', color: '#8B8BA7' }}
            >
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
