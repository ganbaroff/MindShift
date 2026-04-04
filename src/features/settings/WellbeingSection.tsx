/**
 * WellbeingSection — mental health resources / crisis hotlines
 */

import { useTranslation } from 'react-i18next'
import { useStore } from '@/store'
import { getCrisisResourcesByCountry, countryFromLocale } from '@/shared/lib/crisisHotlines'
import { Section, Toggle } from './SettingsPrimitives'

export function WellbeingSection() {
  const { t } = useTranslation()
  const { userCountry, mochiCompanionEnabled, setMochiCompanionEnabled } = useStore()

  return (
    <>
      {/* Mochi companion toggle */}
      <Section label="Mochi">
        <Toggle
          checked={mochiCompanionEnabled}
          onChange={setMochiCompanionEnabled}
          label={t('settings.mochiCompanion')}
        />
      </Section>

      <Section label={t('settings.mentalHealth')}>
        <div className="space-y-2">
          <p className="text-[13px] leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>
            {t('settings.crisisTitle')}
          </p>
          <div
            className="rounded-xl p-3 space-y-2"
            style={{ backgroundColor: 'rgba(78,205,196,0.06)', border: '1px solid rgba(78,205,196,0.15)' }}
          >
            {getCrisisResourcesByCountry(userCountry ?? countryFromLocale(navigator.language)).map((r, i) => (
              <div key={i}>
                <p className="text-[13px] font-medium" style={{ color: 'var(--color-teal)' }}>{r.name}</p>
                <p className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
                  {r.type === 'web' ? (
                    <a href={`https://${r.number}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)' }}>
                      {r.number}
                    </a>
                  ) : r.number}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Section>
    </>
  )
}
