import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useMotion } from '@/shared/hooks/useMotion'
import { X, Mic, MicOff, Calendar, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { useStore } from '@/store'
import { supabase } from '@/shared/lib/supabase'
import { notifyAchievement } from '@/shared/lib/notify'
import { enqueue } from '@/shared/lib/offlineQueue'
import { hapticDone } from '@/shared/lib/haptic'
import { parseClassifyResult, isLowConfidence, type ClassifyResult } from '@/shared/lib/voiceClassify'
import { ACHIEVEMENT_DEFINITIONS } from '@/types'
import type { Task } from '@/types'
import { NOW_POOL_MAX } from '@/shared/lib/constants'

// ── ICS export helpers ────────────────────────────────────────────────────────

function formatForICS(date: string, time: string | null, offsetMinutes = 0): string {
  const base = time ? `${date}T${time}:00` : `${date}T09:00:00`
  const d = new Date(base)
  d.setMinutes(d.getMinutes() + offsetMinutes)
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

function generateICS(task: Task): string {
  const start = formatForICS(task.dueDate!, task.dueTime)
  const end   = formatForICS(task.dueDate!, task.dueTime, task.estimatedMinutes)
  const diff  = task.difficulty === 1 ? 'Easy' : task.difficulty === 2 ? 'Medium' : 'Hard'
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MindShift//ADHD Planner//EN',
    'BEGIN:VEVENT',
    `UID:${task.id}@mindshift`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${task.title}`,
    `DESCRIPTION:MindShift task - ${diff}`,
    'STATUS:NEEDS-ACTION',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

export function downloadICS(task: Task): void {
  const ics = generateICS(task)
  const blob = new Blob([ics], { type: 'text/calendar' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `${task.title.slice(0, 30).replace(/[^a-z0-9]/gi, '-')}.ics`
  a.click()
  URL.revokeObjectURL(url)
  toast.success('📅 Opening in your calendar app...')
}

// ── Due-date badge helper (used also in CalendarScreen) ───────────────────────

export function getDueDateLabel(dueDate: string, dueTime: string | null): {
  label: string; color: string
} {
  const today     = new Date(); today.setHours(0,0,0,0)
  const tomorrow  = new Date(today); tomorrow.setDate(today.getDate() + 1)
  const due       = new Date(dueDate); due.setHours(0,0,0,0)
  const timeStr   = dueTime ? ` ${dueTime}` : ''

  if (due < today)     return { label: `${dueDate.slice(5).replace('-', '/')}${timeStr}`, color: 'var(--color-accent)' }
  if (due.getTime() === today.getTime())    return { label: `Today${timeStr}`,    color: 'var(--color-primary)' }
  if (due.getTime() === tomorrow.getTime()) return { label: `Tomorrow${timeStr}`, color: 'var(--color-secondary)' }
  const mon = due.toLocaleString('en', { month: 'short' })
  const day = due.getDate()
  return { label: `${mon} ${day}${timeStr}`, color: 'var(--color-muted)' }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onClose: () => void
}

const PRESET_DURATIONS = [5, 15, 25, 45, 60]

export function AddTaskModal({ open, onClose }: Props) {
  const { addTask, nowPool, nextPool, userId, hasAchievement, unlockAchievement } = useStore()
  const { shouldAnimate } = useMotion()

  const [title, setTitle]             = useState('')
  const [difficulty, setDifficulty]   = useState<1 | 2 | 3>(2)
  const [minutes, setMinutes]         = useState(25)
  const [customMinutes, setCustomMinutes] = useState('')
  const [isSubmitting, setIsSubmitting]   = useState(false)
  const [aiSteps, setAiSteps]         = useState<string[] | null>(null)
  const [loadingAi, setLoadingAi]     = useState(false)

  // Due date
  const [dueDate, setDueDate]         = useState('')
  const [dueTime, setDueTime]         = useState('')
  const [showDatePicker, setShowDatePicker] = useState(false)

  // Voice AI classify
  const [voiceResult, setVoiceResult] = useState<ClassifyResult | null>(null)
  const [classifying, setClassifying] = useState(false)
  const [lowConfidence, setLowConfidence] = useState(false)
  const [voiceTranscript, setVoiceTranscript] = useState('')

  // ── Voice input (Web Speech API) ──────────────────────────────────────────
  const [isListening, setIsListening] = useState(false)
  const [voiceSupported] = useState(() =>
    typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
  )
  const recognitionRef = useRef<ReturnType<typeof createRecognition> | null>(null)

  const classifyVoice = useCallback(async (text: string) => {
    setClassifying(true)
    setVoiceResult(null)
    setLowConfidence(false)
    setVoiceTranscript(text)
    try {
      const { data, error } = await supabase.functions.invoke('classify-voice-input', {
        body: { text, language: navigator.language || 'en' },
      })
      if (error) throw error

      // Runtime-validated parse (Step C) — never trust raw `data as X`
      const result = parseClassifyResult(data, text)
      if (!result) {
        // Unparseable response → safe fallback
        setTitle(text)
        toast('Recorded your note — edit the details below.', { icon: '🎙' })
        return
      }

      // Low confidence → let user pick type (Step B)
      if (isLowConfidence(result)) {
        setVoiceResult(result)
        setLowConfidence(true)
        setTitle(result.title)
        return
      }

      // High confidence idea: auto-save immediately, show toast, close
      if (result.type === 'idea') {
        const ideaTask: Task = {
          id: crypto.randomUUID(),
          title: result.title,
          pool: 'someday',
          status: 'active',
          difficulty: 1,
          estimatedMinutes: result.estimatedMinutes,
          createdAt: new Date().toISOString(),
          completedAt: null,
          snoozeCount: 0,
          parentTaskId: null,
          position: 0,
          dueDate: null,
          dueTime: null,
          taskType: 'idea',
          reminderSentAt: null,
        }
        addTask(ideaTask)
        hapticDone()
        toast.success('💡 Idea saved to Someday!')
        resetAndClose()
        return
      }

      setVoiceResult(result)
      // Pre-fill form fields from AI result
      setTitle(result.title)
      setDifficulty(result.difficulty)
      setMinutes(result.estimatedMinutes)
      if (result.dueDate) { setDueDate(result.dueDate); setShowDatePicker(true) }
      if (result.dueTime) setDueTime(result.dueTime)
    } catch {
      // Edge function failed — show type picker so user classifies manually (Step B fallback)
      const fallback: ClassifyResult = {
        type: 'task',
        title: text,
        pool: 'now',
        difficulty: 2,
        estimatedMinutes: 25,
        dueDate: null,
        dueTime: null,
        reminderMinutesBefore: null,
        notes: null,
        confidence: 0.0, // triggers low-confidence type picker UI
      }
      setVoiceResult(fallback)
      setLowConfidence(true)
      setTitle(text)
    } finally {
      setClassifying(false)
    }
  }, [addTask]) // eslint-disable-line react-hooks/exhaustive-deps

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
        // Achievement
        if (!hasAchievement('voice_input')) {
          unlockAchievement('voice_input')
          const def = ACHIEVEMENT_DEFINITIONS.find(a => a.key === 'voice_input')
          if (def) notifyAchievement(def.name, def.emoji, def.description)
        }
        // Classify via AI
        void classifyVoice(transcript)
      } else {
        // Empty transcript — Step E: gentle feedback instead of silence
        toast('Nothing captured — try again in a quiet spot.', { icon: '🎙' })
      }
    }

    recognition.onerror = () => {
      setIsListening(false)
      toast('Voice input stopped — you can type instead.', { icon: '🎙' })
    }
    recognition.onend   = () => { setIsListening(false) }
    recognition.start()
    setIsListening(true)
  }, [isListening, voiceSupported, hasAchievement, unlockAchievement, classifyVoice])

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
    } catch (err) {
      const status = (err as { context?: { status?: number } })?.context?.status
      if (status === 429) {
        toast.error("AI limit reached — add the task and break it down later.", { icon: '⏳' })
      } else {
        toast.error("Couldn't reach AI right now — add the task and break it down later.")
      }
    } finally {
      setLoadingAi(false)
    }
  }

  // Block 6 fix: create parent task first, then subtasks with parentTaskId
  const handleAddSteps = async () => {
    if (!aiSteps || isSubmitting) return
    setIsSubmitting(true)
    const pool = nowFull ? 'next' : 'now'

    // 1. Create the parent task (the original title)
    const parentTask: Task = {
      id: crypto.randomUUID(),
      title: title.trim(),
      pool,
      status: 'active',
      difficulty,
      difficultyLevel: difficulty === 1 ? 'easy' : difficulty === 3 ? 'hard' : 'medium',
      estimatedMinutes: minutes,
      createdAt: new Date().toISOString(),
      completedAt: null,
      snoozeCount: 0,
      parentTaskId: null,
      position: pool === 'now' ? nowPool.length : nextPool.length,
      dueDate: dueDate || null,
      dueTime: dueTime || null,
      taskType: 'task',
      reminderSentAt: null,
    }
    addTask(parentTask)
    if (userId) {
      try {
        await supabase.from('tasks').insert({
          id: parentTask.id, user_id: userId, title: parentTask.title,
          pool: parentTask.pool, status: parentTask.status, difficulty: parentTask.difficulty,
          estimated_minutes: parentTask.estimatedMinutes, parent_task_id: null,
          position: parentTask.position,
          due_date: parentTask.dueDate, due_time: parentTask.dueTime,
          task_type: parentTask.taskType,
        } as never)
      } catch {
        enqueue('tasks', { id: parentTask.id, user_id: userId, title: parentTask.title,
          pool: parentTask.pool, status: parentTask.status, difficulty: parentTask.difficulty,
          estimated_minutes: parentTask.estimatedMinutes, parent_task_id: null,
          position: parentTask.position } as Record<string, unknown>, userId)
      }
    }

    // 2. Create subtasks with parentTaskId = parent.id
    for (let i = 0; i < aiSteps.length; i++) {
      const step = aiSteps[i]
      const stepTask: Task = {
        id: crypto.randomUUID(),
        title: step,
        pool: 'next',   // subtasks go to NEXT (parent is in NOW/NEXT)
        status: 'active',
        difficulty,
        difficultyLevel: difficulty === 1 ? 'easy' : difficulty === 3 ? 'hard' : 'medium',
        estimatedMinutes: Math.max(5, Math.round(minutes / aiSteps.length)),
        createdAt: new Date().toISOString(),
        completedAt: null,
        snoozeCount: 0,
        parentTaskId: parentTask.id,  // ✅ Block 6 fix
        position: i,
        dueDate: null,
        dueTime: null,
        taskType: 'task',
        reminderSentAt: null,
      }
      addTask(stepTask)
      if (userId) {
        const taskRow = {
          id: stepTask.id, user_id: userId, title: stepTask.title,
          pool: stepTask.pool, status: stepTask.status, difficulty: stepTask.difficulty,
          estimated_minutes: stepTask.estimatedMinutes,
          parent_task_id: parentTask.id,  // ✅ Block 6 fix
          position: stepTask.position,
        }
        try {
          await supabase.from('tasks').insert(taskRow as never)
        } catch {
          enqueue('tasks', taskRow as Record<string, unknown>, userId)
        }
      }
    }
    resetAndClose()
  }

  // ── Save voice AI result directly ─────────────────────────────────────────
  const handleSaveVoiceResult = async () => {
    if (!voiceResult || isSubmitting) return
    setIsSubmitting(true)
    const pool = voiceResult.pool === 'now' && nowFull ? 'next' : voiceResult.pool

    const newTask: Task = {
      id: crypto.randomUUID(),
      title: voiceResult.title,
      pool,
      status: 'active',
      difficulty: voiceResult.difficulty,
      difficultyLevel: voiceResult.difficulty === 1 ? 'easy' : voiceResult.difficulty === 3 ? 'hard' : 'medium',
      estimatedMinutes: voiceResult.estimatedMinutes,
      createdAt: new Date().toISOString(),
      completedAt: null,
      snoozeCount: 0,
      parentTaskId: null,
      position: pool === 'now' ? nowPool.length : nextPool.length,
      dueDate: voiceResult.dueDate,
      dueTime: voiceResult.dueTime,
      taskType: voiceResult.type,
      reminderSentAt: null,
    }

    addTask(newTask)
    if (userId) {
      const taskRow = {
        id: newTask.id, user_id: userId, title: newTask.title, pool: newTask.pool,
        status: newTask.status, difficulty: newTask.difficulty,
        estimated_minutes: newTask.estimatedMinutes, parent_task_id: null,
        position: newTask.position, due_date: newTask.dueDate, due_time: newTask.dueTime,
        task_type: newTask.taskType,
      }
      try {
        await supabase.from('tasks').insert(taskRow as never)
      } catch {
        enqueue('tasks', taskRow as Record<string, unknown>, userId)
      }
    }

    hapticDone()
    toast.success(`✓ ${voiceResult.type === 'reminder' ? '⏰ Reminder' : '✓ Task'} added!`)
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
      difficultyLevel: difficulty === 1 ? 'easy' : difficulty === 3 ? 'hard' : 'medium',
      estimatedMinutes: minutes,
      createdAt: new Date().toISOString(),
      completedAt: null,
      snoozeCount: 0,
      parentTaskId: null,
      position: pool === 'now' ? nowPool.length : nextPool.length,
      dueDate: dueDate || null,
      dueTime: dueTime || null,
      taskType: 'task',
      reminderSentAt: null,
    }

    addTask(newTask)

    if (userId) {
      const taskRow = {
        id: newTask.id, user_id: userId, title: newTask.title, pool: newTask.pool,
        status: newTask.status, difficulty: newTask.difficulty,
        estimated_minutes: newTask.estimatedMinutes, parent_task_id: null,
        position: newTask.position, due_date: newTask.dueDate, due_time: newTask.dueTime,
        task_type: newTask.taskType,
      }
      try {
        await supabase.from('tasks').insert(taskRow as never)
      } catch {
        enqueue('tasks', taskRow as Record<string, unknown>, userId)
      }
    }

    resetAndClose()
  }

  const resetAndClose = () => {
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
    setDueDate('')
    setDueTime('')
    setShowDatePicker(false)
    setVoiceResult(null)
    setClassifying(false)
    setLowConfidence(false)
    setVoiceTranscript('')
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
            className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-50 flex flex-col rounded-t-3xl"
            style={{
              background: 'var(--color-card)',
              border: '1px solid var(--color-border-subtle)',
              maxHeight: '90svh',
            }}
          >
            {/* ── Handle + header ── */}
            <div className="shrink-0 flex items-center justify-between px-5 pt-5 pb-3">
              <div
                className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full"
                style={{ background: 'var(--color-elevated)' }}
              />
              <h2 id="add-task-dialog-title" className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
                Add task
              </h2>
              <button
                onClick={handleClose}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl"
                style={{ color: 'var(--color-muted)' }}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* ── Scrollable body ── */}
            <div className="flex-1 overflow-y-auto px-5 flex flex-col gap-4 pb-2">

              {/* AI classifying spinner — Mochi-style (Step E) */}
              {classifying && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                  style={{ background: 'var(--color-elevated)', border: '1px solid var(--color-border-accent)' }}>
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin motion-reduce:animate-none motion-reduce:opacity-60 shrink-0"
                    style={{ color: 'var(--color-primary)' }} />
                  <span className="text-sm" style={{ color: 'var(--color-primary)' }}>Mochi is thinking… 🧠</span>
                </div>
              )}

              {/* Low confidence — let user pick type (Step B) */}
              {lowConfidence && voiceResult && !classifying && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col gap-3 p-4 rounded-2xl"
                  style={{ background: 'var(--color-elevated)', border: '1px solid var(--color-border-gold)' }}
                >
                  <p className="text-sm" style={{ color: 'var(--color-accent)' }}>
                    I heard: &ldquo;{voiceTranscript.slice(0, 80)}&rdquo;
                  </p>
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                    What is this?
                  </p>
                  <div className="flex gap-2">
                    {(['task', 'idea', 'reminder'] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => {
                          const updated = { ...voiceResult, type: t, confidence: 1.0 } as ClassifyResult
                          if (t === 'idea') {
                            updated.pool = 'someday'
                            updated.difficulty = 1
                            updated.estimatedMinutes = 5
                          } else if (t === 'reminder') {
                            updated.pool = 'next'
                          }
                          setVoiceResult(updated)
                          setLowConfidence(false)
                          setTitle(updated.title)
                          setDifficulty(updated.difficulty)
                          setMinutes(updated.estimatedMinutes)
                          if (t === 'idea') {
                            // Auto-save idea
                            const ideaTask: Task = {
                              id: crypto.randomUUID(), title: updated.title,
                              pool: 'someday', status: 'active', difficulty: 1,
                              estimatedMinutes: updated.estimatedMinutes,
                              createdAt: new Date().toISOString(), completedAt: null,
                              snoozeCount: 0, parentTaskId: null, position: 0,
                              dueDate: null, dueTime: null, taskType: 'idea', reminderSentAt: null,
                            }
                            addTask(ideaTask)
                            hapticDone()
                            toast.success('💡 Idea saved to Someday!')
                            resetAndClose()
                          }
                        }}
                        className="flex-1 py-2.5 rounded-xl text-sm font-medium min-h-[44px]"
                        style={{
                          background: t === voiceResult.type ? 'var(--color-primary-alpha)' : 'var(--color-card)',
                          border: `1.5px solid ${t === voiceResult.type ? 'var(--color-primary)' : 'var(--color-border-subtle)'}`,
                          color: t === voiceResult.type ? 'var(--color-primary)' : 'var(--color-muted)',
                        }}
                      >
                        {t === 'task' ? '✅ Task' : t === 'idea' ? '💡 Idea' : '⏰ Reminder'}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Voice AI result card */}
              {voiceResult && !classifying && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col gap-3 p-4 rounded-2xl"
                  style={{ background: 'var(--color-elevated)', border: '1px solid var(--color-border-teal)' }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">
                      {voiceResult.type === 'task' ? '✅' : voiceResult.type === 'reminder' ? '⏰' : '💡'}
                    </span>
                    <span className="text-sm font-semibold" style={{ color: 'var(--color-secondary)' }}>
                      {voiceResult.type === 'task' ? 'Task captured'
                        : voiceResult.type === 'reminder' ? 'Reminder captured'
                        : 'Idea captured'}
                    </span>
                  </div>

                  <p className="text-base font-medium leading-snug" style={{ color: 'var(--color-text)' }}>
                    "{voiceResult.title}"
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs px-2 py-1 rounded-lg" style={{ background: 'var(--color-primary-alpha)', color: 'var(--color-primary)' }}>
                      {voiceResult.pool.toUpperCase()} pool
                    </span>
                    <span className="text-xs px-2 py-1 rounded-lg" style={{ background: 'var(--color-primary-alpha)', color: 'var(--color-primary)' }}>
                      ~{voiceResult.estimatedMinutes}m
                    </span>
                    {voiceResult.dueDate && (
                      <span className="text-xs px-2 py-1 rounded-lg" style={{ background: 'var(--color-gold-alpha)', color: 'var(--color-accent)' }}>
                        📅 {voiceResult.dueDate}{voiceResult.dueTime ? ` at ${voiceResult.dueTime}` : ''}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={() => setVoiceResult(null)}
                      className="flex-1 py-2.5 rounded-xl text-sm font-medium min-h-[44px]"
                      style={{ background: 'var(--color-card)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-muted)' }}
                    >
                      Edit
                    </button>
                    {voiceResult.dueDate && (
                      <button
                        onClick={() => {
                          // Create temp task for ICS
                          const t: Task = {
                            id: crypto.randomUUID(), title: voiceResult.title,
                            pool: voiceResult.pool, status: 'active',
                            difficulty: voiceResult.difficulty,
                            difficultyLevel: voiceResult.difficulty === 1 ? 'easy' : voiceResult.difficulty === 3 ? 'hard' : 'medium',
                            estimatedMinutes: voiceResult.estimatedMinutes,
                            createdAt: new Date().toISOString(), completedAt: null,
                            snoozeCount: 0, parentTaskId: null, position: 0,
                            dueDate: voiceResult.dueDate, dueTime: voiceResult.dueTime,
                            taskType: voiceResult.type, reminderSentAt: null,
                          }
                          downloadICS(t)
                        }}
                        className="px-3 py-2.5 rounded-xl text-sm font-medium min-h-[44px]"
                        style={{ background: 'var(--color-gold-alpha)', border: '1px solid var(--color-border-gold)', color: 'var(--color-accent)' }}
                      >
                        📅
                      </button>
                    )}
                    <button
                      onClick={() => void handleSaveVoiceResult()}
                      disabled={isSubmitting}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold min-h-[44px]"
                      style={{ background: 'var(--color-primary)', color: 'white' }}
                    >
                      {isSubmitting ? 'Saving…' : 'Save ✓'}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Title input + Voice — hide when classifying or showing voice result */}
              {!classifying && !voiceResult && (
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
                        background: 'var(--color-elevated)',
                        border: `1.5px solid ${isListening ? 'var(--color-secondary)' : 'var(--color-border-subtle)'}`,
                        color: 'var(--color-text)',
                        caretColor: 'var(--color-primary)',
                      }}
                      onFocus={(e) => { if (!isListening) e.currentTarget.style.borderColor = 'var(--color-primary)' }}
                      onBlur={(e)  => { if (!isListening) e.currentTarget.style.borderColor = 'var(--color-border-subtle)' }}
                    />
                    {voiceSupported ? (
                      <button
                        onClick={handleVoiceToggle}
                        className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                        style={{
                          background: isListening ? 'var(--color-teal-alpha)' : 'var(--color-elevated)',
                          border: `1.5px solid ${isListening ? 'var(--color-secondary)' : 'var(--color-border-subtle)'}`,
                        }}
                        aria-label={isListening ? 'Stop recording' : 'Speak your task'}
                      >
                        {isListening ? <MicOff size={18} color="#4ECDC4" /> : <Mic size={18} color="#8B8BA7" />}
                      </button>
                    ) : (
                      <button
                        disabled
                        className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 opacity-40"
                        style={{ background: 'var(--color-elevated)', border: '1.5px solid var(--color-border-subtle)' }}
                        aria-label="Voice input available in Chrome or Edge"
                        title="Voice input available in Chrome or Edge"
                      >
                        <MicOff size={18} color="#5A5B72" />
                      </button>
                    )}
                  </div>
                  {isListening && (
                    <p className="text-xs animate-pulse" style={{ color: 'var(--color-secondary)' }}>
                      🎙 Listening… tap mic to stop
                    </p>
                  )}

                  {/* AI Decompose button */}
                  {title.trim().length > 3 && !aiSteps && (
                    <button
                      onClick={() => void handleDecompose()}
                      disabled={loadingAi}
                      className="self-start flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium"
                      style={{
                        background: 'var(--color-primary-alpha)',
                        border: '1px solid var(--color-border-accent)',
                        color: 'var(--color-primary)',
                      }}
                    >
                      {loadingAi ? (
                        <>
                          <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin motion-reduce:animate-none motion-reduce:opacity-60" />
                          Breaking down...
                        </>
                      ) : '✨ Break it down for me'}
                    </button>
                  )}
                </div>
              )}

              {/* AI Steps */}
              {aiSteps && (
                <div
                  className="flex flex-col gap-2 p-3 rounded-2xl"
                  style={{ background: 'var(--color-elevated)', border: '1px solid var(--color-border-accent)' }}
                >
                  <p className="text-xs font-medium" style={{ color: 'var(--color-primary)' }}>✨ Here's a plan:</p>
                  {aiSteps.map((step, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-xs mt-0.5 shrink-0" style={{ color: 'var(--color-primary)' }}>{i + 1}.</span>
                      <span className="text-sm leading-snug" style={{ color: 'var(--color-text)' }}>{step}</span>
                    </div>
                  ))}
                  <button
                    onClick={() => void handleAddSteps()}
                    disabled={isSubmitting}
                    className="mt-1 w-full py-2.5 rounded-xl text-sm font-semibold"
                    style={{ background: 'var(--color-primary)', color: 'white' }}
                  >
                    {isSubmitting ? 'Adding...' : `Add ${aiSteps.length} steps to my list →`}
                  </button>
                </div>
              )}

              {/* ── 📅 Due date picker ───────────────────────────────────────── */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setShowDatePicker(v => !v)}
                  className="flex items-center gap-2 self-start px-3 py-2 rounded-xl text-sm font-medium min-h-[44px]"
                  style={{
                    background: showDatePicker ? 'var(--color-primary-alpha)' : 'var(--color-elevated)',
                    border: `1.5px solid ${showDatePicker ? 'var(--color-primary)' : 'var(--color-border-subtle)'}`,
                    color: showDatePicker ? 'var(--color-primary)' : 'var(--color-muted)',
                  }}
                >
                  <Calendar size={14} />
                  {dueDate ? (
                    <span>{getDueDateLabel(dueDate, dueTime || null).label}</span>
                  ) : '📅 Set due date'}
                </button>

                {showDatePicker && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-2"
                  >
                    <div className="flex-1 flex flex-col gap-1">
                      <label className="text-xs" style={{ color: 'var(--color-muted)' }}>Date</label>
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="rounded-xl px-3 py-2.5 text-sm outline-none"
                        style={{
                          background: 'var(--color-elevated)',
                          border: '1.5px solid var(--color-border-subtle)',
                          color: 'var(--color-text)',
                          colorScheme: 'dark',
                        }}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs" style={{ color: 'var(--color-muted)' }}>
                        <Clock size={10} style={{ display: 'inline', marginRight: 2 }} />Time
                      </label>
                      <input
                        type="time"
                        value={dueTime}
                        onChange={(e) => setDueTime(e.target.value)}
                        className="rounded-xl px-3 py-2.5 text-sm outline-none w-28"
                        style={{
                          background: 'var(--color-elevated)',
                          border: '1.5px solid var(--color-border-subtle)',
                          color: 'var(--color-text)',
                          colorScheme: 'dark',
                        }}
                      />
                    </div>
                    {dueDate && (
                      <button
                        onClick={() => { setDueDate(''); setDueTime(''); setShowDatePicker(false) }}
                        className="self-end px-2 py-2.5 rounded-xl text-xs min-h-[44px]"
                        style={{ color: 'var(--color-muted)', background: 'var(--color-card)' }}
                      >
                        Clear
                      </button>
                    )}
                  </motion.div>
                )}
              </div>

              {/* ── Difficulty ─────────────────────────────────────────────── */}
              <div role="group" aria-labelledby="difficulty-label" className="flex flex-col gap-2">
                <span id="difficulty-label" className="text-xs font-medium tracking-wide uppercase" style={{ color: 'var(--color-muted)' }}>
                  Difficulty
                </span>
                <div className="flex gap-2">
                  {([1, 2, 3] as const).map(d => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      aria-pressed={difficulty === d}
                      className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                      style={{
                        background: difficulty === d ? 'var(--color-primary-alpha)' : 'var(--color-elevated)',
                        border: `1.5px solid ${difficulty === d ? 'var(--color-primary)' : 'var(--color-border-subtle)'}`,
                        color: difficulty === d ? 'var(--color-primary)' : 'var(--color-muted)',
                      }}
                    >
                      {d === 1 ? '🟢 Easy' : d === 2 ? '🟡 Medium' : '🔵 Hard'}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Duration ───────────────────────────────────────────────── */}
              <div role="group" aria-labelledby="duration-label" className="flex flex-col gap-2">
                <span id="duration-label" className="text-xs font-medium tracking-wide uppercase" style={{ color: 'var(--color-muted)' }}>
                  Estimated time
                </span>
                <div className="flex gap-2 flex-wrap">
                  {PRESET_DURATIONS.map(d => (
                    <button
                      key={d}
                      onClick={() => { setMinutes(d); setCustomMinutes('') }}
                      aria-pressed={minutes === d && !customMinutes}
                      className="px-3 py-2.5 rounded-xl text-sm font-medium"
                      style={{
                        background: minutes === d && !customMinutes ? 'var(--color-primary-alpha)' : 'var(--color-elevated)',
                        border: `1.5px solid ${minutes === d && !customMinutes ? 'var(--color-primary)' : 'var(--color-border-subtle)'}`,
                        color: minutes === d && !customMinutes ? 'var(--color-primary)' : 'var(--color-muted)',
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
                    className="w-24 px-3 py-2 rounded-xl text-sm outline-none"
                    style={{
                      background: customMinutes ? 'var(--color-primary-alpha)' : 'var(--color-elevated)',
                      border: `1.5px solid ${customMinutes ? 'var(--color-primary)' : 'var(--color-border-subtle)'}`,
                      color: 'var(--color-text)',
                    }}
                  />
                </div>
              </div>

              {/* ── Add to Calendar (shown when dueDate is set) ─────────────── */}
              {dueDate && (
                <button
                  onClick={() => {
                    const t: Task = {
                      id: crypto.randomUUID(), title: title.trim() || 'Task',
                      pool: 'now', status: 'active', difficulty,
                      difficultyLevel: difficulty === 1 ? 'easy' : difficulty === 3 ? 'hard' : 'medium',
                      estimatedMinutes: minutes,
                      createdAt: new Date().toISOString(), completedAt: null,
                      snoozeCount: 0, parentTaskId: null, position: 0,
                      dueDate, dueTime: dueTime || null, taskType: 'task', reminderSentAt: null,
                    }
                    downloadICS(t)
                  }}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium min-h-[44px]"
                  style={{
                    background: 'var(--color-gold-alpha)',
                    border: '1px solid var(--color-border-gold)',
                    color: 'var(--color-accent)',
                  }}
                >
                  <Calendar size={14} />
                  Add to Calendar (.ics)
                </button>
              )}

            </div>{/* end scrollable body */}

            {/* ── Footer ── */}
            <div
              className="shrink-0 px-5 pt-3 pb-[calc(16px+env(safe-area-inset-bottom))]"
              style={{ borderTop: '1px solid var(--color-border-subtle)' }}
            >
              {nowFull && (
                <p className="text-xs mb-2" style={{ color: 'var(--color-muted)' }}>
                  💙 NOW is full — this will land in NEXT, ready when you are.
                </p>
              )}
              <button
                onClick={() => void handleSubmit()}
                disabled={!title.trim() || isSubmitting || !!voiceResult || classifying}
                className="w-full py-4 rounded-2xl font-semibold text-base"
                style={{
                  background: title.trim() && !voiceResult && !classifying ? 'var(--color-primary)' : 'var(--color-elevated)',
                  color: title.trim() && !voiceResult && !classifying ? '#FFFFFF' : '#5A5B72',
                  cursor: title.trim() && !voiceResult && !classifying ? 'pointer' : 'default',
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
