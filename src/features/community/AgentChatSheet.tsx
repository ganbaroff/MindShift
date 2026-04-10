/**
 * AgentChatSheet — bottom-sheet chat with an agent
 *
 * Opens when user taps an AgentCard. Manages its own conversation
 * via useAgentChat keyed on agentSlug (clears on agent change).
 *
 * Guardrails:
 * - Rule 1: teal/indigo palette only
 * - Rule 2: motion behind useMotion()
 * - Rule 3: a11y — role=dialog, aria-labelledby, focus trap stub
 * - Rule 6: warm error copy, no shame
 * - Rule 7: 8s timeout handled in edge function; UI shows pending bubble
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useMotion } from '@/shared/hooks/useMotion'
import { useAgentChat } from './useAgentChat'
import type { CommunityAgent } from './useCommunity'

interface AgentChatSheetProps {
  agent: CommunityAgent | null
  onClose: () => void
}

export function AgentChatSheet({ agent, onClose }: AgentChatSheetProps) {
  const { shouldAnimate, t: transition } = useMotion()
  const { t } = useTranslation()

  if (!agent) return null

  return (
    <AnimatePresence>
      <AgentChatSheetInner
        agent={agent}
        onClose={onClose}
        shouldAnimate={shouldAnimate}
        motionT={transition}
        t={t}
      />
    </AnimatePresence>
  )
}

interface InnerProps {
  agent: CommunityAgent
  onClose: () => void
  shouldAnimate: boolean
  motionT: () => object
  t: (key: string, fallback: string) => string
}

function AgentChatSheetInner({ agent, onClose, shouldAnimate, motionT, t }: InnerProps) {
  const { messages, isLoading, error, sendMessage } = useAgentChat(agent.slug)
  const [inputText, setInputText] = useState('')
  const inputRef   = useRef<HTMLInputElement>(null)
  const listRef    = useRef<HTMLDivElement>(null)
  const titleId    = `agent-chat-title-${agent.id}`

  // Focus input on open
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 100)
    return () => clearTimeout(timer)
  }, [])

  // Scroll to bottom on new messages
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const handleSend = useCallback(async () => {
    if (!inputText.trim() || isLoading) return
    const text = inputText
    setInputText('')
    await sendMessage(text)
  }, [inputText, isLoading, sendMessage])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }, [handleSend])

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={shouldAnimate ? { opacity: 0 } : {}}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={shouldAnimate ? { duration: 0.2 } : { duration: 0 }}
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.5)' }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={shouldAnimate ? { y: '100%' } : {}}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={shouldAnimate ? { ...motionT(), type: 'spring', damping: 25, stiffness: 300 } : { duration: 0 }}
        className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-3xl"
        style={{
          background: 'var(--color-bg)',
          maxHeight: '75vh',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1" aria-hidden="true">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--color-text-muted)', opacity: 0.4 }} />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div
            aria-hidden="true"
            className="w-9 h-9 rounded-full flex items-center justify-center text-base"
            style={{ background: 'var(--color-surface-raised)' }}
          >
            {agent.personality.avatar_url ? (
              <img src={agent.personality.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
            ) : '🤖'}
          </div>
          <div className="flex-1 min-w-0">
            <p id={titleId} className="text-sm font-semibold truncate"
              style={{ color: 'var(--color-text-primary)' }}>
              {agent.display_name}
            </p>
            <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
              {agent.personality.specialty}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label={t('community.chatClose', 'Close chat')}
            className="w-8 h-8 rounded-full flex items-center justify-center
                       focus-visible:ring-2 focus-visible:ring-[var(--color-teal)] focus-visible:outline-none"
            style={{ background: 'var(--color-surface-raised)', color: 'var(--color-text-muted)' }}
          >
            ×
          </button>
        </div>

        {/* Messages */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3"
          style={{ minHeight: 0 }}
          role="log"
          aria-label={t('community.chatLog', 'Conversation')}
          aria-live="polite"
          aria-atomic="false"
        >
          {messages.length === 0 && (
            <p className="text-sm text-center mt-6" style={{ color: 'var(--color-text-muted)' }}>
              {agent.personality.catchphrase
                ? `"${agent.personality.catchphrase}"`
                : t('community.chatStart', 'Say something to start the conversation.')}
            </p>
          )}

          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className="max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed"
                style={msg.role === 'user' ? {
                  background: 'rgba(123,114,255,0.18)',
                  color: 'var(--color-text-primary)',
                  borderBottomRightRadius: 4,
                } : {
                  background: 'var(--color-surface-card)',
                  color: msg.pending ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                  borderBottomLeftRadius: 4,
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {/* Error */}
          {error && (
            <p
              role="alert"
              className="text-xs text-center px-2"
              style={{ color: '#D4B4FF' }}
            >
              {error}
            </p>
          )}
        </div>

        {/* Input */}
        <div className="px-4 py-3 flex gap-2 border-t"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('community.chatPlaceholder', 'Message…')}
            aria-label={t('community.chatInput', 'Message to agent')}
            maxLength={500}
            className="flex-1 rounded-xl px-3 py-2 text-sm
                       focus-visible:ring-2 focus-visible:ring-[var(--color-teal)] focus-visible:outline-none"
            style={{
              background: 'var(--color-surface-raised)',
              color: 'var(--color-text-primary)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          />
          <button
            onClick={() => void handleSend()}
            disabled={!inputText.trim() || isLoading}
            aria-label={t('community.chatSend', 'Send message')}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150
                       focus-visible:ring-2 focus-visible:ring-[var(--color-teal)] focus-visible:outline-none
                       active:scale-95 disabled:opacity-40"
            style={{
              background: 'rgba(78,205,196,0.18)',
              border: '1px solid rgba(78,205,196,0.3)',
              color: 'var(--color-teal)',
            }}
          >
            {isLoading ? '…' : t('community.chatSendBtn', 'Send')}
          </button>
        </div>
      </motion.div>
    </>
  )
}
