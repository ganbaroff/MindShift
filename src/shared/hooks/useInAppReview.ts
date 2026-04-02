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
import i18n from '@/i18n'
import { toast } from 'sonner'
import { useStore } from '@/store'
import { canShare, nativeShare } from '@/shared/lib/native'
import { logEvent } from '@/shared/lib/logger'

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

    // Always stamp the cooldown — even on web — so if the user later installs
    // the native app, the review prompt doesn't fire immediately on first launch.
    markHintSeen(`review_asked:${Date.now()}`)

    const win = window as unknown as Record<string, unknown>
    if (win.Capacitor && typeof win.Capacitor === 'object') {
      // Native: trigger the OS in-app review dialog
      const plugins = (win.Capacitor as Record<string, unknown>).Plugins as Record<string, unknown> | undefined
      if (plugins?.InAppReview) {
        logEvent('in_app_review_triggered', { platform: 'native' })
        const review = plugins.InAppReview as { requestReview: () => Promise<void> }
        void review.requestReview().catch(() => { /* silently fail */ })
      }
    } else if (canShare()) {
      logEvent('in_app_review_triggered', { platform: 'web_share' })
      // Web fallback: gentle share nudge via toast.
      // Read t() from the i18n singleton at call time — no React hook needed.
      const t = i18n.t.bind(i18n)
      toast(t('review.sharePrompt'), {
        duration: 8000,
        action: {
          label: t('review.shareAction'),
          onClick: () => void nativeShare({
            title: 'MindShift',
            text: 'A focus app built for ADHD brains — no pressure, no shame.',
            url: 'https://mindshift.app',
          }),
        },
      })
    }
  }, [completedFocusSessions, energyLevel, burnoutScore, seenHints, markHintSeen])
}
