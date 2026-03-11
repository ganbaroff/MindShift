/**
 * BurnoutNudgeCard — Block 5b
 *
 * Shows a gentle AI-style nudge when signals indicate high burnout risk:
 * - burnoutScore ≥ 60 (burnout tier)
 * - No focus session in the last 24h
 * - Last nudge shown > 48h ago (avoids nudge fatigue)
 *
 * Design rules (ADHD UX):
 * - Zero shame language
 * - Dismissible, non-blocking
 * - Provides one clear, low-friction action (5-min session)
 * - Purple/calm palette — NEVER red
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { X } from 'lucide-react'
import { useMotion } from '@/shared/hooks/useMotion'
import { useStore } from '@/store'

const NUDGE_LAST_KEY = 'ms_burnout_nudge_last'
const NUDGE_COOLDOWN_MS = 48 * 60 * 60 * 1000  // 48h

function getNudgeLastShown(): number {
  try { return parseInt(localStorage.getItem(NUDGE_LAST_KEY) ?? '0') || 0 } catch { return 0 }
}

function recordNudgeShown() {
  try { localStorage.setItem(NUDGE_LAST_KEY, String(Date.now())) } catch { /* silent */ }
}

interface Props {
  burnoutScore: number
}

export function BurnoutNudgeCard({ burnoutScore }: Props) {
  const { lastSessionAt } = useStore()
  const { shouldAnimate, t } = useMotion()
  const [dismissed, setDismissed] = useState(false)

  // Gate: burnout score must be ≥ 60
  if (burnoutScore < 60 || dismissed) return null

  // Gate: last session must be > 24h ago (or no sessions yet)
  const hoursSinceLast = lastSessionAt
    ? (Date.now() - new Date(lastSessionAt).getTime()) / 3_600_000
    : Infinity
  if (hoursSinceLast < 24) return null

  // Gate: nudge cooldown (48h)
  if (Date.now() - getNudgeLastShown() < NUDGE_COOLDOWN_MS) return null

  const handleDismiss = () => {
    recordNudgeShown()
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
            background: 'linear-gradient(135deg, rgba(123,114,255,0.12) 0%, rgba(78,205,196,0.06) 100%)',
            border: '1.5px solid rgba(123,114,255,0.35)',
          }}
          role="status"
          aria-label="Wellbeing nudge"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">🌙</span>
                <p className="text-sm font-semibold" style={{ color: '#7B72FF' }}>
                  It's been a quiet few days
                </p>
              </div>
              <p className="text-xs leading-relaxed mb-3" style={{ color: '#8B8BA7' }}>
                No pressure — but even 5 minutes of focus can shift your energy. Small starts are real starts.
              </p>

              <div className="flex gap-2">
                <Link
                  to="/focus?quick=1"
                  onClick={handleDismiss}
                  className="text-xs font-semibold px-3 py-1.5 rounded-xl min-h-[36px] flex items-center transition-all duration-200"
                  style={{
                    background: 'rgba(123,114,255,0.15)',
                    border: '1px solid rgba(123,114,255,0.45)',
                    color: '#7B72FF',
                  }}
                >
                  Start 5 minutes →
                </Link>
                <button
                  onClick={handleDismiss}
                  className="text-xs px-3 py-1.5 rounded-xl min-h-[36px] transition-all duration-200"
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.06)',
                    color: '#8B8BA7',
                  }}
                >
                  Not now
                </button>
              </div>
            </div>

            <button
              onClick={handleDismiss}
              className="shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl"
              style={{ color: '#8B8BA7' }}
              aria-label="Dismiss nudge"
            >
              <X size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
