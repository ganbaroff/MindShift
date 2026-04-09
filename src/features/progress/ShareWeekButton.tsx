import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useMotion } from '@/shared/hooks/useMotion'
import { useStore } from '@/store'
import { nativeShare, canShare } from '@/shared/lib/native'
import { logEvent } from '@/shared/lib/logger'

export function ShareWeekButton() {
  const { shouldAnimate } = useMotion()
  const { t } = useTranslation()
  const weeklyStats = useStore(s => s.weeklyStats)
  const completedTotal = useStore(s => s.completedTotal)

  if (!canShare()) return null

  const handleShareWeek = async () => {
    const mins = weeklyStats?.totalFocusMinutes ?? 0
    // K-factor optimized: specific number + ADHD angle + no shame = curiosity hook
    // One text works across LinkedIn (professional), Telegram (casual), Instagram (visual)
    const shareText = mins >= 60
      ? `${mins} minutes of real focus this week. No guilt trips, no fake streaks — just actual deep work. My ADHD brain finally has a system that fits. 🧠\n\nmindshift.app`
      : completedTotal > 0
      ? `${completedTotal} tasks done, one focused minute at a time. Built for ADHD brains, works for every brain. 🌱\n\nmindshift.app`
      : 'Finally found a productivity app that doesn\'t shame you for being human. Made for ADHD brains. 🌱\n\nmindshift.app'
    logEvent('weekly_share_tapped', { focus_min: mins, completed_total: completedTotal })
    await nativeShare({
      title: 'MindShift — Focus made kind',
      text: shareText,
      url: 'https://mind-shift-git-main-yusifg27-3093s-projects.vercel.app',
    })
    logEvent('weekly_share_completed', { focus_min: mins })
  }

  return (
    <motion.button
      initial={shouldAnimate ? { opacity: 0, y: 12 } : false}
      animate={shouldAnimate ? { opacity: 1, y: 0 } : false}
      transition={shouldAnimate ? { delay: 0.18 } : undefined}
      whileTap={shouldAnimate ? { scale: 0.97 } : undefined}
      onClick={() => void handleShareWeek()}
      aria-label={t('progress.shareThisWeek')}
      className="w-full py-3 rounded-2xl text-sm font-medium flex items-center justify-center gap-2 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
      style={{
        background: 'rgba(123,114,255,0.10)',
        border: '1px solid rgba(123,114,255,0.20)',
        color: 'var(--color-primary-light)',
      }}
    >
      <span>🔗</span>
      {t('progress.shareThisWeek')}
    </motion.button>
  )
}
