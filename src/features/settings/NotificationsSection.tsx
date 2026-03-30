/**
 * NotificationsSection — push notification permission + iOS install hint
 */

import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useMotion } from '@/shared/hooks/useMotion'
import { Section } from './SettingsPrimitives'

export function NotificationsSection() {
  const { t } = useTranslation()
  const { shouldAnimate } = useMotion()

  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default')
  useEffect(() => {
    if ('Notification' in window) setNotifPermission(Notification.permission)
  }, [])

  const requestNotifications = async () => {
    if (!('Notification' in window)) return
    const result = await Notification.requestPermission()
    setNotifPermission(result)
  }

  // C4 — iOS PWA: Web Push requires standalone mode (Add to Home Screen).
  // Safari tab cannot receive push notifications even with permission granted.
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as unknown as { standalone?: boolean }).standalone === true
  const needsIOSInstall = isIOS && !isStandalone

  return (
    <Section label={t('settings.reminders')}>
      {needsIOSInstall ? (
        <div
          className="p-3 rounded-xl"
          style={{ background: 'rgba(78,205,196,0.08)', border: '1px solid rgba(78,205,196,0.2)' }}
        >
          <p className="text-[13px] font-medium mb-0.5" style={{ color: 'var(--color-teal)' }}>
            {t('settings.iosInstallTitle')}
          </p>
          <p className="text-[12px] leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
            {t('settings.iosInstallDesc')}
          </p>
        </div>
      ) : notifPermission === 'granted' ? (
        <div className="flex items-center gap-2">
          <span className="text-[20px]">🔔</span>
          <p className="text-[14px]" style={{ color: 'var(--color-teal)' }}>{t('settings.remindersEnabled')}</p>
        </div>
      ) : notifPermission === 'denied' ? (
        <p className="text-[13px]" style={{ color: 'var(--color-text-muted)' }}>{t('settings.remindersBlocked')}</p>
      ) : (
        <motion.button
          whileTap={shouldAnimate ? { scale: 0.97 } : undefined}
          onClick={requestNotifications}
          className="w-full h-10 rounded-xl text-[14px] font-medium"
          style={{ backgroundColor: 'rgba(78,205,196,0.12)', color: 'var(--color-teal)' }}
        >
          🔔 {t('settings.enableReminders')}
        </motion.button>
      )}
    </Section>
  )
}
