import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useMotion } from '@/shared/hooks/useMotion'
import { X, Mic, MicOff } from 'lucide-react'
import { toast } from 'sonner'
import { useStore } from '@/store'
import { supabase } from '@/shared/lib/supabase'
import { notifyAchievement } from '@/shared/lib/notify'
import { enqueue } from '@/shared/lib/offlineQueue'
import { ACHIEVEMENT_DEFINITIONS } from '@/types'
import type { Task } from '@/types'
import { NOW_POOL_MAX } from '@/shared/lib/constants'

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onClose: () => void
}

const PRESET_DURATIONS = [5, 15, 25, 45, 60]

export function AddTaskModal({ open, onClose }: Props) {
  const { addTask, nowPool, nextPool, userId, hasAchievement, unlockAchievement } = useStore()
  const { shouldAnimate } = useMotion()

  const [title, setTitle] = useState('')
  const [difficulty, setDifficulty] = useState<1 | 2 | 3>(2)
  const [minutes, setMinutes] = useState(25)
  const [customMinutes, setCustomMinutes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [aiSteps, setAiSteps] = useState<string[] | null>(null)
  const [loadingAi, setLoadingAi] = useState(false)

  // ── Voice input (Web Speech API) ──────────────────────────────────────────
  const [isListening, setIsListening] = useState(false)
  const [voiceSupported] = useState(() =>
    typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
  )
  const recognitionRef = useRef<ReturnType<typeof createRecognition> | null>(null)

  const handleVoiceToggle = useCallback(() => {
    if (!voiceSupported) return

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
      return
    }

    const recognition = createRecognition()
    if (!recognition) return
    recognitionRef.current = recognition

    recognition.onresult = (event: Event & { results?: SpeechRecognitionResultList }) => {
      const results = event.results
      if (!results?.length) return
      const transcript = Array.from(results)
        .map(r => r[0]?.transcript ?? '')
        .join(' ')
        .trim()
      if (transcript) {
        setTitle(prev => prev ? `${prev} ${transcript}` : transcript)
        setAiSteps(null)
        // Achievement
        if (!hasAchievement('voice_input')) {
          unlockAchievement('voice_input')
          const def = ACHIEVEMENT_DEFINITIONS.find(a => a.key === 'voice_input')
          if (def) notifyAchievement(def.name, def.emoji, def.description)
        }
      }
    }

    recognition.onerror = () => {
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.start()
    setIsListening(true)
  }, [isListening, voiceSupported, hasAchievement, unlockAchievement])

  const nowFull = nowPool.filter(t => t.status === 'active').length >= NOW_POOL_MAX

  // ── AI decomposition ─────────────────────────────────────────────────────────
  const handleDecompose = async () => {
    if (!title.trim() || loadingAi) return
    setLoadingAi(true)
    setAiSteps(null)
    try {
      const { data, error } = await supabase.functions.invoke('decompose-task', {
        body: { taskTitle: title.trim() },
      })
      if (error) throw error
      if (data?.steps && Array.isArray(data.steps)) {
        setAiSteps(data.steps as string[])
        if (typeof data.estimatedMinutes === 'number') {
          setMinutes(data.estimatedMinutes)
          setCustomMinutes('')
        }
      } else {
        toast.error('AI returned an unexpected response. Add the task manually for now.')
      }
    } catch {
      toast.error("Couldn't reach AI right now — add the task and break it down later.")
    } finally {
      setLoadingAi(false)
    }
  }

  const handleAddSteps = async () => {
    if (!aiSteps || isSubmitting) return
    setIsSubmitting(true)
    const pool = nowFull ? 'next' : 'now'
    for (let i = 0; i < aiSteps.length; i++) {
      const step = aiSteps[i]
      const stepTask: Task = {
        id: crypto.randomUUID(),
        title: step,
        pool: i === 0 ? pool : 'next',   // first step → now/next; rest → next
        status: 'active',
        difficulty,
        estimatedMinutes: Math.max(5, Math.round(minutes / aiSteps.length)),
        createdAt: new Date().toISOString(),
        completedAt: null,
        snoozeCount: 0,
        parentTaskId: null,
        position: i,
      }
      addTask(stepTask)
      if (userId) {
        const taskRow = {
          id: stepTask.id, user_id: userId, title: stepTask.title,
          pool: stepTask.pool, status: stepTask.status, difficulty: stepTask.difficulty,
          estimated_minutes: stepTask.estimatedMinutes, parent_task_id: null, position: stepTask.position,
        }
        try {
          await supabase.from('tasks').insert(taskRow as never)
        } catch {
          // Queue for offline retry
          enqueue('tasks', taskRow as Record<string, unknown>, userId)
        }
      }
    }
    resetAndClose()
  }

  const handleSubmit = async () => {
    const trimmed = title.trim()
    if (!trimmed || isSubmitting) return
    setIsSubmitting(true)

    const pool = nowFull ? 'next' : 'now'

    const newTask: Task = {
      id: crypto.randomUUID(),
      title: trimmed,
      pool,
      status: 'active',
      difficulty,
      estimatedMinutes: minutes,
      createdAt: new Date().toISOString(),
      completedAt: null,
      snoozeCount: 0,
      parentTaskId: null,
      position: pool === 'now' ? nowPool.length : nextPool.length,
    }

    addTask(newTask)

    // Persist to Supabase (with offline retry)
    if (userId) {
      const taskRow = {
        id: newTask.id,
        user_id: userId,
        title: newTask.title,
        pool: newTask.pool,
        status: newTask.status,
        difficulty: newTask.difficulty,
        estimated_minutes: newTask.estimatedMinutes,
        parent_task_id: null,
        position: newTask.position,
      }
      try {
        await supabase.from('tasks').insert(taskRow as never)
      } catch {
        // Local store already updated — queue for offline retry
        enqueue('tasks', taskRow as Record<string, unknown>, userId)
      }
    }

    resetAndClose()
  }

  const resetAndClose = () => {
    // Stop voice if active
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
    setTitle('')
    setDifficulty(2)
    setMinutes(25)
    setCustomMinutes('')
    setIsSubmitting(false)
    setAiSteps(null)
    setLoadingAi(false)
    onClose()
  }

  const handleClose = () => resetAndClose()

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0, 0, 0, 0.6)' }}
          />

          {/* Sheet — max 90svh, scrollable body, fixed footer */}
          <motion.div
            key="sheet"
            initial={!shouldAnimate ? { opacity: 0 } : { y: '100%' }}
            animate={!shouldAnimate ? { opacity: 1 } : { y: 0 }}
            exit={!shouldAnimate ? { opacity: 0 } : { y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-task-dialog-title"
            className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-3xl"
            style={{
              background: '#1E2136',
              border: '1px solid rgba(255,255,255,0.06)',
              maxHeight: '90svh',
            }}
          >
            {/* ── Handle + header (never scrolls away) ── */}
            <div className="shrink-0 flex items-center justify-between px-5 pt-5 pb-3">
              <div
                className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full"
                style={{ background: '#252840' }}
              />
              <h2 id="add-task-dialog-title" className="text-lg font-bold" style={{ color: '#E8E8F0' }}>
                Add task
              </h2>
              <button
                onClick={handleClose}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-colors duration-200"
                style={{ color: '#8B8BA7' }}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* ── Scrollable body ── */}
            <div className="flex-1 overflow-y-auto px-5 flex flex-col gap-4 pb-2">

              {/* Title input + Voice */}
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <input
                    value={title}
                    onChange={(e) => { setTitle(e.target.value); setAiSteps(null) }}
                    onKeyDown={(e) => { if (e.key === 'Enter') void handleSubmit() }}
                    placeholder={isListening ? 'Listening...' : 'What needs to be done?'}
                    autoFocus
                    className="flex-1 rounded-2xl px-4 py-3 text-base outline-none"
                    style={{
                      background: '#252840',
                      border: `1.5px solid ${isListening ? '#4ECDC4' : 'rgba(255,255,255,0.06)'}`,
                      color: '#E8E8F0',
                      caretColor: '#7B72FF',
                    }}
                    onFocus={(e) => { if (!isListening) e.currentTarget.style.borderColor = '#7B72FF' }}
                    onBlur={(e) => { if (!isListening) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }}
                  />
                  {/* Voice input button */}
                  {voiceSupported && (
                    <button
                      onClick={handleVoiceToggle}
                      className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 shrink-0"
                      style={{
                        background: isListening ? 'rgba(78,205,196,0.2)' : '#252840',
                        border: `1.5px solid ${isListening ? '#4ECDC4' : 'rgba(255,255,255,0.06)'}`,
                      }}
                      aria-label={isListening ? 'Stop recording' : 'Speak your task'}
                    >
                      {isListening ? (
                        <MicOff size={18} color="#4ECDC4" />
                      ) : (
                        <Mic size={18} color="#8B8BA7" />
                      )}
                    </button>
                  )}
                </div>
                {isListening && (
                  <p className="text-xs animate-pulse" style={{ color: '#4ECDC4' }}>
                    🎙 Listening… tap mic to stop
                  </p>
                )}

                {/* AI Decompose button */}
                {title.trim().length > 3 && !aiSteps && (
                  <button
                    onClick={() => void handleDecompose()}
                    disabled={loadingAi}
                    className="self-start flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200"
                    style={{
                      background: 'rgba(123,114,255,0.12)',
                      border: '1px solid rgba(123,114,255,0.4)',
                      color: '#7B72FF',
                    }}
                  >
                    {loadingAi ? (
                      <>
                        <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                        Breaking down...
                      </>
                    ) : '✨ Break it down for me'}
                  </button>
                )}
              </div>

              {/* AI Steps */}
              {aiSteps && (
                <div
                  className="flex flex-col gap-2 p-3 rounded-2xl"
                  style={{ background: '#252840', border: '1px solid rgba(123,114,255,0.3)' }}
                >
                  <p className="text-xs font-medium" style={{ color: '#7B72FF' }}>
                    ✨ Here's a plan:
                  </p>
                  {aiSteps.map((step, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-xs mt-0.5 shrink-0" style={{ color: '#7B72FF' }}>
                        {i + 1}.
                      </span>
                      <span className="text-sm leading-snug" style={{ color: '#E8E8F0' }}>
                        {step}
                      </span>
                    </div>
                  ))}
                  <button
                    onClick={() => void handleAddSteps()}
                    disabled={isSubmitting}
                    className="mt-1 w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
                    style={{ background: '#7B72FF', color: 'white' }}
                  >
                    {isSubmitting ? 'Adding...' : `Add ${aiSteps.length} steps to my list →`}
                  </button>
                </div>
              )}

              {/* Difficulty */}
              <div role="group" aria-labelledby="difficulty-label" className="flex flex-col gap-2">
                <span id="difficulty-label" className="text-xs font-medium tracking-wide uppercase" style={{ color: '#8B8BA7' }}>
                  Difficulty
                </span>
                <div className="flex gap-2">
                  {([1, 2, 3] as const).map(d => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      aria-pressed={difficulty === d}
                      className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
                      style={{
                        background: difficulty === d ? 'rgba(123, 114, 255, 0.18)' : '#252840',
                        border: `1.5px solid ${difficulty === d ? '#7B72FF' : 'rgba(255,255,255,0.06)'}`,
                        color: difficulty === d ? '#7B72FF' : '#8B8BA7',
                      }}
                    >
                      {d === 1 ? '🟢 Easy' : d === 2 ? '🟡 Medium' : '🟠 Hard'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div role="group" aria-labelledby="duration-label" className="flex flex-col gap-2">
                <span id="duration-label" className="text-xs font-medium tracking-wide uppercase" style={{ color: '#8B8BA7' }}>
                  Estimated time
                </span>
                <div className="flex gap-2 flex-wrap">
                  {PRESET_DURATIONS.map(d => (
                    <button
                      key={d}
                      onClick={() => { setMinutes(d); setCustomMinutes('') }}
                      aria-pressed={minutes === d && !customMinutes}
                      className="px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
                      style={{
                        background: minutes === d && !customMinutes ? 'rgba(123, 114, 255, 0.18)' : '#252840',
                        border: `1.5px solid ${minutes === d && !customMinutes ? '#7B72FF' : 'rgba(255,255,255,0.06)'}`,
                        color: minutes === d && !customMinutes ? '#7B72FF' : '#8B8BA7',
                      }}
                    >
                      {d}m
                    </button>
                  ))}
                  <input
                    type="number"
                    aria-label="Custom duration in minutes"
                    placeholder="Custom"
                    min={1}
                    max={480}
                    value={customMinutes}
                    onChange={(e) => {
                      setCustomMinutes(e.target.value)
                      const v = parseInt(e.target.value, 10)
                      if (!isNaN(v) && v > 0) setMinutes(v)
                    }}
                    className="w-20 px-3 py-2 rounded-xl text-sm outline-none"
                    style={{
                      background: customMinutes ? 'rgba(123, 114, 255, 0.18)' : '#252840',
                      border: `1.5px solid ${customMinutes ? '#7B72FF' : 'rgba(255,255,255,0.06)'}`,
                      color: '#E8E8F0',
                    }}
                  />
                </div>
              </div>

            </div>{/* end scrollable body */}

            {/* ── Footer — always visible, never scrolls away ── */}
            <div
              className="shrink-0 px-5 pt-3 pb-[calc(16px+env(safe-area-inset-bottom))]"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              {nowFull && (
                <p className="text-xs mb-2" style={{ color: '#8B8BA7' }}>
                  💙 NOW is full — this will land in NEXT, ready when you are.
                </p>
              )}
              <button
                onClick={() => void handleSubmit()}
                disabled={!title.trim() || isSubmitting}
                className="w-full py-4 rounded-2xl font-semibold text-base transition-all duration-200"
                style={{
                  background: title.trim() ? '#7B72FF' : '#252840',
                  color: title.trim() ? '#FFFFFF' : '#5A5B72',
                  cursor: title.trim() ? 'pointer' : 'default',
                }}
              >
                {isSubmitting ? 'Adding…' : nowFull ? 'Add to Next →' : 'Add to Now →'}
              </button>
            </div>

          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ── Web Speech API factory ──────────────────────────────────────────────────

interface SpeechRecognitionResultList {
  readonly length: number
  [index: number]: { readonly [0]?: { readonly transcript: string } }
}

function createRecognition() {
  const SpeechRecognition =
    (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance }).SpeechRecognition ??
    (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).webkitSpeechRecognition
  if (!SpeechRecognition) return null
  const r = new SpeechRecognition()
  r.continuous = false
  r.interimResults = false
  // Use the browser/OS language so Russian, English etc. all work
  r.lang = navigator.language || 'en-US'
  return r
}

interface SpeechRecognitionInstance {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  onresult: ((event: Event & { results?: SpeechRecognitionResultList }) => void) | null
  onerror: ((event: Event) => void) | null
  onend: (() => void) | null
}
