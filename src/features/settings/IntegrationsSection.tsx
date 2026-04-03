/**
 * IntegrationsSection — Telegram + Google Calendar
 *
 * Telegram: link code generation + copy + disconnect.
 * Google Calendar: OAuth connect + focus blocks toggle.
 */

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useMotion } from '@/shared/hooks/useMotion'
import { useStore } from '@/store'
import { supabase } from '@/shared/lib/supabase'
import { Section, Toggle } from './SettingsPrimitives'
import type { Task } from '@/types'

interface GcalEvent {
  id: string
  title: string
  start: string
  end: string
  allDay: boolean
  description?: string
}

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

  const { addTask } = useStore()

  const [codeCopied, setCodeCopied] = useState(false)
  const handleCopyCode = useCallback(() => {
    if (!telegramLinkCode) return
    void navigator.clipboard.writeText(`/link ${telegramLinkCode}`)
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2000)
  }, [telegramLinkCode])

  // ── Google Calendar inbound import ────────────────────────────────────────
  const [importLoading, setImportLoading] = useState(false)
  const [importEvents, setImportEvents] = useState<GcalEvent[] | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const handleFetchImport = useCallback(async () => {
    setImportLoading(true)
    setImportEvents(null)
    setSelectedIds(new Set())
    try {
      const { data, error } = await supabase.functions.invoke('gcal-inbound')
      if (error || data?.error) {
        if (data?.error === 'token_revoked') {
          toast('Calendar disconnected — reconnect in settings', { icon: '📅' })
          useStore.getState().setCalendarSyncEnabled(false)
        } else {
          toast.error(t('settings.calendarImportError'))
        }
        return
      }
      const events: GcalEvent[] = data?.events ?? []
      setImportEvents(events)
      // Pre-select all by default
      setSelectedIds(new Set(events.map(e => e.id)))
    } catch {
      toast.error(t('settings.calendarImportError'))
    } finally {
      setImportLoading(false)
    }
  }, [t])

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleImportSelected = useCallback(() => {
    if (!importEvents) return
    const toImport = importEvents.filter(e => selectedIds.has(e.id))
    if (toImport.length === 0) return

    toImport.forEach(e => {
      const startDate = e.allDay ? e.start : e.start.split('T')[0]
      const startTime = !e.allDay && e.start.includes('T')
        ? e.start.split('T')[1]?.substring(0, 5)
        : undefined
      const task: Task = {
        id: crypto.randomUUID(),
        title: e.title,
        status: 'active',
        pool: 'next',
        taskType: 'meeting',
        difficulty: 2,
        estimatedMinutes: 30,
        position: 0,
        createdAt: new Date().toISOString(),
        completedAt: null,
        dueDate: startDate || null,
        dueTime: startTime ?? null,
        note: e.description ?? undefined,
        repeat: 'none',
        googleEventId: e.id,
        snoozeCount: 0,
        parentTaskId: null,
        reminderSentAt: null,
      }
      addTask(task)
    })

    toast.success(t('settings.calendarImportAdded', { count: toImport.length }))
    setImportEvents(null)
    setSelectedIds(new Set())
  }, [importEvents, selectedIds, addTask, t])

  function formatEventDate(event: GcalEvent): string {
    const date = new Date(event.start)
    if (event.allDay) return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
    return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) +
      ' · ' + date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  }

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
                className="overflow-hidden space-y-3"
              >
                <Toggle
                  checked={calendarFocusBlocks}
                  onChange={setCalendarFocusBlocks}
                  label={t('settings.focusBlocks')}
                />
                <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                  {t('settings.focusBlocksDesc')}
                </p>

                {/* Inbound import */}
                <motion.button
                  whileTap={shouldAnimate ? { scale: 0.97 } : undefined}
                  onClick={handleFetchImport}
                  disabled={importLoading}
                  className="w-full h-9 rounded-xl text-[13px] font-medium disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/50 focus-visible:outline-none"
                  style={{ backgroundColor: 'rgba(78,205,196,0.10)', color: 'var(--color-teal)' }}
                  aria-label={t('settings.importFromCalendar')}
                >
                  {importLoading ? t('settings.calendarImporting') : `📥 ${t('settings.importFromCalendar')}`}
                </motion.button>

                {/* Event picker */}
                <AnimatePresence>
                  {importEvents !== null && (
                    <motion.div
                      initial={shouldAnimate ? { opacity: 0, height: 0 } : false}
                      animate={shouldAnimate ? { opacity: 1, height: 'auto' } : false}
                      exit={shouldAnimate ? { opacity: 0, height: 0 } : undefined}
                      className="overflow-hidden rounded-xl space-y-1 pt-1"
                    >
                      {importEvents.length === 0 ? (
                        <p className="text-[12px] text-center py-3" style={{ color: 'var(--color-text-muted)' }}>
                          {t('settings.calendarImportEmpty')}
                        </p>
                      ) : (
                        <>
                          <div className="max-h-52 overflow-y-auto space-y-1 pr-0.5">
                            {importEvents.map(event => (
                              <button
                                key={event.id}
                                onClick={() => toggleSelect(event.id)}
                                className="w-full flex items-start gap-2.5 px-3 py-2 rounded-xl text-left focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/50 focus-visible:outline-none"
                                style={{
                                  backgroundColor: selectedIds.has(event.id) ? 'rgba(78,205,196,0.08)' : 'var(--color-surface-raised)',
                                  border: `1px solid ${selectedIds.has(event.id) ? 'rgba(78,205,196,0.2)' : 'transparent'}`,
                                }}
                                aria-pressed={selectedIds.has(event.id)}
                              >
                                <span className="mt-0.5 text-[13px]" style={{ color: selectedIds.has(event.id) ? 'var(--color-teal)' : 'var(--color-text-muted)' }}>
                                  {selectedIds.has(event.id) ? '☑' : '☐'}
                                </span>
                                <span className="flex-1 min-w-0">
                                  <span className="block text-[13px] font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                                    {event.title}
                                  </span>
                                  <span className="block text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                                    {formatEventDate(event)}
                                  </span>
                                </span>
                              </button>
                            ))}
                          </div>
                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={() => { setImportEvents(null); setSelectedIds(new Set()) }}
                              className="flex-1 h-9 rounded-xl text-[13px] font-medium focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/50 focus-visible:outline-none"
                              style={{ backgroundColor: 'rgba(139,139,167,0.12)', color: 'var(--color-text-muted)' }}
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleImportSelected}
                              disabled={selectedIds.size === 0}
                              className="flex-1 h-9 rounded-xl text-[13px] font-medium disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/50 focus-visible:outline-none"
                              style={{ backgroundColor: 'rgba(78,205,196,0.15)', color: 'var(--color-teal)' }}
                            >
                              {t('settings.calendarImportAdd', { count: selectedIds.size })}
                            </button>
                          </div>
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        )}
      </Section>
    </>
  )
}
