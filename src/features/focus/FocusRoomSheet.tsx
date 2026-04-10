/**
 * FocusRoomSheet — bottom sheet for creating or joining a Focus Room.
 *
 * Shown from the FocusScreen setup ("Focus with someone 🤝" button).
 * After joining/creating the session starts normally; the room persists
 * for the duration of the session via the useFocusRoom hook passed in.
 *
 * S-3: 1:1 partner / S-4: up to 4-person room / S-11: anonymous encouragement
 */

import { useState, useEffect, useRef } from 'react'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useMotion } from '@/shared/hooks/useMotion'
import { X } from 'lucide-react'
import type { FocusRoomState } from '@/shared/hooks/useFocusRoom'

interface FocusRoomSheetProps {
  room: FocusRoomState
  onClose: () => void
  /** Called after create/join — triggers session start */
  onReady: () => void
}

export function FocusRoomSheet({ room, onClose, onReady }: FocusRoomSheetProps) {
  const { shouldAnimate } = useMotion()
  const { t } = useTranslation()
  const [mode, setMode] = useState<'pick' | 'join'>('pick')
  const [codeInput, setCodeInput] = useState('')
  const [copied, setCopied] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)

  // Focus sheet on open — WCAG 2.4.3
  useEffect(() => {
    sheetRef.current?.focus()
  }, [])

  // Escape key to close — WCAG 2.1.1
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleCreate = () => {
    room.create()
  }

  const handleJoin = () => {
    if (codeInput.trim().length < 4) return
    room.join(codeInput)
  }

  const handleCopy = async () => {
    if (!room.code) return
    try {
      await navigator.clipboard.writeText(room.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard unavailable */ }
  }

  const handleCopyLink = async () => {
    if (!room.code) return
    const inviteUrl = `https://mindshift.app/focus?join=${room.code}`
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
      toast(t('focusRoom.roomLinkCopied'))
    } catch { /* clipboard unavailable */ }
  }

  const handleStart = () => {
    onClose()
    onReady()
  }

  // -- Phase dot helper — CSS custom properties (guardrail: no hardcoded colors)
  const phaseColor = (phase: string) => {
    if (phase === 'flow')    return 'var(--color-teal)'
    if (phase === 'release') return 'var(--color-gold)'
    return 'var(--color-primary)'   // struggle / idle
  }

  // Live region status for screen readers — WCAG 3.2.2
  const liveStatus =
    room.status === 'connecting' ? t('focusRoom.joining') :
    room.status === 'connected'  ? t('focusRoom.inTheRoom', { count: room.peers.length + 1 }) :
    ''

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={shouldAnimate ? { opacity: 0 } : false}
        animate={shouldAnimate ? { opacity: 1 } : false}
        exit={shouldAnimate ? { opacity: 0 } : undefined}
        className="fixed inset-0 bg-black/60 z-40"
        onClick={onClose}
        aria-label={t('common.close')}
        role="button"
      />

      {/* Sheet */}
      <motion.div
        ref={sheetRef}
        tabIndex={-1}
        initial={shouldAnimate ? { y: '100%' } : false}
        animate={shouldAnimate ? { y: 0 } : false}
        exit={shouldAnimate ? { y: '100%' } : undefined}
        transition={shouldAnimate ? { type: 'spring', damping: 28, stiffness: 300 } : { duration: 0 }}
        role="dialog"
        aria-labelledby="focus-room-title"
        aria-modal="true"
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl p-5 safe-bottom outline-none"
        style={{ background: 'var(--color-surface-card)', maxHeight: '80vh', overflowY: 'auto' }}
      >
        {/* Visually-hidden live region — status announcements for screen readers */}
        <div aria-live="polite" aria-atomic="true" className="sr-only">{liveStatus}</div>

        {/* Handle */}
        <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: 'rgba(255,255,255,0.12)' }} />

        <div className="flex items-center justify-between mb-5">
          <h2 id="focus-room-title" className="text-[17px] font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {t('focusRoom.title')} 🤝
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-1"
            style={{ color: 'var(--color-text-muted)' }}
            aria-label={t('common.close')}
          >
            <X size={18} />
          </button>
        </div>

        {/* -- Idle / Pick mode ----------------------------------------------- */}
        {room.status === 'idle' && mode === 'pick' && (
          <div className="space-y-3">
            <p className="text-[13px] leading-relaxed mb-4" style={{ color: 'var(--color-text-muted)' }}>
              {t('focusRoom.description')}
            </p>

            <motion.button
              whileTap={shouldAnimate ? { scale: 0.97 } : undefined}
              onClick={handleCreate}
              className="w-full py-3.5 rounded-2xl font-semibold text-[14px] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
              style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))', color: '#fff' }}
            >
              {t('focusRoom.createRoom')} ✦
            </motion.button>

            <motion.button
              whileTap={shouldAnimate ? { scale: 0.97 } : undefined}
              onClick={() => setMode('join')}
              className="w-full py-3 rounded-2xl font-medium text-[14px] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
              style={{ background: 'var(--color-surface-raised)', border: '1px solid rgba(255,255,255,0.06)', color: 'var(--color-text-primary)' }}
            >
              {t('focusRoom.joinWithCode')}
            </motion.button>
          </div>
        )}

        {/* -- Join mode ------------------------------------------------------ */}
        {room.status === 'idle' && mode === 'join' && (
          <div className="space-y-3">
            <p className="text-[12px] mb-2" style={{ color: 'var(--color-text-muted)' }}>{t('focusRoom.enterCode')}</p>
            <input
              value={codeInput}
              onChange={e => setCodeInput(e.target.value.toUpperCase().slice(0, 6))}
              placeholder={t('focusRoom.codePlaceholder')}
              maxLength={6}
              className="w-full rounded-xl px-4 h-12 text-center text-[20px] font-mono font-bold outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
              style={{
                background: 'var(--color-surface-raised)',
                border: '1.5px solid rgba(123,114,255,0.35)',
                color: 'var(--color-text-primary)',
                letterSpacing: '0.15em',
              }}
              autoFocus
            />
            <motion.button
              whileTap={shouldAnimate ? { scale: 0.97 } : undefined}
              onClick={handleJoin}
              disabled={codeInput.trim().length < 4}
              className="w-full py-3.5 rounded-2xl font-semibold text-[14px] disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
              style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))', color: '#fff' }}
            >
              {t('focusRoom.joinRoom')}
            </motion.button>
            <button
              onClick={() => setMode('pick')}
              className="w-full py-1.5 text-[12px] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rounded-lg"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {t('focusRoom.back')}
            </button>
          </div>
        )}

        {/* -- Connecting ----------------------------------------------------- */}
        {room.status === 'connecting' && (
          <div className="flex flex-col items-center py-8 gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin motion-reduce:animate-none" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
            <p className="text-[13px]" style={{ color: 'var(--color-text-muted)' }}>{t('focusRoom.joining')}</p>
          </div>
        )}

        {/* -- Connected — show room code & peers ----------------------------- */}
        {room.status === 'connected' && room.code && (
          <div className="space-y-4">
            {/* Room code + invite link */}
            <div
              className="px-4 py-3 rounded-2xl"
              style={{ background: 'var(--color-surface-raised)', border: '1px solid rgba(123,114,255,0.20)' }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-widest mb-0.5" style={{ color: 'var(--color-text-muted)' }}>{t('focusRoom.roomCode')}</p>
                  <p className="text-[24px] font-mono font-bold" style={{ color: 'var(--color-primary)', letterSpacing: '0.12em' }}>
                    {room.code}
                  </p>
                </div>
                <button
                  onClick={() => void handleCopy()}
                  className="px-3 py-1.5 rounded-xl text-[12px] font-medium transition-all focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                  style={{
                    background: copied ? 'rgba(78,205,196,0.15)' : 'rgba(123,114,255,0.12)',
                    border: `1px solid ${copied ? 'var(--color-teal)' : 'rgba(123,114,255,0.25)'}`,
                    color: copied ? 'var(--color-teal)' : 'var(--color-primary)',
                  }}
                >
                  {copied ? `✓ ${t('focusRoom.copied')}` : t('focusRoom.copy')}
                </button>
              </div>
              {/* Copy invite link — secondary, muted (not a primary CTA) */}
              <button
                onClick={() => void handleCopyLink()}
                aria-label={t('focusRoom.copyInviteLink')}
                className="mt-2 w-full py-1.5 rounded-xl text-[12px] font-medium transition-all focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] text-center"
                style={{
                  background: linkCopied ? 'rgba(78,205,196,0.10)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${linkCopied ? 'rgba(78,205,196,0.30)' : 'rgba(255,255,255,0.08)'}`,
                  color: linkCopied ? 'var(--color-teal)' : 'var(--color-text-muted)',
                }}
              >
                {linkCopied ? `✓ ${t('focusRoom.roomLinkCopied')}` : t('focusRoom.copyInviteLink')}
              </button>
            </div>

            {/* Peers */}
            {room.peers.length === 0 ? (
              <p className="text-[12px] text-center py-2" style={{ color: 'var(--color-text-muted)' }}>
                {t('focusRoom.waitingForSomeone')} 🌱
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
                  {t('focusRoom.inTheRoom', { count: room.peers.length + 1 })}
                </p>
                {/* Self */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'var(--color-surface-raised)' }}>
                  <span className="text-[16px]">🧠</span>
                  <span className="text-[13px] flex-1" style={{ color: 'var(--color-text-primary)' }}>{t('focusRoom.you')}</span>
                  <div className="w-2 h-2 rounded-full" style={{ background: 'var(--color-teal)' }} aria-label={t('focusRoom.yourPhase')} />
                </div>
                {room.peers.map(peer => (
                  <div key={peer.userId} className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'var(--color-surface-raised)' }}>
                    <span className="text-[16px]">{peer.emoji}</span>
                    <span className="text-[13px] flex-1" style={{ color: 'var(--color-text-primary)' }}>{t('focusRoom.partner')}</span>
                    <div className="w-2 h-2 rounded-full" style={{ background: phaseColor(peer.phase) }} aria-label={peer.phase} />
                    <span className="text-[10px] capitalize" style={{ color: 'var(--color-text-muted)' }}>{peer.phase}</span>
                  </div>
                ))}
              </div>
            )}

            <motion.button
              whileTap={shouldAnimate ? { scale: 0.97 } : undefined}
              onClick={handleStart}
              className="w-full py-3.5 rounded-2xl font-semibold text-[14px] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
              style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-teal))', color: '#fff' }}
            >
              {t('focusRoom.startSession')}
            </motion.button>

            <button
              onClick={() => { room.leave(); setMode('pick') }}
              className="w-full py-1.5 text-[12px] text-center focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rounded-lg"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {t('focusRoom.leaveRoom')}
            </button>
          </div>
        )}

        {/* -- Error ---------------------------------------------------------- */}
        {room.status === 'error' && (
          <div className="text-center py-6 space-y-3">
            <p className="text-[14px]" style={{ color: 'var(--color-gold)' }}>⚠ {t('focusRoom.connectionError')}</p>
            <p className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>{t('focusRoom.checkInternet')}</p>
            <button
              onClick={() => { room.leave(); setMode('pick') }}
              className="px-4 py-2 rounded-xl text-[13px] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
              style={{ background: 'rgba(123,114,255,0.12)', border: '1px solid rgba(123,114,255,0.25)', color: 'var(--color-primary)' }}
            >
              {t('focusRoom.tryAgain')}
            </button>
          </div>
        )}
      </motion.div>
    </>
  )
}
