import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useMotion } from '@/shared/hooks/useMotion'
import { useStore } from '@/store'
import { nativeShare, canShare } from '@/shared/lib/native'

export function ShareWeekButton() {
  const { shouldAnimate } = useMotion()
  const { t } = useTranslation()
  const weeklyStats = useStore(s => s.weeklyStats)
  const completedTotal = useStore(s => s.completedTotal)

  if (!canShare()) return null

  const handleShareWeek = async () => {
    const mins = weeklyStats?.totalFocusMinutes ?? 0
    await nativeShare({
      title: 'My MindShift week 🌱',
      text: `This week I focused for ${mins} minutes and completed ${completedTotal} tasks with MindShift — ADHD-aware productivity. 💙`,
      url: 'https://mindshift-umber.vercel.app',
    })
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
        color: '#C8C0FF',
      }}
    >
      <span>🔗</span>
      {t('progress.shareThisWeek')}
    </motion.button>
  )
}
