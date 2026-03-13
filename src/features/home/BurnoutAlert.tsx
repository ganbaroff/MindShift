/**
 * BurnoutAlert — Block 2
 *
 * Non-shaming, non-urgent burnout alert card.
 * Shows only when burnout score ≥ 41 (caution or burnout tier).
 *
 * Design rules (ADHD UX):
 * - ZERO shame language — no "you're failing" / "you haven't done X"
 * - Amber (caution) / Purple (burnout) — NEVER red
 * - Dismissible — never blocks the UI
 * - Calm, supportive copy
 */

import { useState, memo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { useMotion } from '@/shared/hooks/useMotion'
import { getBurnoutTier } from '@/shared/lib/burnout'

interface Props {
  score: number
}

// ── Tier content ──────────────────────────────────────────────────────────────

const TIER_CONFIG = {
  caution: {
    bg:     'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(245,158,11,0.06) 100%)',
    border: 'rgba(245,158,11,0.4)',
    color:  '#F59E0B',
    emoji:  '🌿',
    title:  'Your rhythm feels a bit stretched',
    body:   "It looks like things have been piling up. That happens — ADHD brains run in bursts, not lines. A short reset can help more than pushing through.",
    cta:    'Try a 5-minute session →',
  },
  burnout: {
    bg:     'linear-gradient(135deg, rgba(123,114,255,0.14) 0%, rgba(123,114,255,0.06) 100%)',
    border: 'rgba(123,114,255,0.45)',
    color:  '#7B72FF',
    emoji:  '🧘',
    title:  'Rest is part of the work',
    body:   "Your patterns suggest you might need a proper break — not a \"push harder\" moment. ADHD brains need recovery cycles. What's one small, gentle thing you can do right now?",
    cta:    'Take a breather first →',
  },
} as const

// ── Component ─────────────────────────────────────────────────────────────────

function BurnoutAlertInner({ score }: Props) {
  const { shouldAnimate, t } = useMotion()
  const navigate = useNavigate()
  const [dismissed, setDismissed] = useState(false)

  const tier = getBurnoutTier(score)
  if (tier === 'healthy' || dismissed) return null

  const cfg = TIER_CONFIG[tier]

  const handleCTA = () => {
    // caution tier: short focus session; burnout tier: go to focus setup (no auto-start)
    // so user can choose rest or a gentle session — not forced into a timer
    navigate(tier === 'caution' ? '/focus?quick=1' : '/focus')
    setDismissed(true)
  }

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={shouldAnimate ? { opacity: 0, y: 8 } : {}}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={t()}
          className="mx-5 mb-4 rounded-2xl p-4"
          style={{
            background: cfg.bg,
            border:     `1.5px solid ${cfg.border}`,
          }}
          role="status"
          aria-label="Wellbeing check-in"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{cfg.emoji}</span>
                <p className="text-sm font-semibold" style={{ color: cfg.color }}>
                  {cfg.title}
                </p>
              </div>
              <p className="text-xs leading-relaxed mb-3" style={{ color: '#8B8BA7' }}>
                {cfg.body}
              </p>
              <button
                className="text-xs font-semibold px-3 py-1.5 rounded-xl min-h-[36px] transition-all duration-200"
                style={{
                  background: `${cfg.color}1A`,
                  border: `1px solid ${cfg.border}`,
                  color: cfg.color,
                }}
                onClick={handleCTA}
              >
                {cfg.cta}
              </button>
            </div>
            <button
              onClick={() => setDismissed(true)}
              className="shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl"
              style={{ color: '#8B8BA7' }}
              aria-label="Dismiss wellbeing check-in"
            >
              <X size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// memo: BurnoutAlert has its own dismissed state; the score prop only changes
// when the burnout computation runs (on task/energy changes), not on every render.
export const BurnoutAlert = memo(BurnoutAlertInner)
