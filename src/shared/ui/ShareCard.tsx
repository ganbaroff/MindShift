/**
 * ShareCard — Visual share card for Instagram/WhatsApp/Telegram (Duolingo effect)
 *
 * Renders a branded 9:16 gradient card with Mochi, stats, and streak —
 * then converts to PNG via html-to-image and shares via Web Share API.
 *
 * This is a RETENTION feature. When someone posts "47 min focused today"
 * with a beautiful card, their friends feel the tension: "I should do this too."
 * That tension = return visits. Duolingo proved this with streak screenshots.
 *
 * Design: dark gradient, teal/indigo accents, Mochi avatar, ADHD-safe palette.
 * Never red, never shame, never comparison to others — only YOUR progress.
 */

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useMotion } from '@/shared/hooks/useMotion'
import { useStore } from '@/store'
import { canShare } from '@/shared/lib/native'
import { logEvent } from '@/shared/lib/logger'
import { toPng } from 'html-to-image'

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
  const { shouldAnimate, t } = useMotion()
  const xpTotal = useStore(s => s.xpTotal)
  const currentStreak = useStore(s => s.currentStreak)
  const completedTotal = useStore(s => s.completedTotal)
  const [sharing, setSharing] = useState(false)
  const [copied, setCopied] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  const TIER_NAMES = ['Seedling','Sprout','Grower','Bloomer','Flourisher','Cultivator','Nurturer','Luminary','Pathfinder','Sage']
  const level = Math.min(Math.floor(xpTotal / 1000), TIER_NAMES.length - 1)
  const tierName = TIER_NAMES[level]

  const handleShare = useCallback(async () => {
    if (!cardRef.current) return
    setSharing(true)

    try {
      // Render card DOM → PNG blob
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: '#0F1117',
      })

      const blob = await (await fetch(dataUrl)).blob()
      const file = new File([blob], 'mindshift-focus.png', { type: 'image/png' })

      if (canShare() && navigator.canShare?.({ files: [file] })) {
        // Native share with image — Instagram, WhatsApp, Telegram all accept this
        await navigator.share({
          files: [file],
          title: 'MindShift — Focus made kind',
          text: `${emoji} ${title}`,
        })
        logEvent('share_card_shared', { method: 'native_image' })
      } else if (canShare()) {
        // Fallback: share text only (older browsers)
        await navigator.share({
          text: `${emoji} ${title} — ${subtitle}\n🌱 ${tierName} · ${xpTotal} XP\n\nMindShift — Focus made kind`,
          title: 'MindShift',
        })
        logEvent('share_card_shared', { method: 'native_text' })
      } else {
        // Desktop fallback: copy image to clipboard
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ])
        setCopied(true)
        setTimeout(() => setCopied(false), 2500)
        logEvent('share_card_shared', { method: 'clipboard' })
      }
    } catch {
      // User cancelled share or API unavailable — not an error
    } finally {
      setSharing(false)
    }
  }, [emoji, title, subtitle, tierName, xpTotal])

  return (
    <AnimatePresence>
      <motion.div
        initial={shouldAnimate ? { opacity: 0 } : {}}
        animate={{ opacity: 1 }}
        exit={shouldAnimate ? { opacity: 0 } : {}}
        className="fixed inset-0 z-50 flex items-center justify-center px-6"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={shouldAnimate ? { scale: 0.9, opacity: 0, y: 20 } : {}}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={shouldAnimate ? { scale: 0.95, opacity: 0 } : {}}
          transition={t('expressive')}
          onClick={e => e.stopPropagation()}
          className="w-full max-w-[280px] flex flex-col"
        >
          {/* Card — this exact DOM gets rendered to PNG */}
          <div
            ref={cardRef}
            className="rounded-3xl overflow-hidden"
            style={{
              aspectRatio: '9/16',
              background: 'linear-gradient(160deg, #1A1B30 0%, #0F1117 35%, #141228 70%, #1A1530 100%)',
              border: '1px solid rgba(123,114,255,0.15)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
            }}
          >
            <div className="h-full flex flex-col items-center justify-between px-6 py-8 relative">
              {/* Ambient glow — top */}
              <div
                className="absolute top-0 left-0 right-0 h-1/3 pointer-events-none"
                style={{
                  background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(123,114,255,0.12), transparent)',
                }}
              />
              {/* Ambient glow — bottom */}
              <div
                className="absolute bottom-0 left-0 right-0 h-1/4 pointer-events-none"
                style={{
                  background: 'radial-gradient(ellipse 70% 50% at 50% 100%, rgba(78,205,196,0.08), transparent)',
                }}
              />

              {/* Top: emoji + title */}
              <div className="flex flex-col items-center gap-3 relative z-10 mt-4">
                <motion.p
                  className="text-5xl"
                  animate={shouldAnimate ? { scale: [1, 1.06, 1] } : {}}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                >
                  {emoji}
                </motion.p>
                <h3 className="text-lg font-bold text-center" style={{ color: '#E8E8F0' }}>
                  {title}
                </h3>
                <p className="text-sm text-center leading-relaxed" style={{ color: '#8B8BA7' }}>
                  {subtitle}
                </p>
              </div>

              {/* Middle: stats strip */}
              <div className="flex flex-col items-center gap-3 relative z-10">
                {stat && (
                  <div
                    className="px-5 py-2 rounded-xl"
                    style={{ background: 'rgba(78,205,196,0.08)', border: '1px solid rgba(78,205,196,0.2)' }}
                  >
                    <p className="text-sm font-semibold" style={{ color: '#4ECDC4' }}>{stat}</p>
                  </div>
                )}

                {/* Stats row */}
                <div className="flex items-center gap-4">
                  {currentStreak >= 2 && (
                    <div className="flex flex-col items-center">
                      <p className="text-xl font-bold" style={{ color: '#F59E0B' }}>{currentStreak}</p>
                      <p className="text-[9px] uppercase tracking-wider" style={{ color: '#8B8BA7' }}>day streak</p>
                    </div>
                  )}
                  <div className="flex flex-col items-center">
                    <p className="text-xl font-bold" style={{ color: '#7B72FF' }}>{completedTotal}</p>
                    <p className="text-[9px] uppercase tracking-wider" style={{ color: '#8B8BA7' }}>tasks done</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <p className="text-xl font-bold" style={{ color: '#4ECDC4' }}>{xpTotal.toLocaleString()}</p>
                    <p className="text-[9px] uppercase tracking-wider" style={{ color: '#8B8BA7' }}>XP</p>
                  </div>
                </div>
              </div>

              {/* Bottom: tier + brand */}
              <div className="flex flex-col items-center gap-3 relative z-10 mb-2">
                <div
                  className="px-4 py-1.5 rounded-full"
                  style={{ background: 'rgba(123,114,255,0.1)', border: '1px solid rgba(123,114,255,0.2)' }}
                >
                  <p className="text-xs font-medium" style={{ color: '#7B72FF' }}>
                    🌱 Level {level + 1} · {tierName}
                  </p>
                </div>
                <p className="text-[10px] font-medium tracking-[0.2em] uppercase" style={{ color: '#4A4A6A' }}>
                  MindShift — Focus made kind
                </p>
              </div>
            </div>
          </div>

          {/* Actions below card */}
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleShare}
              disabled={sharing}
              className="flex-1 py-3 rounded-2xl font-semibold text-sm focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none"
              style={{ background: 'var(--color-primary)', color: '#FFFFFF', opacity: sharing ? 0.7 : 1 }}
            >
              {sharing ? 'Creating...' : copied ? 'Copied!' : '📸 Share'}
            </button>
            <button
              onClick={onClose}
              className="py-3 px-5 rounded-2xl text-sm focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:outline-none"
              style={{ background: 'var(--color-surface-card)', color: 'var(--color-text-muted)' }}
            >
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
