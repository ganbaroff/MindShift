/**
 * AppearanceSection — language, theme, UI tone, accessibility, preferences
 */

import { motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import i18n from '@/i18n'
import { useMotion } from '@/shared/hooks/useMotion'
import { useStore } from '@/store'
import type { UITone } from '@/shared/lib/uiTone'
import { TONE_DESCRIPTIONS } from '@/shared/lib/uiTone'
import { Section, Toggle } from './SettingsPrimitives'

export function AppearanceSection() {
  const { t } = useTranslation()
  const { shouldAnimate } = useMotion()
  const navigate = useNavigate()

  const {
    userLocale, setUserLocale,
    userTheme, setUserTheme,
    uiTone, setUITone,
    reducedStimulation, setReducedStimulation,
    hapticsEnabled, setHapticsEnabled,
    fontScale, setFontScale,
  } = useStore()

  return (
    <>
      {/* Language */}
      <Section label={t('settings.language')}>
        <div className="flex flex-wrap gap-2">
          {[
            { code: null,  label: t('common.auto') },
            { code: 'en',  label: 'English' },
            { code: 'ru',  label: 'Русский' },
            { code: 'az',  label: 'Azərbaycanca' },
            { code: 'tr',  label: 'Türkçe' },
            { code: 'de',  label: 'Deutsch' },
            { code: 'es',  label: 'Español' },
          ].map(({ code, label }) => (
            <button
              key={code ?? 'auto'}
              onClick={() => {
                setUserLocale(code)
                i18n.changeLanguage(code ?? navigator.language.split('-')[0])
                toast.success(label === t('common.auto') ? t('settings.languageSetAuto') : `${label} selected`, { duration: 2000 })
              }}
              className="px-3 py-1.5 rounded-xl text-[13px] font-medium focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
              style={{
                background: userLocale === code ? 'rgba(123,114,255,0.15)' : 'var(--color-surface-raised)',
                color: userLocale === code ? 'var(--color-primary)' : 'var(--color-text-primary)',
                border: userLocale === code ? '1px solid rgba(123,114,255,0.3)' : '1px solid transparent',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </Section>

      {/* Theme */}
      <Section label={t('settings.theme')}>
        <div className="flex gap-2">
          {([
            { key: 'dark'   as const, label: t('settings.darkTheme') },
            { key: 'light'  as const, label: t('settings.lightTheme') },
            { key: 'system' as const, label: t('settings.systemTheme') },
          ]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setUserTheme(key)}
              className="flex-1 px-3 py-2 rounded-xl text-[13px] font-medium focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
              style={{
                background: userTheme === key ? 'var(--color-primary-alpha)' : 'var(--color-surface-raised)',
                color: userTheme === key ? 'var(--color-primary)' : 'var(--color-text-primary)',
                border: userTheme === key ? '1px solid var(--color-border-accent)' : '1px solid transparent',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </Section>

      {/* Interface Style */}
      <Section label={t('settings.interfaceStyle')}>
        <div className="grid grid-cols-2 gap-1.5">
          {([
            { tone: 'neutral'    as UITone, labelKey: 'settings.toneAuto',     descKey: 'settings.toneAutoDesc' },
            { tone: 'gen_z'      as UITone, labelKey: 'settings.toneDynamic',  descKey: 'settings.toneDynamicDesc' },
            { tone: 'millennial' as UITone, labelKey: 'settings.toneBalanced', descKey: 'settings.toneBalancedDesc' },
            { tone: 'gen_x'      as UITone, labelKey: 'settings.toneClear',    descKey: 'settings.toneClearDesc' },
          ]).map(({ tone, labelKey, descKey }) => {
            const sel = uiTone === tone
            return (
              <motion.button
                key={tone}
                whileTap={shouldAnimate ? { scale: 0.97 } : undefined}
                onClick={() => {
                  setUITone(tone)
                  toast(TONE_DESCRIPTIONS[tone], {
                    duration: 2500,
                    icon: tone === 'gen_z' ? '⚡' : tone === 'millennial' ? '📊' : tone === 'gen_x' ? '📋' : '✨',
                  })
                }}
                aria-pressed={sel}
                className="p-2.5 rounded-xl text-left focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:outline-none"
                style={{
                  backgroundColor: sel ? 'rgba(123,114,255,0.15)' : 'var(--color-surface-raised)',
                  borderWidth: sel ? 1.5 : 1,
                  borderStyle: 'solid',
                  borderColor: sel ? 'var(--color-primary)' : 'var(--color-border-subtle)',
                }}
              >
                <p className="text-[13px] font-semibold" style={{ color: sel ? 'var(--color-primary)' : 'var(--color-text-primary)' }}>
                  {t(labelKey)}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{t(descKey)}</p>
              </motion.button>
            )
          })}
        </div>
      </Section>

      {/* Accessibility */}
      <Section label={t('settings.accessibility')}>
        <div className="space-y-3">
          <Toggle checked={reducedStimulation} onChange={setReducedStimulation} label={t('settings.reducedStimulation')} hint={t('settings.reducedStimulationHint', 'Dims animations and desaturates colours — easier on the eyes and senses.')} />
          <Toggle checked={hapticsEnabled} onChange={setHapticsEnabled} label={t('settings.hapticFeedback')} hint={t('settings.hapticFeedbackHint', 'Gentle vibrations on task completion and phase changes (Android only).')} />
          {/* Text size — 30-50% of ADHD users have dyslexia comorbidity */}
          <div>
            <p className="text-[13px] font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
              {t('settings.textSize')}
            </p>
            <div className="flex gap-2">
              {([
                { scale: 1    as const, label: t('settings.textSizeNormal'), sample: 'Aa' },
                { scale: 1.15 as const, label: t('settings.textSizeLarge'),  sample: 'Aa' },
                { scale: 1.3  as const, label: t('settings.textSizeXL'),     sample: 'Aa' },
              ]).map(({ scale, label, sample }) => {
                const sel = fontScale === scale
                return (
                  <motion.button
                    key={scale}
                    whileTap={shouldAnimate ? { scale: 0.97 } : undefined}
                    onClick={() => setFontScale(scale)}
                    aria-pressed={sel}
                    className="flex-1 flex flex-col items-center gap-0.5 py-2.5 rounded-xl focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:outline-none"
                    style={{
                      backgroundColor: sel ? 'rgba(78,205,196,0.12)' : 'var(--color-surface-raised)',
                      border: sel ? '1.5px solid rgba(78,205,196,0.4)' : '1px solid transparent',
                    }}
                  >
                    <span
                      style={{
                        fontSize: `${scale * 18}px`,
                        lineHeight: 1,
                        fontWeight: 700,
                        color: sel ? 'var(--color-teal)' : 'var(--color-text-primary)',
                      }}
                    >
                      {sample}
                    </span>
                    <span className="text-[11px]" style={{ color: sel ? 'var(--color-teal)' : 'var(--color-text-muted)' }}>
                      {label}
                    </span>
                  </motion.button>
                )
              })}
            </div>
          </div>
        </div>
      </Section>

      {/* Preferences */}
      <Section label={t('settings.preferences')}>
        <button
          onClick={() => navigate('/onboarding')}
          className="flex items-center gap-3 w-full h-10 rounded-xl px-3 text-[14px] font-medium focus-visible:ring-2 focus-visible:ring-[var(--color-teal)] focus-visible:outline-none"
          style={{ backgroundColor: 'rgba(78,205,196,0.08)', color: 'var(--color-teal)', border: '1px solid rgba(78,205,196,0.15)' }}
        >
          <span>🔄</span>
          <span>{t('settings.rerunSetup')}</span>
        </button>
      </Section>
    </>
  )
}
