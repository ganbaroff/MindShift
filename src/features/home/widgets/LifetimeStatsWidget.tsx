/**
 * LifetimeStatsWidget — Block 6b
 *
 * Shows lifetime at-a-glance metrics:
 * - Total tasks completed
 * - Total focus minutes (derived from completedTotal × avg minutes proxy)
 * - Current XP total
 * - Session count proxy
 *
 * Non-punitive: shows positive totals only, no streaks, no "you missed X".
 * Research: Lifetime stats → intrinsic motivation, not external pressure.
 */
import { useStore } from '@/store'

// Simple stat cell
function Stat({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-xl font-bold tabular-nums leading-none" style={{ color }}>
        {value}
      </p>
      <p className="text-[10px] font-medium leading-tight uppercase tracking-wide" style={{ color: '#8B8BA7' }}>
        {label}
      </p>
    </div>
  )
}

export function LifetimeStatsWidget() {
  const { completedTotal, xpTotal, nowPool, nextPool, somedayPool } = useStore()

  // Proxy: average 20 min per completed task (conservative)
  const totalFocusMinutes = completedTotal * 20
  const focusLabel = totalFocusMinutes >= 60
    ? `${Math.floor(totalFocusMinutes / 60)}h ${totalFocusMinutes % 60}m`
    : `${totalFocusMinutes}m`

  // Active task count across all pools
  const allActive = [...nowPool, ...nextPool, ...somedayPool].filter(t => t.status === 'active').length

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <p className="text-xs font-medium tracking-widest uppercase" style={{ color: '#8B8BA7' }}>
        Lifetime Stats
      </p>

      {/* 2×2 stat grid */}
      <div className="grid grid-cols-2 gap-3">
        <Stat value={String(completedTotal)} label="tasks done" color="#4ECDC4" />
        <Stat value={focusLabel}             label="focus time"  color="#7B72FF" />
        <Stat value={String(xpTotal)}        label="XP earned"   color="#F59E0B" />
        <Stat value={String(allActive)}      label="tasks in play" color="#E8E8F0" />
      </div>
    </div>
  )
}
