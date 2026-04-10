import { memo } from 'react'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useMotion } from '@/shared/hooks/useMotion'

interface Props {
  sessionCount: number
  installDate: string | null
}

function daysSince(iso: string | null): number {
  if (!iso) return 999
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

function getKey(count: number): { key: string; count?: number } {
  if (count >= 6) return { key: 'progress.firstWeek6' }
  if (count >= 4) return { key: 'progress.firstWeek4', count }
  if (count >= 2) return { key: 'progress.firstWeek2', count }
  return { key: 'progress.firstWeek0' }
}

export const FirstWeekCard = memo(function FirstWeekCard({ sessionCount, installDate }: Props) {
  const { t } = useTranslation()
  const { shouldAnimate } = useMotion()

  const days = daysSince(installDate)
  if (days > 7) return null

  const { key, count } = getKey(sessionCount)
  const message = t(key, count !== undefined ? { count } : {})

  const dot = sessionCount >= 6 ? '🌟' : sessionCount >= 4 ? '🌿' : sessionCount >= 2 ? '🌱' : '🌾'
  const filled = Math.min(sessionCount, 7)

  return (
    <motion.div
      initial={shouldAnimate ? { opacity: 0, y: 10 } : false}
      animate={shouldAnimate ? { opacity: 1, y: 0 } : false}
      transition={shouldAnimate ? { duration: 0.3 } : undefined}
      className="rounded-2xl px-4 py-3"
      style={{
        background: 'rgba(78,205,196,0.08)',
        border: '1px solid rgba(78,205,196,0.22)',
      }}
    >
      <div className="flex items-start gap-3">
        <span className="text-[20px] mt-0.5 shrink-0">{dot}</span>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium leading-snug" style={{ color: 'var(--color-teal)' }}>
            {message}
          </p>
          <div className="flex gap-1 mt-2">
            {Array.from({ length: 7 }, (_, i) => (
              <div
                key={i}
                className="h-1.5 flex-1 rounded-full"
                style={{
                  backgroundColor: i < filled
                    ? 'var(--color-teal)'
                    : 'rgba(78,205,196,0.18)',
                }}
              />
            ))}
          </div>
          <p className="text-[11px] mt-1.5" style={{ color: 'var(--color-text-muted)' }}>
            {filled}/7
          </p>
        </div>
      </div>
    </motion.div>
  )
})
