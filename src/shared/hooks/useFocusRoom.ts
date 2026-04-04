/**
 * useFocusRoom — Supabase Realtime presence hook for Focus Rooms (S-3/S-4).
 *
 * Creates or joins a 4-char room code.  Each participant broadcasts their
 * current focus phase so peers can see at a glance how everyone is doing.
 *
 * No DB table needed — pure Supabase Realtime channels (presence protocol).
 * Channel name: `focus-room:${code}` — auto-created on first subscribe.
 *
 * Presence payload:
 *   { phase: SessionPhase, joinedAt: number, emoji: string }
 *
 * Usage:
 *   const room = useFocusRoom()
 *   room.create()          → generates code, subscribes
 *   room.join(code)        → subscribes to existing channel
 *   room.broadcast(phase)  → update own phase in presence
 *   room.leave()           → untrack + unsubscribe
 *   room.peers             → array of { phase, emoji, userId }
 */

import { useRef, useState, useCallback, useEffect } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { useStore } from '@/store'
import { logEvent } from '@/shared/lib/logger'
import type { SessionPhase } from '@/types'
import type { RealtimeChannel } from '@supabase/supabase-js'

// Friendly emojis assigned to room participants (index % length)
const PEER_EMOJIS = ['🌱', '🌊', '🔥', '🌙', '⚡', '🦋', '🌸', '🎯']

// Pre-written encouragement messages — S-11: feels peer-to-peer without needing it
export const ROOM_ENCOURAGEMENTS = [
  "You're doing great — keep going 🌿",
  'Stay with it. The flow is coming 🌊',
  'One minute at a time 💙',
  'Your focus is inspiring ✨',
  "Almost there — you've got this 🔥",
  'The room is with you 🤝',
  'Deep work in progress 🧠',
  "You showed up — that's already a win 🌱",
]

export interface RoomPeer {
  userId: string
  phase: SessionPhase
  emoji: string
  joinedAt: number
}

export interface FocusRoomState {
  code: string | null
  peers: RoomPeer[]
  /** True for 3 min after a partner disconnects — prevents abrupt solo-drop */
  peerGrace: boolean
  status: 'idle' | 'connecting' | 'connected' | 'error'
  create: () => void
  join: (code: string) => void
  broadcast: (phase: SessionPhase) => void
  leave: () => void
}

// ── Generate a random 4-char room code ────────────────────────────────────────
function genCode(): string {
  return Math.random().toString(36).slice(2, 6).toUpperCase()
}

// ── Stable local "userId" for this browser tab ────────────────────────────────
function getTabId(): string {
  const key = 'ms_tab_id'
  let id = sessionStorage.getItem(key)
  if (!id) {
    id = crypto.randomUUID().slice(0, 8)
    sessionStorage.setItem(key, id)
  }
  return id
}

const tabId = getTabId()

export function useFocusRoom(): FocusRoomState {
  const { setLastRoomCode, setLastRoomLeftAt } = useStore()
  const [code, setCode] = useState<string | null>(null)
  const [peers, setPeers] = useState<RoomPeer[]>([])
  const [status, setStatus] = useState<FocusRoomState['status']>('idle')
  const [peerGrace, setPeerGrace] = useState(false)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const phaseRef = useRef<SessionPhase>('struggle')
  const prevPeersLengthRef = useRef(0)
  const graceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Subscribe to a channel ─────────────────────────────────────────────────
  const subscribe = useCallback((roomCode: string) => {
    setStatus('connecting')
    setCode(roomCode)

    const channel = supabase.channel(`focus-room:${roomCode}`, {
      config: { presence: { key: tabId } },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{ phase: SessionPhase; joinedAt: number }>()
        const peerList: RoomPeer[] = Object.entries(state)
          .filter(([uid]) => uid !== tabId)
          .map(([uid, metas], idx) => ({
            userId: uid,
            phase: (metas[0] as { phase: SessionPhase; joinedAt: number }).phase ?? 'struggle',
            emoji: PEER_EMOJIS[idx % PEER_EMOJIS.length],
            joinedAt: (metas[0] as { phase: SessionPhase; joinedAt: number }).joinedAt ?? Date.now(),
          }))

        // S-5 Ghosting Grace — when partner drops mid-session, show warm message
        // for 3 minutes instead of instantly silencing the room presence
        const prevLen = prevPeersLengthRef.current
        prevPeersLengthRef.current = peerList.length
        if (peerList.length === 0 && prevLen > 0) {
          setPeerGrace(true)
          if (graceTimerRef.current) clearTimeout(graceTimerRef.current)
          graceTimerRef.current = setTimeout(() => setPeerGrace(false), 3 * 60 * 1000)
        } else if (peerList.length > 0) {
          if (graceTimerRef.current) clearTimeout(graceTimerRef.current)
          setPeerGrace(false)
        }

        setPeers(peerList)
      })
      .subscribe(async (s) => {
        if (s === 'SUBSCRIBED') {
          await channel.track({ phase: phaseRef.current, joinedAt: Date.now() })
          setStatus('connected')
          logEvent('room_session_started', { peers: prevPeersLengthRef.current })
        } else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') {
          setStatus('error')
        }
      })

    channelRef.current = channel
  }, [])

  const create = useCallback(() => {
    const newCode = genCode()
    logEvent('room_created')
    subscribe(newCode)
  }, [subscribe])

  const join = useCallback((c: string) => {
    logEvent('room_joined')
    subscribe(c.trim().toUpperCase().slice(0, 6))
  }, [subscribe])

  const broadcast = useCallback((phase: SessionPhase) => {
    phaseRef.current = phase
    channelRef.current?.track({ phase, joinedAt: Date.now() })
  }, [])

  const leave = useCallback(() => {
    if (graceTimerRef.current) clearTimeout(graceTimerRef.current)
    // S-5 Ghosting Grace — persist room code before clearing so ContextRestore can show warm re-entry
    const currentCode = code
    if (currentCode) {
      setLastRoomCode(currentCode)
      setLastRoomLeftAt(new Date().toISOString())
    }
    if (channelRef.current) {
      void channelRef.current.untrack()
      void supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
    setCode(null)
    setPeers([])
    setPeerGrace(false)
    prevPeersLengthRef.current = 0
    setStatus('idle')
  }, [code, setLastRoomCode, setLastRoomLeftAt])

  // Cleanup on unmount — prevent presence leak when component navigates away
  useEffect(() => () => leave(), [leave])

  return { code, peers, peerGrace, status, create, join, broadcast, leave }
}
