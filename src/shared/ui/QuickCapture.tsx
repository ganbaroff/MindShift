/**
 * QuickCapture — single-field smart task input.
 *
 * Parses natural language (EN + RU) into task type, date, time.
 * Shows parsed fields as teal/indigo chips for confirmation.
 * One tap to submit. "More options" opens full AddTaskModal.
 */

import { useState, useCallback, useRef, useEffect, memo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Send, X, ChevronDown, Mic, MicOff } from 'lucide-react'
import { useMotion } from '@/shared/hooks/useMotion'
import { useTranslation } from 'react-i18next'
import { parseQuickInput, type ParsedTask, type TaskType } from '@/shared/lib/quickParse'
import { todayISO } from '@/shared/lib/dateUtils'

// Voice input support detection
const voiceSupported = typeof window !== 'undefined' &&
  ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

const TYPE_CHIPS: Record<TaskType, { emoji: string }> = {
  task:     { emoji: '✅' },
  idea:     { emoji: '💡' },
  reminder: { emoji: '🔔' },
  meeting:  { emoji: '🤝' },
}

interface QuickCaptureProps {
  onSubmit: (parsed: ParsedTask) => void
  onExpand?: (parsed: ParsedTask) => void
  placeholder?: string
}

function Chip({ label, onRemove }: { label: string; onRemove?: () => void }) {
  const { shouldAnimate } = useMotion()
  return (
    <motion.span
      initial={shouldAnimate ? { scale: 0.8, opacity: 0 } : false}
      animate={{ scale: 1, opacity: 1 }}
      exit={shouldAnimate ? { scale: 0.8, opacity: 0 } : {}}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium"
      style={{
        background: 'rgba(78,205,196,0.12)',
        color: 'var(--color-teal)',
        border: '1px solid rgba(78,205,196,0.2)',
      }}
    >
      {label}
      {onRemove && (
        <button
          onClick={onRemove}
          className="hover:opacity-70 focus-visible:ring-1 focus-visible:ring-[#4ECDC4] rounded"
          aria-label={`Remove ${label}`}
        >
          <X size={10} />
        </button>
      )}
    </motion.span>
  )
}

const MemoChip = memo(Chip)

