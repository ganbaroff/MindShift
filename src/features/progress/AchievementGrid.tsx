import { memo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'motion/react'
import { useMotion } from '@/shared/hooks/useMotion'
import type { Achievement } from '@/types'

// -- Memoized badge button (guardrail #8: list-rendered components must be React.memo) --

interface AchievementBadgeProps {
  achievement: Achievement
  index: number
  isFocused: boolean
  shouldAnimate: boolean
  onToggle: (key: string) => void
}

const AchievementBadge = memo(function AchievementBadge({
  achievement: a,
  index: i,
  isFocused,
  shouldAnimate,
  onToggle,
}: AchievementBadgeProps) {
  const { t } = useTranslation()
  // Only unlocked achievements are rendered (locked hidden per Research #10)
  const name = t(`achievements.${a.key}`, a.name)
  const desc = t(`achievements.${a.key}_desc`, a.description)

  return (
    <div className="relative">
      <motion.button
        initial={shouldAnimate ? { opacity: 0, scale: 0.95 } : false}
        animate={shouldAnimate ? { opacity: 1, scale: 1 } : false}
        transition={shouldAnimate ? { delay: 0.2 + i * 0.03 } : undefined}
        whileTap={shouldAnimate ? { scale: 0.95 } : undefined}
        onClick={() => onToggle(a.key)}
        className="w-full rounded-2xl p-2.5 flex flex-col items-center"
        style={{
          backgroundColor: isFocused ? 'rgba(123,114,255,0.12)' : 'var(--color-surface-card)',
          border: `1px solid ${isFocused ? 'rgba(123,114,255,0.30)' : 'transparent'}`,
        }}
        aria-label={`${name}: ${desc}`}
        aria-expanded={isFocused}
      >
        <span className="text-[24px]">{a.emoji}</span>
        <span className="text-[10px] text-center mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{name}</span>
      </motion.button>
      <AnimatePresence>
        {isFocused && (
          <motion.div
            initial={shouldAnimate ? { opacity: 0, y: 4 } : false}
            animate={shouldAnimate ? { opacity: 1, y: 0 } : false}
            exit={shouldAnimate ? { opacity: 0, y: 4 } : undefined}
            role="region"
            aria-label={name}
            className="absolute left-0 right-0 top-full mt-1 z-10 rounded-xl px-2.5 py-2"
            style={{ backgroundColor: 'var(--color-surface-raised)', border: '1px solid rgba(123,114,255,0.20)' }}
          >
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>
              {desc}
            </p>
            {a.unlockedAt && (
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-primary)' }}>
                {'\u2713'} {new Date(a.unlockedAt).toLocaleDateString()}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}, (prev, next) =>
  prev.achievement.key === next.achievement.key &&
  prev.isFocused === next.isFocused &&
  !!prev.achievement.unlockedAt === !!next.achievement.unlockedAt &&
  prev.shouldAnimate === next.shouldAnimate &&
  prev.index === next.index
)

// -- Grid container --

interface AchievementGridProps {
  achievements: Achievement[]
}

export function AchievementGrid({ achievements }: AchievementGridProps) {
  const { shouldAnimate } = useMotion()
  const { t } = useTranslation()
  const [focusedAchievement, setFocusedAchievement] = useState<string | null>(null)
  const unlocked = achievements.filter(a => a.unlockedAt)

  const handleToggle = (key: string) => {
    setFocusedAchievement(prev => prev === key ? null : key)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>{t('progress.achievements')}</p>
        <p className="text-[11px]" style={{ color: 'var(--color-primary)' }}>{unlocked.length}</p>
      </div>
      {unlocked.length === 0 ? (
        <div
          className="rounded-2xl p-5 text-center"
          style={{ backgroundColor: 'var(--color-surface-card)' }}
        >
          <p className="text-[24px] mb-1">🌱</p>
          <p className="text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
            {t('progress.firstBadgeWaiting')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {unlocked.map((a, i) => (
            <AchievementBadge
              key={a.key}
              achievement={a}
              index={i}
              isFocused={focusedAchievement === a.key}
              shouldAnimate={shouldAnimate}
              onToggle={handleToggle}
            />
          ))}
        </div>
      )}
    </div>
  )
}
