import React, { useRef, useEffect } from 'react'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { Mascot } from '@/shared/ui/Mascot'
import { useMotion } from '@/shared/hooks/useMotion'
import { MochiMessageBubble } from './MochiMessageBubble'
import type { ChatMessage } from './mochiChatHelpers'

interface MochiMessageListProps {
  messages: ChatMessage[]
  loading: boolean
  isGuest: boolean
  onClose: () => void
}

export const MochiMessageList = React.memo(function MochiMessageList({
  messages,
  loading,
  isGuest,
  onClose,
}: MochiMessageListProps) {
  const { shouldAnimate } = useMotion()
  const { t } = useTranslation()
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  return (
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
            className="px-4 py-2 rounded-xl text-[13px] font-medium focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            style={{
              background: 'linear-gradient(135deg, var(--color-primary), var(--color-teal))',
              color: '#FFFFFF',
            }}
          >
            {t('mochi.signIn')}
          </button>
          <button
            onClick={onClose}
            className="text-[12px] focus-visible:ring-1 focus-visible:ring-[var(--color-primary)] rounded px-2 py-1"
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
  )
})
