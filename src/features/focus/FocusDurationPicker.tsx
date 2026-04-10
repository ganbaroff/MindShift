/**
 * FocusDurationPicker — Duration presets + surprise mode + custom input
 *
 * Extracted from FocusSetup.tsx (Sprint BC+1 decomposition).
 * Hidden entirely in surprise mode (O-9 full time-blindness).
 */

import { useTranslation } from 'react-i18next'

// -- Props ---------------------------------------------------------------------

export interface FocusDurationPickerProps {
  timerStyle: string
  selectedDuration: number
  setSelectedDuration: (d: number) => void
  customDuration: string
  setCustomDuration: (d: string) => void
  showCustom: boolean
  setShowCustom: (v: boolean) => void
  smartDuration: number
  TIMER_PRESETS: readonly number[]
}

export function FocusDurationPicker({
  timerStyle,
  selectedDuration,
  setSelectedDuration,
  customDuration,
  setCustomDuration,
  showCustom,
  setShowCustom,
  smartDuration,
  TIMER_PRESETS,
}: FocusDurationPickerProps) {
  const { t } = useTranslation()

  // Surprise mode — show an info card instead of presets (O-9)
  if (timerStyle === 'surprise') {
    return (
      <div
        className="mx-5 mb-6 px-4 py-3 rounded-2xl flex items-center gap-3"
        style={{ background: 'var(--color-card)', border: '1px solid var(--color-border-subtle)' }}
      >
        <span className="text-xl">🎲</span>
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
            {t('focus.surpriseMode')}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
            {t('focus.surpriseDesc')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-5 mb-6">
      <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-muted)' }}>
        {t('focus.duration')}
        <span className="ml-2 font-normal" style={{ color: 'var(--color-primary)' }}>
          ({t('focus.smart')}: {smartDuration}m)
        </span>
      </p>

      <div className="flex gap-2">
        {TIMER_PRESETS.map(min => {
          const isActive = selectedDuration === min && !showCustom
          const isRecommended = min === smartDuration
          return (
            <button
              key={min}
              onClick={() => { setSelectedDuration(min); setShowCustom(false) }}
              aria-pressed={isActive}
              aria-label={`${min} minutes${isRecommended ? ' (recommended)' : ''}`}
              className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all duration-200 relative focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:outline-none"
              style={{
                background: isActive ? 'var(--color-primary-alpha)' : 'var(--color-card)',
                border:     `1.5px solid ${isActive ? 'var(--color-primary)' : 'var(--color-border-subtle)'}`,
                color:      isActive ? 'var(--color-primary)' : 'var(--color-text)',
              }}
            >
              {min}m
              {isRecommended && (
                <span
                  className="absolute -top-1.5 -right-1.5 text-xs w-4 h-4 flex items-center justify-center rounded-full"
                  style={{ background: 'var(--color-primary)', color: 'white', fontSize: '8px' }}
                >
                  ✦
                </span>
              )}
            </button>
          )
        })}

        {/* Custom duration toggle */}
        <button
          onClick={() => setShowCustom(true)}
          aria-label="Custom duration"
          className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:outline-none"
          style={{
            background: showCustom ? 'var(--color-primary-alpha)' : 'var(--color-card)',
            border:     `1.5px solid ${showCustom ? 'var(--color-primary)' : 'var(--color-border-subtle)'}`,
            color:      showCustom ? 'var(--color-primary)' : 'var(--color-muted)',
          }}
        >
          ✎
        </button>
      </div>

      {/* Custom duration input */}
      {showCustom && (
        <div className="mt-3 flex items-center gap-2">
          <input
            type="number"
            min="1"
            max="180"
            value={customDuration}
            onChange={e => setCustomDuration(e.target.value)}
            onBlur={() => {
              const v = parseInt(customDuration)
              if (v >= 1 && v <= 180) setSelectedDuration(v)
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                const v = parseInt(customDuration)
                if (v >= 1 && v <= 180) { setSelectedDuration(v); setShowCustom(false) }
              }
            }}
            placeholder={t('focus.minutesPlaceholder')}
            autoFocus
            className="flex-1 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            style={{
              background: 'var(--color-card)',
              border: '1.5px solid var(--color-primary)',
              color: 'var(--color-text)',
            }}
          />
          <span className="text-sm" style={{ color: 'var(--color-muted)' }}>min</span>
        </div>
      )}
    </div>
  )
}
