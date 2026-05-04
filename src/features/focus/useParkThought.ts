/**
 * useParkThought — capture stray thoughts during focus sessions
 *
 * Creates a SOMEDAY task from a quick text note without
 * interrupting the focus session flow.
 */

import { useState, useRef, useCallback } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { logError } from '@/shared/lib/logger'
import type { Task } from '@/types'

interface UseParkThoughtParams {
  addTask: (task: Task) => void
  userId: string | null
}

export function useParkThought({ addTask, userId }: UseParkThoughtParams) {
  const [parkOpen, setParkOpen] = useState(false)
  const [parkText, setParkText] = useState('')
  const parkedCountRef = useRef(0)

  const handleParkThought = useCallback(async () => {
    const text = parkText.trim()
    if (!text) return
    const task: Task = {
      id: crypto.randomUUID(),
      title: text,
      pool: 'someday',
      status: 'active',
      difficulty: 1,
      estimatedMinutes: 15,
      createdAt: new Date().toISOString(),
      completedAt: null,
      snoozeCount: 0,
      parentTaskId: null,
      position: 0,
      dueDate: null,
      dueTime: null,
      taskType: 'task',
      reminderSentAt: null,
      repeat: 'none',
    }
    addTask(task)
    if (userId) {
      try {
        await supabase.from('tasks').insert({
          id: task.id, user_id: userId, title: task.title,
          pool: task.pool, status: task.status, difficulty: task.difficulty,
          estimated_minutes: task.estimatedMinutes, parent_task_id: null, position: 0,
        } as never) // Supabase untyped client
      } catch (err) {
        logError('FocusScreen.parkThought.insert', err, { taskId: task.id })
      }
    }
    parkedCountRef.current += 1
    setParkText('')
    setParkOpen(false)
  }, [parkText, addTask, userId])

  return {
    parkOpen, setParkOpen,
    parkText, setParkText,
    parkedCount: parkedCountRef.current,
    handleParkThought,
  }
}
