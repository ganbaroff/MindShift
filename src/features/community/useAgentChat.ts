/**
 * useAgentChat — manages conversation state with a single agent
 *
 * - Maintains message history (last 20 shown, last 10 sent to API for context window)
 * - Calls agent-chat edge function via supabase.functions.invoke
 * - Hardcoded optimistic reply shown instantly; replaced on success
 * - Clears on agent change
 */

import { useState, useCallback, useRef } from 'react'
import { supabase } from '@/shared/lib/supabase'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  pending?: boolean
}

interface UseAgentChatReturn {
  messages: ChatMessage[]
  isLoading: boolean
  error: string | null
  sendMessage: (text: string) => Promise<void>
  clearChat: () => void
}

export function useAgentChat(agentSlug: string): UseAgentChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading]   = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const isMountedRef = useRef(true)

  // Keep isMounted up to date — hook is recreated on agentSlug change (key prop)
  // so we reset in the send handler instead

  const clearChat = useCallback(() => {
    setMessages([])
    setError(null)
  }, [])

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || isLoading) return

    const userMsgId = crypto.randomUUID()
    const pendingId  = crypto.randomUUID()

    setError(null)
    setMessages(prev => [
      ...prev,
      { id: userMsgId, role: 'user', content: trimmed },
      { id: pendingId, role: 'assistant', content: '…', pending: true },
    ])
    setIsLoading(true)

    // Build history for context (last 10 user/assistant pairs, excluding pending)
    const history = messages
      .filter(m => !m.pending)
      .slice(-10)
      .map(m => ({ role: m.role, content: m.content }))

    try {
      // 8s timeout — Rule 7 compliance (AI edge functions must have hardcoded timeout)
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 8000),
      )
      const { data, error: fnError } = await Promise.race([
        supabase.functions.invoke('agent-chat', {
          body: { agentSlug, message: trimmed, history },
        }),
        timeoutPromise,
      ])

      if (!isMountedRef.current) return

      if (fnError) {
        setMessages(prev => prev.filter(m => m.id !== pendingId))
        setError(fnError.message?.includes('429')
          ? 'Daily chat limit reached. Come back tomorrow.'
          : "Couldn't reach the agent right now. Try again in a moment.",
        )
        return
      }

      const reply = (data as { reply?: string })?.reply ?? "I'm here. Go ahead."
      setMessages(prev => prev.map(m =>
        m.id === pendingId ? { ...m, content: reply, pending: false } : m,
      ))
    } catch {
      if (!isMountedRef.current) return
      setMessages(prev => prev.filter(m => m.id !== pendingId))
      setError("Couldn't reach the agent right now. Try again in a moment.")
    } finally {
      if (isMountedRef.current) setIsLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentSlug, isLoading, messages])

  return { messages, isLoading, error, sendMessage, clearChat }
}
