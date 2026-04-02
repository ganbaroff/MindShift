// ── SpicinessPicker — overwhelm selector for decompose-task granularity ──────
// Research #3 (Goblin Tools): 1 = very overwhelmed, 5 = barely overwhelmed.
// Higher spiciness = fewer, smaller decomposition steps.

import { useTranslation } from 'react-i18next'

interface SpicinesPickerProps {
  value: number
  onChange: (v: 1 | 2 | 3 | 4 | 5) => void
}

const SPICINESS_OPTIONS = [
  { value: 1 as const, labelKey: 'recovery.overwhelmVery', emoji: '😵' },
  { value: 2 as const, labelKey: 'recovery.overwhelmALot', emoji: '😰' },
  { value: 3 as const, labelKey: 'recovery.overwhelmSome', emoji: '😐' },
  { value: 4 as const, labelKey: 'recovery.overwhelmABit', emoji: '🙂' },
  { value: 5 as const, labelKey: 'recovery.overwhelmBarely', emoji: '😎' },
]

export function SpicinessPicker({ value, onChange }: SpicinesPickerProps) {
  const { t } = useTranslation()
  return (
    <div className="flex justify-center gap-2">
      {SPICINESS_OPTIONS.map(({ value: v, labelKey, emoji }) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all duration-150 focus-visible:ring-2 focus-visible:ring-[#7B72FF] focus-visible:outline-none"
          style={{
            background: value === v ? 'rgba(123,114,255,0.18)' : 'var(--color-surface-card)',
            border: `1px solid ${value === v ? 'var(--color-primary)' : 'rgba(255,255,255,0.06)'}`,
          }}
          aria-pressed={value === v}
          aria-label={`Overwhelm level: ${t(labelKey)}`}
        >
          <span className="text-base leading-none">{emoji}</span>
          <span className="text-[10px]" style={{ color: value === v ? '#C8C0FF' : 'var(--color-text-muted)' }}>{t(labelKey)}</span>
        </button>
      ))}
    </div>
  )
}
