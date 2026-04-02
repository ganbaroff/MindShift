/**
 * useInAppReview — triggers a review prompt after the 3rd focus session.
 *
 * Rules (ADHD-safe):
 *   - Only after 3+ completed sessions (user has real experience)
 *   - Only when energy >= 3 (don't bother exhausted users)
 *   - Only when burnout < 60 (not during burnout protection)
 *   - Only once per 90 days
 *   - Uses native In-App Review API on Android, falls back to nothing on web
 */

import { useEffect } from 'react'
import { useStore } from '@/store'

const REVIEW_COOLDOWN_MS = 90 * 24 * 60 * 60 * 1000 // 90 days
const MIN_SESSIONS = 3

export function useInAppReview() {
  const completedFocusSessions = useStore(s => s.completedFocusSessions)
  const energyLevel = useStore(s => s.energyLevel)
  const burnoutScore = useStore(s => s.burnoutScore)
  const seenHints = useStore(s => s.seenHints)
  const markHintSeen = useStore(s => s.markHintSeen)

  useEffect(() => {
    // Gate: enough completed focus sessions (not task completions)
    if (completedFocusSessions < MIN_SESSIONS) return

    // Gate: good mental state
    if (energyLevel < 3 || burnoutScore > 60) return

    // Gate: not asked recently
    const lastAsked = seenHints.find(h => h.startsWith('review_asked:'))
    if (lastAsked) {
      const timestamp = parseInt(lastAsked.split(':')[1], 10)
      if (Date.now() - timestamp < REVIEW_COOLDOWN_MS) return
    }

    // Try native In-App Review (Capacitor)
    // Only mark cooldown if we actually show something — web is a silent no-op,
    // so don't burn the 90-day cooldown slot there.
    const win = window as unknown as Record<string, unknown>
    if (win.Capacitor && typeof win.Capacitor === 'object') {
      const plugins = (win.Capacitor as Record<string, unknown>).Plugins as Record<string, unknown> | undefined
      if (plugins?.InAppReview) {
        const review = plugins.InAppReview as { requestReview: () => Promise<void> }
        markHintSeen(`review_asked:${Date.now()}`)
        void review.requestReview().catch(() => { /* silently fail */ })
      }
    }
    // Web: no action, no cooldown written — review only makes sense in native app
  }, [completedFocusSessions, energyLevel, burnoutScore, seenHints, markHintSeen])
}
