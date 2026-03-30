/**
 * MochiChat — Interactive AI chat with Mochi mascot
 *
 * A bottom-sheet chat interface where users can ask Mochi questions
 * and get personalized ADHD-aware advice based on their full context.
 *
 * Rules:
 * - Session-only history — never persisted (privacy first)
 * - Max 20 messages per session (visual rate limit)
 * - Crisis detection on every user message
 * - Guest users see sign-in prompt instead of chat
 * - Mobile-first: full-width on mobile, max-w-[480px] on desktop
 * - Uses `useMotion()` for animation control
 *
 * Sub-modules:
 *   mochiChatHelpers.ts  — generateId, task helpers, fetchMochiChat, ChatMessage type
 *   MochiMessageBubble   — single message bubble UI
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'motion/react'
import { Send, X, Loader2 } from 'lucide-react'
import { Mascot } from '@/shared/ui/Mascot'
import { useMotion } from '@/shared/hooks/useMotion'
import { useStore } from '@/store'
import { logError } from '@/shared/lib/logger'
import { detectCrisis, getCrisisResources } from '@/shared/lib/crisisDetection'
import type { Task } from '@/types'
import {
  generateId, getRecentTaskTitles, getUpcomingDeadlines, getActiveTaskTypes,
  fetchMochiChat,
} from './mochiChatHelpers'
import type { ChatMessage } from './mochiChatHelpers'
import { MochiMessageBubble } from './MochiMessageBubble'

// ── Types ─────────────────────────────────────────────────────────────────────

interface MochiChatProps {
  open: boolean
  onClose: () => void
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_MESSAGES = 20
const MAX_INPUT_LENGTH = 500
const HISTORY_CONTEXT_COUNT = 3

// ── Component ─────────────────────────────────────────────────────────────────

export function MochiChat({ open, onClose }: MochiChatProps) {
  const { shouldAnimate, t: transition } = useMotion()
  const { t } = useTranslation()
  const {
    userId, psychotype, energyLevel, appMode, seasonalMode,
    timeBlindness, emotionalReactivity, completedTotal, currentStreak,
    nowPool, nextPool, somedayPool,
    weeklyIntention, dailyFocusGoalMin, locale, uiTone,
  } = useStore()

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const isGuest = !userId || userId.startsWith('guest_')
  const messageCount = messages.filter(m => m.role === 'user').length
  const atLimit = messageCount >= MAX_MESSAGES

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Focus input when opened
  useEffect(() => {
    if (open && !isGuest && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [open, isGuest])

  // Welcome message on first open
  useEffect(() => {
    if (open && messages.length === 0 && !isGuest) {
      setMessages([{
        id: generateId(),
        role: 'mochi',
        text: "Hey! Tap me anytime you need a nudge, want to talk through a task, or just need someone in your corner. What's on your mind?",
        mascotState: 'encouraging',
      }])
    }
  }, [open, messages.length, isGuest])

  // Build context for AI
  const chatContext = useMemo(() => {
    const activeTasks = nowPool.filter((t: Task) => t.status === 'active')
    return {
      psychotype,
      energyLevel,
      appMode,
      seasonalMode,
      timeBlindness,
      emotionalReactivity,
      completedTotal,
      currentStreak,
      weeklyIntention,
      dailyFocusGoalMin,
      uiTone,
      activeTaskTypes: getActiveTaskTypes(nowPool),
      upcomingDeadlines: getUpcomingDeadlines([nowPool, nextPool]),
      recentTasks: getRecentTaskTitles([nowPool, nextPool]),
      nowPoolCount: activeTasks.length,
      nextPoolCount: nextPool.filter((t: Task) => t.status === 'active').length,
      somedayPoolCount: somedayPool.filter((t: Task) => t.status === 'active').length,
    }
  }, [
    psychotype, energyLevel, appMode, seasonalMode, timeBlindness,
    emotionalReactivity, completedTotal, currentStreak, weeklyIntention,
    dailyFocusGoalMin, uiTone, nowPool, nextPool, somedayPool,
  ])

  const handleSend = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || loading || atLimit) return

    // Crisis detection — show resources, do NOT send to AI
    if (detectCrisis(trimmed)) {
      const resources = getCrisisResources(locale)
      const userMsg: ChatMessage = { id: generateId(), role: 'user', text: trimmed }
      const crisisMsg: ChatMessage = {
        id: generateId(),
        role: 'mochi',
        text: `${t('mochi.crisisHear')}\n\n${resources.primary}\n${resources.international}\n\n${t('mochi.crisisAppNote')}`,
        mascotState: 'encouraging',
        isCrisis: true,
      }
      setMessages(prev => [...prev, userMsg, crisisMsg])
      setInput('')
      return
    }

    const userMsg: ChatMessage = { id: generateId(), role: 'user', text: trimmed }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const recentMessages = [...messages, userMsg]
        .slice(-HISTORY_CONTEXT_COUNT * 2)
        .map(m => ({ role: m.role, text: m.text }))

      const resp = await fetchMochiChat(trimmed, chatContext, recentMessages, locale)
      const mochiMsg: ChatMessage = {
        id: generateId(),
        role: 'mochi',
        text: resp.message,
        mascotState: resp.mascotState,
      }
      setMessages(prev => [...prev, mochiMsg])
    } catch (err) {
      logError('MochiChat.send', err)
      const fallbackMsg: ChatMessage = {
        id: generateId(),
        role: 'mochi',
        text: "I couldn't quite get that thought together. Try again in a sec?",
        mascotState: 'encouraging',
      }
      setMessages(prev => [...prev, fallbackMsg])
    } finally {
      setLoading(false)
    }
  }, [input, loading, atLimit, messages, chatContext, locale, t])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  if (!open) return null

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="mochi-backdrop"
            initial={shouldAnimate ? { opacity: 0 } : {}}
            animate={{ opacity: 1 }}
            exit={shouldAnimate ? { opacity: 0 } : {}}
            transition={transition()}
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Chat sheet */}
          <motion.div
            key="mochi-chat"
            initial={shouldAnimate ? { y: '100%' } : {}}
            animate={{ y: 0 }}
            exit={shouldAnimate ? { y: '100%' } : {}}
            transition={shouldAnimate ? { type: 'spring', damping: 28, stiffness: 300 } : { duration: 0 }}
            className="fixed bottom-0 left-0 right-0 z-50 flex justify-center"
            role="dialog"
            aria-label="Chat with Mochi"
            aria-modal="true"
          >
            <div
              className="w-full max-w-[480px] flex flex-col rounded-t-2xl overflow-hidden"
              style={{
                background: 'var(--color-surface-card)',
                maxHeight: '70vh',
                border: '1px solid rgba(123,114,255,0.15)',
                borderBottom: 'none',
                boxShadow: '0 -8px 32px rgba(0,0,0,0.4)',
              }}
            >
              {/* Header */}
              <div
                className="flex items-center gap-3 px-4 py-3 shrink-0"
                style={{ borderBottom: '1px solid rgba(123,114,255,0.1)' }}
              >
                <Mascot state="encouraging" size={32} label="Mochi" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    Mochi
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                    {t('mochi.companion')}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg focus-visible:ring-2 focus-visible:ring-[#7B72FF]"
                  style={{ color: 'var(--color-text-muted)' }}
                  aria-label={t('mochi.closeChat')}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Messages area */}
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
                style={{ minHeight: 200 }}
              >
                {isGuest ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3 py-8">
                    <Mascot state="idle" size={64} label="Mochi" />
                    <p className="text-sm text-center" style={{ color: 'var(--color-text-primary)' }}>
                      {t('mochi.wantsToHelp')}
                    </p>
                    <p className="text-xs text-center max-w-[240px]" style={{ color: 'var(--color-text-muted)' }}>
                      {t('mochi.signInForMochi')}
                    </p>
                    <button
                      onClick={() => { onClose(); window.location.href = '/auth' }}
                      className="px-4 py-2 rounded-xl text-[13px] font-medium focus-visible:ring-2 focus-visible:ring-[#7B72FF]"
                      style={{
                        background: 'linear-gradient(135deg, #7B72FF, #4ECDC4)',
                        color: '#FFFFFF',
                      }}
                    >
                      {t('mochi.signIn')}
                    </button>
                    <button
                      onClick={onClose}
                      className="text-[12px] focus-visible:ring-1 focus-visible:ring-[#7B72FF] rounded px-2 py-1"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {t('mochi.maybeLater')}
                    </button>
                  </div>
                ) : (
                  messages.map(msg => (
                    <MochiMessageBubble key={msg.id} message={msg} />
                  ))
                )}

                {/* Loading indicator */}
                {loading && (
                  <div className="flex items-start gap-2">
                    <div className="shrink-0 mt-1">
                      <Mascot state="focused" size={24} label="Mochi thinking" />
                    </div>
                    <div
                      className="px-3 py-2 rounded-2xl rounded-bl-sm"
                      style={{ background: 'var(--color-surface-raised)' }}
                    >
                      <motion.div
                        className="flex gap-1"
                        animate={shouldAnimate ? { opacity: [0.4, 1, 0.4] } : {}}
                        transition={shouldAnimate ? { duration: 1.2, repeat: Infinity } : {}}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-primary)' }} />
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-primary)' }} />
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-primary)' }} />
                      </motion.div>
                    </div>
                  </div>
                )}
              </div>

              {/* Rate limit indicator */}
              {!isGuest && messageCount > 0 && (
                <div className="px-4 py-1 text-center">
                  <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                    {atLimit
                      ? 'That\'s the limit for now — Mochi needs a rest too'
                      : `${messageCount}/${MAX_MESSAGES} messages`}
                  </p>
                </div>
              )}

              {/* Input area */}
              {!isGuest && (
                <div
                  className="flex items-center gap-2 px-3 py-3 shrink-0"
                  style={{
                    borderTop: '1px solid rgba(123,114,255,0.1)',
                    paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
                  }}
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value.slice(0, MAX_INPUT_LENGTH))}
                    onKeyDown={handleKeyDown}
                    placeholder={atLimit ? t('mochi.inputLimitReached') : t('mochi.inputPlaceholder')}
                    disabled={atLimit || loading}
                    className="flex-1 px-3 py-2 rounded-xl text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#7B72FF]"
                    style={{
                      background: 'var(--color-surface-raised)',
                      color: 'var(--color-text-primary)',
                      border: 'none',
                    }}
                    aria-label={t('mochi.inputAriaLabel')}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || atLimit || loading}
                    className="p-2 rounded-xl shrink-0 focus-visible:ring-2 focus-visible:ring-[#7B72FF] disabled:opacity-30"
                    style={{ background: 'var(--color-teal)', color: 'var(--color-bg)' }}
                    aria-label={t('mochi.sendAriaLabel')}
                  >
                    {loading ? <Loader2 size={18} className="motion-reduce:animate-none animate-spin" /> : <Send size={18} />}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
