/**
 * MochiMessageBubble — single message bubble in MochiChat
 *
 * Extracted from MochiChat.tsx.
 */

import { Mascot } from '@/shared/ui/Mascot'
import type { ChatMessage } from './mochiChatHelpers'

export function MochiMessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div
          className="px-3 py-2 rounded-2xl rounded-br-sm max-w-[80%]"
          style={{ background: 'var(--color-primary)' }}
        >
          <p className="text-sm leading-relaxed" style={{ color: '#FFFFFF' }}>
            {message.text}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2">
      <div className="shrink-0 mt-1">
        <Mascot
          state={message.mascotState ?? 'idle'}
          size={24}
          label="Mochi"
        />
      </div>
      <div
        className="px-3 py-2 rounded-2xl rounded-bl-sm max-w-[80%]"
        style={{
          background: message.isCrisis
            ? 'rgba(78,205,196,0.12)'
            : 'var(--color-surface-raised)',
          border: message.isCrisis
            ? '1px solid rgba(78,205,196,0.3)'
            : 'none',
        }}
      >
        <p
          className="text-sm leading-relaxed whitespace-pre-line"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {message.text}
        </p>
      </div>
    </div>
  )
}
