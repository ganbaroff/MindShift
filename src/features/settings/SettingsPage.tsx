import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useMotion } from '@/shared/hooks/useMotion'
import { useStore } from '@/store'
import { PageTransition } from '@/shared/ui/PageTransition'
import { PlanSection } from './PlanSection'
import { AppearanceSection } from './AppearanceSection'
import { BehaviorSection } from './BehaviorSection'
import { AudioSection } from './AudioSection'
import { NotificationsSection } from './NotificationsSection'
import { IntegrationsSection } from './IntegrationsSection'
import { WellbeingSection } from './WellbeingSection'
import { AccountSection } from './AccountSection'

export default function SettingsPage() {
  const { shouldAnimate } = useMotion()
  const { t } = useTranslation()
  const { email } = useStore()

  return (
    <PageTransition>
      <div className="min-h-screen px-5 pb-36 pt-10" style={{ backgroundColor: 'var(--color-bg)' }}>
        <motion.div
          initial={shouldAnimate ? { opacity: 0, y: -8 } : false}
          animate={shouldAnimate ? { opacity: 1, y: 0 } : false}
        >
          <h1 className="text-[24px] font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {t('settings.title')}
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {email ?? t('settings.notSignedIn')}
          </p>
        </motion.div>

        <div className="space-y-3 mt-5">
          <PlanSection />
          <AppearanceSection />
          <BehaviorSection />
          <AudioSection />
          <NotificationsSection />
          <IntegrationsSection />
          <WellbeingSection />
          <AccountSection />
        </div>
      </div>
    </PageTransition>
  )
}
