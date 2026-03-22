import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'motion/react'
import { useMotion } from '@/shared/hooks/useMotion'
import type { Achievement } from '@/types'

interface AchievementGridProps {
  achievements: Achievement[]
}

export function AchievementGrid({ achievements }: AchievementGridProps) {
  const { shouldAnimate } = useMotion()
  const { t } = useTranslation()
  const [focusedAchievement, setFocusedAchievement] = useState<string | null>(null)
  const unlockedCount = achievements.filter(a => a.unlockedAt).length

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>{t('progress.achievements')}</p>
        <p className="text-[11px]" style={{ color: 'var(--color-primary)' }}>{unlockedCount}/{achievements.length}</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {achievements.map((a, i) => {
          const unlocked = !!a.unlockedAt
          const isFocused = focusedAchievement === a.key
          const name = t(`achievements.${a.key}`, a.name)
          const desc = t(`achievements.${a.key}_desc`, a.description)
          return (
            <div key={a.key} className="relative">
              <motion.button
                initial={shouldAnimate ? { opacity: 0, scale: 0.95 } : false}
                animate={shouldAnimate ? { opacity: 1, scale: 1 } : false}
                transition={shouldAnimate ? { delay: 0.2 + i * 0.03 } : undefined}
                whileTap={shouldAnimate ? { scale: 0.95 } : undefined}
                onClick={() => setFocusedAchievement(isFocused ? null : a.key)}
                className="w-full rounded-2xl p-2.5 flex flex-col items-center"
                style={{
                  backgroundColor: isFocused ? 'rgba(123,114,255,0.12)' : 'var(--color-surface-card)',
                  border: `1px solid ${isFocused ? 'rgba(123,114,255,0.30)' : 'transparent'}`,
                  opacity: unlocked ? 1 : 0.38,
                  filter: unlocked ? 'none' : 'grayscale(1)',
                }}
                aria-label={`${name}: ${desc}`}
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
                    className="absolute left-0 right-0 top-full mt-1 z-10 rounded-xl px-2.5 py-2"
                    style={{ backgroundColor: 'var(--color-surface-raised)', border: '1px solid rgba(123,114,255,0.20)' }}
                  >
                    <p className="text-[11px] leading-relaxed" style={{ color: unlocked ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
                      {desc}
                    </p>
                    {unlocked && a.unlockedAt && (
                      <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-primary)' }}>
                        {'\u2713'} {new Date(a.unlockedAt).toLocaleDateString()}
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </div>
  )
}
