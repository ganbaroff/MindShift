/**
 * BehaviorSection — app mode, timer style, energy, phase, rest mode, medication, daily goal
 */

import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useMotion } from '@/shared/hooks/useMotion'
import { useStore } from '@/store'
import type { EnergyLevel } from '@/types'
import EnergyPicker from '@/components/EnergyPicker'
import { Section, Chip, Toggle } from './SettingsPrimitives'

const modeKeys = ['minimal', 'habit', 'system'] as const
const timerKeys = ['countdown', 'countup', 'surprise'] as const
const phaseKeys = ['launch', 'maintain', 'recover', 'sandbox'] as const

const modeChipKeys = [
  { emoji: '🎯', labelKey: 'settings.modeMinimal', descKey: 'settings.modeMinimalDesc' },
  { emoji: '🌱', labelKey: 'settings.modeHabit',   descKey: 'settings.modeHabitDesc' },
  { emoji: '🗂️', labelKey: 'settings.modeSystem', descKey: 'settings.modeSystemDesc' },
]

const timerChipKeys = [
  { emoji: '⏱',  labelKey: 'settings.timerCountdown', descKey: 'settings.timerCountdownDesc' },
  { emoji: '⬆️', labelKey: 'settings.timerCountUp',   descKey: 'settings.timerCountUpDesc' },
  { emoji: '🎲', labelKey: 'settings.timerSurprise',  descKey: 'settings.timerSurpriseDesc' },
]

const phaseCardKeys = [
  { emoji: '🚀', labelKey: 'settings.phaseLaunch',   descKey: 'settings.phaseLaunchDesc' },
  { emoji: '🌱', labelKey: 'settings.phaseMaintain', descKey: 'settings.phaseMaintainDesc' },
  { emoji: '🛋️', labelKey: 'settings.phaseRecover', descKey: 'settings.phaseRecoverDesc' },
  { emoji: '🧪', labelKey: 'settings.phaseSandbox',  descKey: 'settings.phaseSandboxDesc' },
]

