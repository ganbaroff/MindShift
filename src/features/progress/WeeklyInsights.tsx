import { useTranslation } from 'react-i18next'

interface WeeklyInsightsProps {
  weeklyInsight: string[]
}

export function WeeklyInsights({ weeklyInsight }: WeeklyInsightsProps) {
  const { t } = useTranslation()

  return (
    <div>
      <p
        className="text-[11px] uppercase tracking-widest mb-2"
        style={{ color: 'var(--color-gold)' }}
      >
        {t('progress.weeklyInsight')}
      </p>
      <div className="space-y-1.5">
        {weeklyInsight.map((insight, i) => (
          <div
            key={i}
            className="rounded-xl p-2.5"
            style={{ backgroundColor: 'var(--color-surface-card)' }}
          >
            <p className="text-[13px]" style={{ color: 'var(--color-text-primary)' }}>
              {insight.startsWith('progress.') ? t(insight) : insight}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
