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
import { motion, AnimatePresence } from 'motion/react'
import { X } from 'lucide-react'
import type { FocusRoomState } from '@/shared/hooks/useFocusRoom'

interface FocusRoomSheetProps {
  room: FocusRoomState
  onClose: () => void
  /** Called after create/join — triggers session start */
  onReady: () => void
}

export function FocusRoomSheet({ room, onClose, onReady }: FocusRoomSheetProps) {
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
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-40"
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl p-5 safe-bottom"
        style={{ background: '#1E2136', maxHeight: '80vh', overflowY: 'auto' }}
      >
        {/* Handle */}
        <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: 'rgba(255,255,255,0.12)' }} />

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[17px] font-bold" style={{ color: '#E8E8F0' }}>
            Focus with someone 🤝
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: '#8B8BA7' }}>
            <X size={18} />
          </button>
        </div>

        {/* ── Idle / Pick mode ─────────────────────────────────────────────── */}
        {room.status === 'idle' && mode === 'pick' && (
          <div className="space-y-3">
            <p className="text-[13px] leading-relaxed mb-4" style={{ color: '#8B8BA7' }}>
              Focus alongside someone else. You'll see their phase in real time — no chat, no distraction, just presence.
            </p>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleCreate}
              className="w-full py-3.5 rounded-2xl font-semibold text-[14px]"
              style={{ background: 'linear-gradient(135deg, #7B72FF, #8B7FF7)', color: '#fff' }}
            >
              Create a room ✦
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setMode('join')}
              className="w-full py-3 rounded-2xl font-medium text-[14px]"
              style={{ background: '#252840', border: '1px solid rgba(255,255,255,0.06)', color: '#E8E8F0' }}
            >
              Join with a code
            </motion.button>
          </div>
        )}

        {/* ── Join mode ────────────────────────────────────────────────────── */}
        {room.status === 'idle' && mode === 'join' && (
          <div className="space-y-3">
            <p className="text-[12px] mb-2" style={{ color: '#8B8BA7' }}>Enter the 4-char code your partner shared:</p>
            <input
              value={codeInput}
              onChange={e => setCodeInput(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="e.g. K7M2"
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
              whileTap={{ scale: 0.97 }}
              onClick={handleJoin}
              disabled={codeInput.trim().length < 4}
              className="w-full py-3.5 rounded-2xl font-semibold text-[14px] disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #7B72FF, #8B7FF7)', color: '#fff' }}
            >
              Join room →
            </motion.button>
            <button onClick={() => setMode('pick')} className="w-full py-1.5 text-[12px]" style={{ color: '#5A5B72' }}>
              ← Back
            </button>
          </div>
        )}

        {/* ── Connecting ───────────────────────────────────────────────────── */}
        {room.status === 'connecting' && (
          <div className="flex flex-col items-center py-8 gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#7B72FF', borderTopColor: 'transparent' }} />
            <p className="text-[13px]" style={{ color: '#8B8BA7' }}>Joining room…</p>
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
                <p className="text-[10px] uppercase tracking-widest mb-0.5" style={{ color: '#8B8BA7' }}>Room code</p>
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
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>

            {/* Peers */}
            {room.peers.length === 0 ? (
              <p className="text-[12px] text-center py-2" style={{ color: '#5A5B72' }}>
                Waiting for someone to join… share your code 🌱
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-widest" style={{ color: '#8B8BA7' }}>
                  In the room ({room.peers.length + 1})
                </p>
                {/* Self */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: '#252840' }}>
                  <span className="text-[16px]">🧠</span>
                  <span className="text-[13px] flex-1" style={{ color: '#E8E8F0' }}>You</span>
                  <div className="w-2 h-2 rounded-full" style={{ background: '#4ECDC4' }} />
                </div>
                {room.peers.map(peer => (
                  <div key={peer.userId} className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: '#252840' }}>
                    <span className="text-[16px]">{peer.emoji}</span>
                    <span className="text-[13px] flex-1" style={{ color: '#E8E8F0' }}>Partner</span>
                    <div className="w-2 h-2 rounded-full" style={{ background: phaseColor(peer.phase) }} />
                    <span className="text-[10px] capitalize" style={{ color: '#8B8BA7' }}>{peer.phase}</span>
                  </div>
                ))}
              </div>
            )}

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleStart}
              className="w-full py-3.5 rounded-2xl font-semibold text-[14px]"
              style={{ background: 'linear-gradient(135deg, #7B72FF, #4ECDC4)', color: '#fff' }}
            >
              Start session →
            </motion.button>

            <button
              onClick={() => { room.leave(); setMode('pick') }}
              className="w-full py-1.5 text-[12px] text-center"
              style={{ color: '#5A5B72' }}
            >
              Leave room
            </button>
          </div>
        )}

        {/* ── Error ────────────────────────────────────────────────────────── */}
        {room.status === 'error' && (
          <div className="text-center py-6 space-y-3">
            <p className="text-[14px]" style={{ color: '#F59E0B' }}>⚠ Couldn't connect to room</p>
            <p className="text-[12px]" style={{ color: '#8B8BA7' }}>Check your internet connection and try again.</p>
            <button
              onClick={() => { room.leave(); setMode('pick') }}
              className="px-4 py-2 rounded-xl text-[13px]"
              style={{ background: 'rgba(123,114,255,0.12)', border: '1px solid rgba(123,114,255,0.25)', color: '#7B72FF' }}
            >
              Try again
            </button>
          </div>
        )}
      </motion.div>
    </>
  )
}