export function BehaviorSection() {
  const { t } = useTranslation()
  const { shouldAnimate } = useMotion()

  const {
    appMode, setAppMode,
    timerStyle, setTimerStyle,
    energyLevel, setEnergyLevel,
    seasonalMode, setSeasonalMode,
    flexiblePauseUntil, setFlexiblePauseUntil,
    medicationEnabled, setMedicationEnabled,
    medicationTime, setMedicationTime,
    dailyFocusGoalMin, setDailyFocusGoalMin,
  } = useStore()

  const mode  = modeKeys.indexOf(appMode)
  const timer = timerKeys.indexOf(timerStyle)
  const phase = phaseKeys.indexOf(seasonalMode)
  const restMode = flexiblePauseUntil ? new Date(flexiblePauseUntil) > new Date() : false

  return (
    <>
      {/* App Mode */}
      <Section label={t('settings.appMode')}>
        <div className="flex gap-1.5">
          {modeChipKeys.map((c, i) => (
            <Chip key={i} selected={mode === i} onClick={() => setAppMode(modeKeys[i])} emoji={c.emoji} label={t(c.labelKey)} />
          ))}
        </div>
        <p className="text-[11px] mt-1.5" style={{ color: 'var(--color-text-muted)' }}>
          {t(modeChipKeys[mode]?.descKey ?? '')}
        </p>
      </Section>

      {/* Timer */}
      <Section label={t('settings.timer')}>
        <div className="flex gap-1.5">
          {timerChipKeys.map((c, i) => (
            <Chip key={i} selected={timer === i} onClick={() => setTimerStyle(timerKeys[i])} emoji={c.emoji} label={t(c.labelKey)} />
          ))}
        </div>
        <p className="text-[11px] mt-1.5" style={{ color: 'var(--color-text-muted)' }}>
          {t(timerChipKeys[timer]?.descKey ?? '')}
        </p>
      </Section>

      {/* Energy */}
      <Section label={t('settings.energy')}>
        <EnergyPicker
          selected={energyLevel - 1}
          onSelect={(i) => setEnergyLevel((i + 1) as EnergyLevel)}
          size={40}
        />
      </Section>

      {/* Phase */}
      <Section label={t('settings.phase')}>
        <div className="grid grid-cols-2 gap-1.5">
          {phaseCardKeys.map((c, i) => (
            <motion.button
              key={i}
              whileTap={shouldAnimate ? { scale: 0.97 } : undefined}
              onClick={() => setSeasonalMode(phaseKeys[i])}
              className="p-2.5 rounded-xl text-left"
              style={{
                backgroundColor: phase === i ? 'rgba(123,114,255,0.15)' : 'var(--color-surface-raised)',
                borderWidth: phase === i ? 1.5 : 1,
                borderStyle: 'solid',
                borderColor: phase === i ? 'var(--color-primary)' : 'var(--color-border-subtle)',
              }}
            >
              <span className="text-[18px]">{c.emoji}</span>
              <p className="text-[13px] font-semibold mt-0.5" style={{ color: phase === i ? 'var(--color-primary)' : 'var(--color-text-primary)' }}>
                {t(c.labelKey)}
              </p>
              <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{t(c.descKey)}</p>
            </motion.button>
          ))}
        </div>
      </Section>

      {/* Rest Mode */}
      <Section label={t('settings.restMode')}>
        <Toggle
          checked={restMode}
          onChange={(v) => setFlexiblePauseUntil(v ? new Date(Date.now() + 24 * 3600 * 1000).toISOString() : null)}
          label={`🛋️ ${t('settings.pauseForDay')}`}
        />
      </Section>

      {/* Medication */}
      <Section label={t('settings.medication')}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[14px] font-medium" style={{ color: 'var(--color-text-primary)' }}>{t('settings.peakWindow')}</p>
              <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                {t('settings.medHighlights')}
              </p>
            </div>
            <button
              onClick={() => setMedicationEnabled(!medicationEnabled)}
              className="w-11 h-6 rounded-full relative transition-colors duration-200"
              style={{ background: medicationEnabled ? 'var(--color-primary)' : 'var(--color-surface-raised)' }}
              aria-pressed={medicationEnabled}
              aria-label="Toggle medication peak indicator"
            >
              <motion.div
                animate={shouldAnimate ? { x: medicationEnabled ? 20 : 2 } : { x: medicationEnabled ? 20 : 2 }}
                transition={shouldAnimate ? { type: 'spring', damping: 20, stiffness: 300 } : { duration: 0 }}
                className="absolute top-1 w-4 h-4 rounded-full bg-white"
              />
            </button>
          </div>
          {medicationEnabled && (
            <motion.div
              initial={shouldAnimate ? { opacity: 0, height: 0 } : false}
              animate={shouldAnimate ? { opacity: 1, height: 'auto' } : false}
              className="overflow-hidden"
            >
              <p className="text-[12px] mb-2" style={{ color: 'var(--color-text-muted)' }}>{t('settings.medWhenTake')}</p>
              <div className="flex gap-2">
                {([
                  { key: 'morning',   labelKey: 'settings.medMorning',   subKey: 'settings.medMorningSub',   emoji: '🌅' },
                  { key: 'afternoon', labelKey: 'settings.medAfternoon', subKey: 'settings.medAfternoonSub', emoji: '☀️' },
                  { key: 'evening',   labelKey: 'settings.medEvening',   subKey: 'settings.medEveningSub',   emoji: '🌆' },
                ] as const).map(({ key, labelKey, subKey, emoji }) => {
                  const sel = medicationTime === key
                  return (
                    <button
                      key={key}
                      onClick={() => setMedicationTime(sel ? null : key)}
                      className="flex-1 flex flex-col items-center gap-0.5 py-2.5 rounded-xl transition-all text-xs"
                      style={{
                        background: sel ? 'rgba(123,114,255,0.18)' : 'var(--color-surface-raised)',
                        border: `1px solid ${sel ? '#7B72FF' : 'rgba(255,255,255,0.06)'}`,
                        color: sel ? 'var(--color-primary-light)' : 'var(--color-text-muted)',
                      }}
                    >
                      <span className="text-base">{emoji}</span>
                      <span className="font-medium">{t(labelKey)}</span>
                      <span style={{ color: 'var(--color-text-muted)', fontSize: 10 }}>{t(subKey)}</span>
                    </button>
                  )
                })}
              </div>
            </motion.div>
          )}
        </div>
      </Section>

      {/* Daily Goal */}
      <Section label={t('settings.dailyGoal')}>
        <p className="text-[12px] mb-2" style={{ color: 'var(--color-text-muted)' }}>
          {t('settings.targetMinutes')}
        </p>
        <div className="flex gap-2">
          {([30, 45, 60, 90] as const).map(min => (
            <motion.button
              key={min}
              whileTap={shouldAnimate ? { scale: 0.95 } : undefined}
              onClick={() => setDailyFocusGoalMin(min)}
              className="flex-1 h-9 rounded-full text-[13px] font-medium"
              style={{
                backgroundColor: dailyFocusGoalMin === min ? 'rgba(123,114,255,0.15)' : 'var(--color-surface-raised)',
                border: `${dailyFocusGoalMin === min ? 1.5 : 1}px solid ${dailyFocusGoalMin === min ? '#7B72FF' : 'rgba(255,255,255,0.06)'}`,
                color: dailyFocusGoalMin === min ? 'var(--color-primary)' : 'var(--color-text-muted)',
              }}
            >
              {min}m
            </motion.button>
          ))}
        </div>
      </Section>
    </>
  )
}