function QuickCaptureInner({ onSubmit, onExpand, placeholder }: QuickCaptureProps) {
  const { shouldAnimate, t } = useMotion()
  const { t: i18nT } = useTranslation()
  const [text, setText] = useState('')
  const [parsed, setParsed] = useState<ParsedTask | null>(null)
  const [listening, setListening] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const inputRef = useRef<HTMLInputElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)

  // Voice input handler
  const handleVoiceTap = useCallback(() => {
    if (!voiceSupported) return
    if (listening && recognitionRef.current) {
      recognitionRef.current.stop()
      setListening(false)
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SR()
    recognition.lang = navigator.language || 'en-US'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript as string
      setText(prev => prev ? `${prev} ${transcript}` : transcript)
      setListening(false)
    }
    recognition.onerror = () => setListening(false)
    recognition.onend = () => setListening(false)
    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }, [listening])

  // Debounced parse
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!text.trim()) {
      setParsed(null)
      return
    }
    debounceRef.current = setTimeout(() => {
      setParsed(parseQuickInput(text))
    }, 200)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [text])

  const handleSubmit = useCallback(() => {
    if (!text.trim()) return
    const result = parsed ?? parseQuickInput(text)
    // When user types only a date keyword (e.g. "today", "tomorrow"), quickParse
    // strips it from the title leaving an empty string. Fall back to a generic
    // title derived from the due date so the submit is never a silent no-op.
    if (!result.title) {
      if (!result.dueDate) return
      const isTomorrow = result.dueDate !== todayISO()
      result.title = isTomorrow ? i18nT('quickCapture.taskForTomorrow') : i18nT('quickCapture.taskForToday')
    }
    onSubmit(result)
    setText('')
    setParsed(null)
    inputRef.current?.focus()
  }, [text, parsed, onSubmit])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }, [handleSubmit])

  const handleExpand = useCallback(() => {
    const result = parsed ?? (text.trim() ? parseQuickInput(text) : null)
    if (onExpand && result) {
      onExpand(result)
      setText('')
      setParsed(null)
    }
  }, [text, parsed, onExpand])

  const removeDueDate = useCallback(() => {
    if (parsed) setParsed({ ...parsed, dueDate: null })
  }, [parsed])

  const removeDueTime = useCallback(() => {
    if (parsed) setParsed({ ...parsed, dueTime: null })
  }, [parsed])

  const hasChips = parsed && (parsed.taskType !== 'task' || parsed.dueDate || parsed.dueTime)
  const showSubmit = text.trim().length > 0

  const formatDate = (iso: string): string => {
    if (iso === todayISO()) return i18nT('today.todayLabel', 'Today')
    const d = new Date(iso + 'T12:00:00')
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const formatTime = (time: string): string => {
    const [h, m] = time.split(':').map(Number)
    const period = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 || 12
    return `${h12}:${m.toString().padStart(2, '0')} ${period}`
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(30,33,54,0.8)',
        border: '1px solid rgba(123,114,255,0.12)',
      }}
    >
      {/* Input row */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? i18nT('quickCapture.placeholder', "What's on your mind?")}
          className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-[#8B8BA7]"
          style={{ color: 'var(--color-text-primary)' }}
          aria-label="Quick task input"
        />
        {/* Mic button — voice input */}
        {voiceSupported && !showSubmit && (
          <button
            onClick={handleVoiceTap}
            className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            style={{
              background: listening ? 'rgba(78,205,196,0.2)' : 'transparent',
              border: listening ? '1px solid rgba(78,205,196,0.4)' : '1px solid rgba(123,114,255,0.15)',
            }}
            aria-label={listening ? 'Stop listening' : 'Voice input'}
          >
            {listening ? <MicOff size={14} color="#4ECDC4" /> : <Mic size={14} color="#8B8BA7" />}
          </button>
        )}
        <AnimatePresence>
          {showSubmit && (
            <motion.button
              initial={shouldAnimate ? { scale: 0 } : false}
              animate={{ scale: 1 }}
              exit={shouldAnimate ? { scale: 0 } : {}}
              onClick={handleSubmit}
              className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
              style={{ background: 'var(--color-teal)' }}
              aria-label="Add task"
            >
              <Send size={14} color="#1E2136" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Parsed chips */}
      <AnimatePresence>
        {hasChips && (
          <motion.div
            initial={shouldAnimate ? { height: 0, opacity: 0 } : false}
            animate={{ height: 'auto', opacity: 1 }}
            exit={shouldAnimate ? { height: 0, opacity: 0 } : {}}
            transition={t()}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap items-center gap-1.5 px-3 pb-2.5">
              {parsed && parsed.taskType !== 'task' && (
                <MemoChip label={`${TYPE_CHIPS[parsed.taskType].emoji} ${i18nT(`quickCapture.type${parsed.taskType.charAt(0).toUpperCase()}${parsed.taskType.slice(1)}`)}`} />
              )}
              {parsed?.dueDate && (
                <MemoChip label={`📅 ${formatDate(parsed.dueDate)}`} onRemove={removeDueDate} />
              )}
              {parsed?.dueTime && (
                <MemoChip label={`🕐 ${formatTime(parsed.dueTime)}`} onRemove={removeDueTime} />
              )}
              {onExpand && (
                <button
                  onClick={handleExpand}
                  className="text-[11px] flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg focus-visible:ring-1 focus-visible:ring-[var(--color-primary)]"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  <ChevronDown size={10} />
                  {i18nT('quickCapture.moreOptions', 'More options')}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export const QuickCapture = memo(QuickCaptureInner)
