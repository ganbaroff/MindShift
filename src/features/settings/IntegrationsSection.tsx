/**
 * IntegrationsSection — Telegram + Google Calendar
 *
 * Telegram: link code generation + copy + disconnect.
 * Google Calendar: OAuth connect + focus blocks toggle.
 */

import { useState, useCallback } from 'react'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useMotion } from '@/shared/hooks/useMotion'
import { useStore } from '@/store'
import { supabase } from '@/shared/lib/supabase'
import { Section, Toggle } from './SettingsPrimitives'

export function IntegrationsSection() {
  const { t } = useTranslation()
  const { shouldAnimate } = useMotion()
  const {
    userId,
    telegramLinkCode, telegramLinked, generateTelegramCode, setTelegramLinked,
    calendarSyncEnabled, setCalendarSyncEnabled,
    calendarFocusBlocks, setCalendarFocusBlocks,
  } = useStore()

  const isGuest = !userId || userId.startsWith('guest_')

  const [codeCopied, setCodeCopied] = useState(false)
  const handleCopyCode = useCallback(() => {
    if (!telegramLinkCode) return
    void navigator.clipboard.writeText(`/link ${telegramLinkCode}`)
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2000)
  }, [telegramLinkCode])

  return (
    <>
      {/* Telegram */}
      <Section label={t('settings.telegram')}>
        {telegramLinked ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[16px]">✅</span>
              <p className="text-[14px] font-medium" style={{ color: 'var(--color-teal)' }}>
                {t('settings.telegramConnected')}
              </p>
            </div>
            <p className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
              {t('settings.telegramSendTo')}{' '}
              <a href="https://t.me/MindShiftBot" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-teal)' }}>
                @MindShiftBot
              </a>
            </p>
            <motion.button
              whileTap={shouldAnimate ? { scale: 0.97 } : undefined}
              onClick={() => setTelegramLinked(false)}
              className="w-full h-9 rounded-xl text-[13px] font-medium"
              style={{ backgroundColor: 'rgba(139,139,167,0.12)', color: 'var(--color-text-muted)' }}
            >
              {t('settings.telegramDisconnect')}
            </motion.button>
          </div>
        ) : telegramLinkCode ? (
          <div className="space-y-2">
            <p className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
              {t('settings.telegramSendThis')}{' '}
              <a href="https://t.me/MindShiftBot" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-teal)' }}>
                @MindShiftBot
              </a>
            </p>
            <div className="flex items-center gap-2">
              <div
                className="flex-1 h-10 rounded-xl flex items-center px-3 font-mono text-[15px] tracking-widest"
                style={{ backgroundColor: 'var(--color-surface-raised)', color: 'var(--color-text-primary)', border: '1px solid rgba(78,205,196,0.2)' }}
              >
                /link {telegramLinkCode}
              </div>
              <motion.button
                whileTap={shouldAnimate ? { scale: 0.93 } : undefined}
                onClick={handleCopyCode}
                className="h-10 px-3 rounded-xl text-[13px] font-medium"
                style={{
                  backgroundColor: codeCopied ? 'rgba(78,205,196,0.2)' : 'rgba(78,205,196,0.12)',
                  color: 'var(--color-teal)',
                }}
                aria-label="Copy link code"
              >
                {codeCopied ? t('settings.telegramCodeCopied') : t('settings.telegramCodeCopy')}
              </motion.button>
            </div>
            <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
              {t('settings.telegramCodeExpires')}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-[12px] leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              {t('settings.telegramDesc')}
            </p>
            <motion.button
              whileTap={shouldAnimate ? { scale: 0.97 } : undefined}
              onClick={generateTelegramCode}
              className="w-full h-10 rounded-xl text-[14px] font-medium"
              style={{ backgroundColor: 'rgba(78,205,196,0.12)', color: 'var(--color-teal)' }}
              aria-label="Connect Telegram"
            >
              {t('settings.connectTelegram')}
            </motion.button>
            <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
              {t('settings.telegramHowTo')}
            </p>
          </div>
        )}
      </Section>

      {/* Google Calendar */}
      <Section label={t('settings.googleCalendar')}>
        {isGuest ? (
          <p className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
            {t('settings.signInForCalendar')}
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[14px] font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  {t('settings.syncToCalendar')}
                </p>
                <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  {t('settings.calendarDesc')}
                </p>
              </div>
              <button
                onClick={async () => {
                  if (!calendarSyncEnabled) {
                    localStorage.setItem('ms_calendar_pending', '1')
                    const { error } = await supabase.auth.signInWithOAuth({
                      provider: 'google',
                      options: {
                        redirectTo: `${window.location.origin}/settings`,
                        queryParams: { prompt: 'consent', access_type: 'offline' },
                        scopes: 'https://www.googleapis.com/auth/calendar.events',
                      },
                    })
                    if (error) toast.error('Could not connect Google Calendar')
                  } else {
                    setCalendarSyncEnabled(false)
                    toast('Calendar sync disabled', { icon: '📅' })
                  }
                }}
                className="w-11 h-6 rounded-full relative transition-colors duration-200"
                style={{ background: calendarSyncEnabled ? 'var(--color-teal)' : 'var(--color-surface-raised)' }}
                aria-pressed={calendarSyncEnabled}
                aria-label="Toggle Google Calendar sync"
              >
                <motion.div
                  animate={shouldAnimate ? { x: calendarSyncEnabled ? 20 : 2 } : { x: calendarSyncEnabled ? 20 : 2 }}
                  transition={shouldAnimate ? { type: 'spring', damping: 20, stiffness: 300 } : { duration: 0 }}
                  className="absolute top-1 w-4 h-4 rounded-full bg-white"
                />
              </button>
            </div>
            {calendarSyncEnabled && (
              <motion.div
                initial={shouldAnimate ? { opacity: 0, height: 0 } : false}
                animate={shouldAnimate ? { opacity: 1, height: 'auto' } : false}
                className="overflow-hidden space-y-2"
              >
                <Toggle
                  checked={calendarFocusBlocks}
                  onChange={setCalendarFocusBlocks}
                  label={t('settings.focusBlocks')}
                />
                <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                  {t('settings.focusBlocksDesc')}
                </p>
              </motion.div>
            )}
          </div>
        )}
      </Section>
    </>
  )
}
