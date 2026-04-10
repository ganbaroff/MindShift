/**
 * mochiChatHelpers — helpers and AI fetch for MochiChat
 *
 * Extracted from MochiChat.tsx.
 */

import { supabase } from '@/shared/lib/supabase'
import type { MascotState } from '@/shared/ui/Mascot'
import type { Task } from '@/types'

// -- Types ---------------------------------------------------------------------

export interface ChatMessage {
  id: string
  role: 'user' | 'mochi'
  text: string
  mascotState?: MascotState
  isCrisis?: boolean
}

export interface MochiChatResponse {
  message: string
  mascotState: MascotState
}

// -- Helpers -------------------------------------------------------------------

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function getRecentTaskTitles(pools: Task[][]): string[] {
  const active = pools.flatMap(pool =>
    pool.filter(t => t.status === 'active')
  )
  return active.slice(0, 5).map(t => t.title.slice(0, 60))
}

export function getUpcomingDeadlines(pools: Task[][]): { title: string; taskType: string; dueDate: string }[] {
  const now = Date.now()
  const in24h = now + 24 * 60 * 60 * 1000
  return pools
    .flatMap(pool => pool.filter(t => t.status === 'active'))
    .filter(t => t.dueDate && new Date(t.dueDate).getTime() <= in24h)
    .slice(0, 5)
    .map(t => ({
      title: t.title.slice(0, 40),
      taskType: t.taskType ?? 'task',
      dueDate: t.dueDate ?? '',
    }))
}

export function getActiveTaskTypes(tasks: Task[]): Record<string, number> | null {
  const counts: Record<string, number> = {}
  for (const task of tasks) {
    if (task.status !== 'active') continue
    const type = task.taskType ?? 'task'
    counts[type] = (counts[type] ?? 0) + 1
  }
  return Object.keys(counts).length > 0 ? counts : null
}

// -- AI fetch ------------------------------------------------------------------

export async function fetchMochiChat(
  userMessage: string,
  context: Record<string, unknown>,
  conversationHistory: { role: string; text: string }[],
  locale: string,
): Promise<MochiChatResponse> {
  const { data, error } = await supabase.functions.invoke('mochi-respond', {
    body: {
      trigger: 'chat',
      userMessage,
      context,
      conversationHistory,
      locale,
    },
  })
  if (error) throw error
  const resp = data as MochiChatResponse | null
  if (resp?.message) return resp
  throw new Error('Empty response')
}
