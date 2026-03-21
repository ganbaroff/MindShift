/**
 * FocusRoomSheet — bottom sheet for creating or joining a Focus Room.
 *
 * Shown from the FocusScreen setup ("Focus with someone 🤝" button).
 * After joining/creating the session starts normally; the room persists
 * for the duration of the session via the useFocusRoom hook passed in.
 *
 * S-3: 1:1 partner / S-4: up to 4-person room / S-11: anonymous encouragement
 */

import { useState } from 'react'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
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

  const handleStart = () => {
    onClose()
    onReady()
  }

  // ── Phase dot helper ───────────────────────────────────────────────────────
  const phaseColor = (phase: string) => {
    if (phase === 'flow')    return '#4ECDC4'
    if (phase === 'release') return '#F59E0B'
    return '#7B72FF'   // struggle / idle
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={shouldAnimate ? { opacity: 0 } : false}
        animate={shouldAnimate ? { opacity: 1 } : false}
        exit={shouldAnimate ? { opacity: 0 } : undefined}
        className="fixed inset-0 bg-black/60 z-40"
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        initial={shouldAnimate ? { y: '100%' } : false}
        animate={shouldAnimate ? { y: 0 } : false}
        exit={shouldAnimate ? { y: '100%' } : undefined}
        transition={shouldAnimate ? { type: 'spring', damping: 28, stiffness: 300 } : { duration: 0 }}
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl p-5 safe-bottom"
        style={{ background: '#1E2136', maxHeight: '80vh', overflowY: 'auto' }}
      >
        {/* Handle */}
        <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: 'rgba(255,255,255,0.12)' }} />

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[17px] font-bold" style={{ color: '#E8E8F0' }}>
            {t('focusRoom.title')} 🤝
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: '#8B8BA7' }}>
            <X size={18} />
          </button>
        </div>

        {/* ── Idle / Pick mode ─────────────────────────────────────────────── */}
        {room.status === 'idle' && mode === 'pick' && (
          <div className="space-y-3">
            <p className="text-[13px] leading-relaxed mb-4" style={{ color: '#8B8BA7' }}>
              {t('focusRoom.description')}
            </p>

            <motion.button
              whileTap={shouldAnimate ? { scale: 0.97 } : undefined}
              onClick={handleCreate}
              className="w-full py-3.5 rounded-2xl font-semibold text-[14px]"
              style={{ background: 'linear-gradient(135deg, #7B72FF, #8B7FF7)', color: '#fff' }}
            >
              {t('focusRoom.createRoom')} ✦
            </motion.button>

            <motion.button
              whileTap={shouldAnimate ? { scale: 0.97 } : undefined}
              onClick={() => setMode('join')}
              className="w-full py-3 rounded-2xl font-medium text-[14px]"
              style={{ background: '#252840', border: '1px solid rgba(255,255,255,0.06)', color: '#E8E8F0' }}
            >
              {t('focusRoom.joinWithCode')}
            </motion.button>
          </div>
        )}

        {/* ── Join mode ────────────────────────────────────────────────────── */}
        {room.status === 'idle' && mode === 'join' && (
          <div className="space-y-3">
            <p className="text-[12px] mb-2" style={{ color: '#8B8BA7' }}>{t('focusRoom.enterCode')}</p>
            <input
              value={codeInput}
              onChange={e => setCodeInput(e.target.value.toUpperCase().slice(0, 6))}
              placeholder={t('focusRoom.codePlaceholder')}
              maxLength={6}
              className="w-full rounded-xl px-4 h-12 text-center text-[20px] font-mono font-bold outline-none"
              style={{
                background: '#252840',
                border: '1.5px solid rgba(123,114,255,0.35)',
                color: '#E8E8F0',
                letterSpacing: '0.15em',
              }}
              autoFocus
            />
            <motion.button
              whileTap={shouldAnimate ? { scale: 0.97 } : undefined}
              onClick={handleJoin}
              disabled={codeInput.trim().length < 4}
              className="w-full py-3.5 rounded-2xl font-semibold text-[14px] disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #7B72FF, #8B7FF7)', color: '#fff' }}
            >
              {t('focusRoom.joinRoom')}
            </motion.button>
            <button onClick={() => setMode('pick')} className="w-full py-1.5 text-[12px]" style={{ color: '#5A5B72' }}>
              {t('focusRoom.back')}
            </button>
          </div>
        )}

        {/* ── Connecting ───────────────────────────────────────────────────── */}
        {room.status === 'connecting' && (
          <div className="flex flex-col items-center py-8 gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin motion-reduce:animate-none motion-reduce:opacity-60" style={{ borderColor: '#7B72FF', borderTopColor: 'transparent' }} />
            <p className="text-[13px]" style={{ color: '#8B8BA7' }}>{t('focusRoom.joining')}</p>
          </div>
        )}

        {/* ── Connected — show room code & peers ───────────────────────────── */}
        {room.status === 'connected' && room.code && (
          <div className="space-y-4">
            {/* Room code to share */}
            <div
              className="flex items-center justify-between px-4 py-3 rounded-2xl"
              style={{ background: '#252840', border: '1px solid rgba(123,114,255,0.20)' }}
            >
              <div>
                <p className="text-[10px] uppercase tracking-widest mb-0.5" style={{ color: '#8B8BA7' }}>{t('focusRoom.roomCode')}</p>
                <p className="text-[24px] font-mono font-bold" style={{ color: '#7B72FF', letterSpacing: '0.12em' }}>
                  {room.code}
                </p>
              </div>
              <button
                onClick={() => void handleCopy()}
                className="px-3 py-1.5 rounded-xl text-[12px] font-medium transition-all"
                style={{
                  background: copied ? 'rgba(78,205,196,0.15)' : 'rgba(123,114,255,0.12)',
                  border: `1px solid ${copied ? '#4ECDC4' : 'rgba(123,114,255,0.25)'}`,
                  color: copied ? '#4ECDC4' : '#7B72FF',
                }}
              >
                {copied ? `✓ ${t('focusRoom.copied')}` : t('focusRoom.copy')}
              </button>
            </div>

            {/* Peers */}
            {room.peers.length === 0 ? (
              <p className="text-[12px] text-center py-2" style={{ color: '#5A5B72' }}>
                {t('focusRoom.waitingForSomeone')} 🌱
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-widest" style={{ color: '#8B8BA7' }}>
                  {t('focusRoom.inTheRoom', { count: room.peers.length + 1 })}
                </p>
                {/* Self */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: '#252840' }}>
                  <span className="text-[16px]">🧠</span>
                  <span className="text-[13px] flex-1" style={{ color: '#E8E8F0' }}>{t('focusRoom.you')}</span>
                  <div className="w-2 h-2 rounded-full" style={{ background: '#4ECDC4' }} />
                </div>
                {room.peers.map(peer => (
                  <div key={peer.userId} className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: '#252840' }}>
                    <span className="text-[16px]">{peer.emoji}</span>
                    <span className="text-[13px] flex-1" style={{ color: '#E8E8F0' }}>{t('focusRoom.partner')}</span>
                    <div className="w-2 h-2 rounded-full" style={{ background: phaseColor(peer.phase) }} />
                    <span className="text-[10px] capitalize" style={{ color: '#8B8BA7' }}>{peer.phase}</span>
                  </div>
                ))}
              </div>
            )}

            <motion.button
              whileTap={shouldAnimate ? { scale: 0.97 } : undefined}
              onClick={handleStart}
              className="w-full py-3.5 rounded-2xl font-semibold text-[14px]"
              style={{ background: 'linear-gradient(135deg, #7B72FF, #4ECDC4)', color: '#fff' }}
            >
              {t('focusRoom.startSession')}
            </motion.button>

            <button
              onClick={() => { room.leave(); setMode('pick') }}
              className="w-full py-1.5 text-[12px] text-center"
              style={{ color: '#5A5B72' }}
            >
              {t('focusRoom.leaveRoom')}
            </button>
          </div>
        )}

        {/* ── Error ────────────────────────────────────────────────────────── */}
        {room.status === 'error' && (
          <div className="text-center py-6 space-y-3">
            <p className="text-[14px]" style={{ color: '#F59E0B' }}>⚠ {t('focusRoom.connectionError')}</p>
            <p className="text-[12px]" style={{ color: '#8B8BA7' }}>{t('focusRoom.checkInternet')}</p>
            <button
              onClick={() => { room.leave(); setMode('pick') }}
              className="px-4 py-2 rounded-xl text-[13px]"
              style={{ background: 'rgba(123,114,255,0.12)', border: '1px solid rgba(123,114,255,0.25)', color: '#7B72FF' }}
            >
              {t('focusRoom.tryAgain')}
            </button>
          </div>
        )}
      </motion.div>
    </>
  )
}
