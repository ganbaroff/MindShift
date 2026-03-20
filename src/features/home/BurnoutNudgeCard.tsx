import { memo, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useMotion } from '@/shared/hooks/useMotion'

interface BurnoutNudgeCardProps {
  score: number
}

const NUDGE_COOLDOWN_KEY = 'ms_burnout_nudge_dismissed'
const COOLDOWN_MS = 48 * 60 * 60 * 1000 // 48 hours

/**
 * BurnoutNudgeCard — proactive nudge on HomePage when burnoutScore > 60.
 * 3 gates: score > 60, not dismissed within 48h, not already visible.
 * ADHD-safe: no shame, warm language, easy dismiss.
 */
export const BurnoutNudgeCard = memo(function BurnoutNudgeCard({ score }: BurnoutNudgeCardProps) {
  const { shouldAnimate } = useMotion()
  const [dismissed, setDismissed] = useState(false)

  // Check 48h cooldown on mount
  const [coolingDown, setCoolingDown] = useState(() => {
    try {
      const raw = localStorage.getItem(NUDGE_COOLDOWN_KEY)
      if (!raw) return false
      return Date.now() - Number(raw) < COOLDOWN_MS
    } catch {
      return false
    }
  })

  // Re-check cooldown when score changes
  useEffect(() => {
    try {
      const raw = localStorage.getItem(NUDGE_COOLDOWN_KEY)
      if (!raw) { setCoolingDown(false); return }
      setCoolingDown(Date.now() - Number(raw) < COOLDOWN_MS)
    } catch {
      setCoolingDown(false)
    }
  }, [score])

  const handleDismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(NUDGE_COOLDOWN_KEY, String(Date.now()))
    } catch { /* silent */ }
  }

  if (score <= 60 || dismissed || coolingDown) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={shouldAnimate ? { opacity: 0, y: 8 } : false}
        animate={shouldAnimate ? { opacity: 1, y: 0 } : false}
        exit={shouldAnimate ? { opacity: 0, height: 0 } : undefined}
        className="rounded-2xl p-3"
        style={{
          backgroundColor: 'rgba(123,114,255,0.08)',
          border: '1px solid rgba(123,114,255,0.18)',
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5 flex-1 min-w-0">
            <span className="text-[18px] shrink-0">🌙</span>
            <div>
              <p className="text-[13px] font-semibold" style={{ color: '#C8C0FF' }}>
                It has been a quiet few days
              </p>
              <p className="text-[12px] mt-0.5 leading-relaxed" style={{ color: '#8B8BA7' }}>
                Your body might be asking for a lighter load. That is okay.
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-[11px] shrink-0 mt-0.5 focus-visible:ring-2"
            style={{ color: '#8B8BA7' }}
            aria-label="Dismiss burnout nudge"
          >
            ✕
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
})
