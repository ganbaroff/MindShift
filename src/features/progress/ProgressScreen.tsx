import { useStore } from '@/store'
import { ACHIEVEMENT_DEFINITIONS } from '@/types'

// ── XP helpers ─────────────────────────────────────────────────────────────────

function xpToLevel(xp: number): { level: number; progress: number; needed: number } {
  const level = Math.floor(xp / 100) + 1
  const progress = xp % 100
  const needed = 100
  return { level, progress, needed }
}

const AVATARS = ['🌱', '🌿', '🍀', '🌸', '🌻', '🌳']

// ── Component ─────────────────────────────────────────────────────────────────

export default function ProgressScreen() {
  const { xpTotal, avatarId, achievements } = useStore()
  const { level, progress, needed } = xpToLevel(xpTotal)
  const avatar = AVATARS[(avatarId - 1) % AVATARS.length] ?? '🌱'

  const unlocked = achievements.filter(a => a.unlockedAt !== null)

  return (
    <div className="flex flex-col pb-28">
      {/* Header */}
      <div className="px-5 pt-10 pb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#E8E8F0' }}>
          Progress 🌱
        </h1>
        <p className="text-sm mt-1" style={{ color: '#8B8BA7' }}>
          Every step counts, no matter how small.
        </p>
      </div>

      {/* Avatar + XP card */}
      <div className="mx-5 p-5 rounded-2xl mb-4" style={{ background: '#1A1D2E', border: '1.5px solid #2D3150' }}>
        <div className="flex items-center gap-4 mb-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
            style={{ background: '#252840' }}
          >
            {avatar}
          </div>
          <div>
            <p className="text-lg font-bold" style={{ color: '#E8E8F0' }}>
              Level {level}
            </p>
            <p className="text-sm" style={{ color: '#8B8BA7' }}>
              {xpTotal} XP total
            </p>
          </div>
        </div>

        {/* XP Progress bar */}
        <div>
          <div className="flex justify-between text-xs mb-1.5" style={{ color: '#8B8BA7' }}>
            <span>{progress} / {needed} XP to Level {level + 1}</span>
            <span>{Math.round((progress / needed) * 100)}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: '#252840' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${(progress / needed) * 100}%`,
                background: 'linear-gradient(90deg, #6C63FF, #4ECDC4)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mx-5 grid grid-cols-2 gap-3 mb-6">
        {[
          { label: 'Achievements', value: `${unlocked.length}/${ACHIEVEMENT_DEFINITIONS.length}`, emoji: '🏆' },
          { label: 'XP Earned', value: xpTotal.toString(), emoji: '⚡' },
        ].map(stat => (
          <div
            key={stat.label}
            className="p-4 rounded-2xl"
            style={{ background: '#1A1D2E', border: '1.5px solid #2D3150' }}
          >
            <p className="text-2xl mb-1">{stat.emoji}</p>
            <p className="text-xl font-bold" style={{ color: '#E8E8F0' }}>{stat.value}</p>
            <p className="text-xs" style={{ color: '#8B8BA7' }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Achievements */}
      <div className="px-5">
        <h2 className="text-xs font-medium tracking-widest uppercase mb-3" style={{ color: '#8B8BA7' }}>
          Achievements
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {ACHIEVEMENT_DEFINITIONS.map(def => {
            const achievement = achievements.find(a => a.key === def.key)
            const isUnlocked = !!achievement?.unlockedAt
            return (
              <div
                key={def.key}
                className="flex flex-col items-center gap-1 p-3 rounded-2xl text-center"
                style={{
                  background: isUnlocked ? 'rgba(108, 99, 255, 0.12)' : '#1A1D2E',
                  border: `1.5px solid ${isUnlocked ? 'rgba(108, 99, 255, 0.4)' : '#2D3150'}`,
                  opacity: isUnlocked ? 1 : 0.45,
                }}
                title={def.description}
              >
                <span style={{ fontSize: '1.5rem', filter: isUnlocked ? 'none' : 'grayscale(100%)' }}>
                  {def.emoji}
                </span>
                <span className="text-xs font-medium leading-tight" style={{ color: isUnlocked ? '#E8E8F0' : '#8B8BA7' }}>
                  {def.name}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
