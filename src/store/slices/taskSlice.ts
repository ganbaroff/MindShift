import { type StateCreator } from 'zustand'
import type { AppStore } from '../types'
import type { Task, TaskType, TaskCategory } from '@/types'
import { ACHIEVEMENT_DEFINITIONS } from '@/types'
import { getToneCopy } from '@/shared/lib/uiTone'
import { notifyAchievement } from '@/shared/lib/notify'
import { getRandomDiscovery } from '@/shared/lib/mochiDiscoveries'

export interface TaskSlice {
  nowPool: Task[]
  nextPool: Task[]
  somedayPool: Task[]
  addTask: (task: Task) => void
  completeTask: (taskId: string) => void
  snoozeTask: (taskId: string) => void  // now → next
  moveTask: (taskId: string, toPool: Task['pool']) => void
  updateTask: (taskId: string, updates: Partial<Pick<Task, 'title' | 'note' | 'difficulty' | 'dueDate' | 'dueTime' | 'category'>>) => void
  removeTask: (taskId: string) => void
  setTasks: (tasks: Task[]) => void
  archiveAllOverdue: () => string[]     // returns archived ids
  setTaskDueDate: (id: string, dueDate: string | null, dueTime: string | null) => void
  setTaskType: (id: string, type: TaskType) => void
  setTaskCategory: (id: string, category: TaskCategory | undefined) => void
  /** Reorder tasks within a pool — receives the full new ordered array */
  reorderPool: (pool: Task['pool'], ordered: Task[]) => void
}

export const createTaskSlice: StateCreator<
  AppStore,
  [['zustand/subscribeWithSelector', never], ['zustand/persist', unknown]],
  [],
  TaskSlice
> = (set, get) => ({
  nowPool: [],
  nextPool: [],
  somedayPool: [],

  addTask: (task) => set((s) => {
    // Pool assignment by task type:
    //   task    → current logic (NOW if space, else NEXT)
    //   meeting → always NEXT
    //   reminder → always NEXT
    //   idea    → always SOMEDAY
    const effectivePool = (() => {
      if (task.taskType === 'idea') return 'someday' as const
      if (task.taskType === 'meeting' || task.taskType === 'reminder') return 'next' as const
      return task.pool // 'task' type uses caller-assigned pool
    })()
    const assigned = { ...task, pool: effectivePool }
    if (effectivePool === 'now')  return { nowPool: [...s.nowPool, assigned] }
    if (effectivePool === 'next') return { nextPool: [...s.nextPool, assigned] }
    return { somedayPool: [...s.somedayPool, assigned] }
  }),

  completeTask: (taskId) => {
    // Snapshot pre-set state for achievement checks (set() is sync in Zustand)
    const energyBefore = get().energyLevel
    let didComplete = false
    set((s) => {
    const now = new Date().toISOString()
    const complete = (tasks: Task[]) =>
      tasks.map(t => t.id === taskId ? { ...t, status: 'completed' as const, completedAt: now } : t)
    const completedTask = [...s.nowPool, ...s.nextPool, ...s.somedayPool]
      .find(t => t.id === taskId && t.status === 'active')
    const wasActive = !!completedTask
    if (wasActive) didComplete = true

    // Invisible streak tracking — Research #3
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().split('T')[0]
    const streakUpdate = wasActive && s.lastActiveDate !== today ? (() => {
      const isConsecutive = s.lastActiveDate === yesterday
      const newStreak = isConsecutive ? s.currentStreak + 1 : 1
      return {
        currentStreak: newStreak,
        longestStreak: Math.max(s.longestStreak, newStreak),
        lastActiveDate: today,
      }
    })() : {}

    // Recurring tasks — auto-create next occurrence in NEXT pool
    // Only 'task' and 'reminder' types support recurrence; meetings and ideas don't recur.
    const recurTask: Task | null = (() => {
      if (!completedTask || !completedTask.repeat || completedTask.repeat === 'none') return null
      if (completedTask.taskType === 'meeting' || completedTask.taskType === 'idea') return null
      const offsetDays = completedTask.repeat === 'daily' ? 1 : 7
      const nextDue = new Date(Date.now() + offsetDays * 86_400_000).toISOString().split('T')[0]
      return {
        ...completedTask,
        id: crypto.randomUUID(),
        status: 'active' as const,
        pool: 'next' as const,
        completedAt: null,
        snoozeCount: 0,
        createdAt: now,
        dueDate: nextDue,
        reminderSentAt: null,
        position: s.nextPool.length,
      }
    })()

    // Sync recurring task to Supabase (fire-and-forget)
    if (recurTask && s.userId && !s.userId.startsWith('guest_')) {
      const capturedTask = recurTask
      const capturedUserId = s.userId
      // Defer import to avoid circular dependency — store cannot statically import useTaskSync
      void import('@/shared/hooks/useTaskSync').then(({ syncTaskUpsert }) => {
        syncTaskUpsert(capturedTask, capturedUserId)
      })
    }

    return {
      nowPool: complete(s.nowPool),
      nextPool: recurTask
        ? [...complete(s.nextPool), recurTask]
        : complete(s.nextPool),
      somedayPool: complete(s.somedayPool),
      // Research #5: track cumulative effort (task total), never consecutive
      completedTotal: wasActive ? s.completedTotal + 1 : s.completedTotal,
      ...streakUpdate,
    }
    })

    // ── Achievement checks (post-set via get()) ────────────────────────────
    if (!didComplete) return
    const s2 = get()
    const toneCopy = getToneCopy(s2.uiTone)
    const tryUnlock = (key: string) => {
      if (s2.hasAchievement(key)) return
      s2.unlockAchievement(key)
      const def = ACHIEVEMENT_DEFINITIONS.find(a => a.key === key)
      if (def) notifyAchievement(toneCopy.badgeUnlocked(def.name), def.emoji, def.description)
    }
    const newTotal = s2.completedTotal
    const hour = new Date().getHours()
    if (newTotal === 1)  tryUnlock('first_seed')
    if (newTotal === 10) tryUnlock('task_sniper')
    if (newTotal === 50) tryUnlock('micro_master')
    if (hour >= 21)      tryUnlock('night_owl')
    if (hour < 9)        tryUnlock('morning_mind')
    if (energyBefore <= 2) tryUnlock('gentle_start')
    if (newTotal >= 5)   tryUnlock('deep_diver')

    // BUG 1 fix: award XP on task completion (was never called)
    s2.addXP(10)

    // Mochi discovery — variable reinforcement (Research #5)
    s2.addMochiDiscovery(getRandomDiscovery().id)
  },

  snoozeTask: (taskId) => set((s) => {
    const task = s.nowPool.find(t => t.id === taskId)
    if (!task) return s
    return {
      nowPool: s.nowPool.filter(t => t.id !== taskId),
      nextPool: [...s.nextPool, { ...task, pool: 'next', snoozeCount: task.snoozeCount + 1 }],
    }
  }),

  moveTask: (taskId, toPool) => {
    const before = get()
    const allTasks = [...before.nowPool, ...before.nextPool, ...before.somedayPool]
    const task = allTasks.find(t => t.id === taskId)
    if (!task) return
    const fromPool = task.pool

    set((s) => {
      const updated = { ...task, pool: toPool }
      const filter = (tasks: Task[]) => tasks.filter(t => t.id !== taskId)
      return {
        nowPool:     toPool === 'now'     ? [...filter(s.nowPool), updated]     : filter(s.nowPool),
        nextPool:    toPool === 'next'    ? [...filter(s.nextPool), updated]    : filter(s.nextPool),
        somedayPool: toPool === 'someday' ? [...filter(s.somedayPool), updated] : filter(s.somedayPool),
      }
    })

    // Achievement: pool_shifter — move a task from Someday to Now
    if (fromPool === 'someday' && toPool === 'now') {
      const s2 = get()
      if (!s2.hasAchievement('pool_shifter')) {
        s2.unlockAchievement('pool_shifter')
        const toneCopy = getToneCopy(s2.uiTone)
        const def = ACHIEVEMENT_DEFINITIONS.find(a => a.key === 'pool_shifter')
        if (def) notifyAchievement(toneCopy.badgeUnlocked(def.name), def.emoji, def.description)
      }
    }
  },

  updateTask: (taskId, updates) => set((s) => {
    const apply = (tasks: Task[]) =>
      tasks.map(t => t.id === taskId ? { ...t, ...updates } : t)
    return {
      nowPool: apply(s.nowPool),
      nextPool: apply(s.nextPool),
      somedayPool: apply(s.somedayPool),
    }
  }),

  removeTask: (taskId) => set((s) => ({
    nowPool: s.nowPool.filter(t => t.id !== taskId),
    nextPool: s.nextPool.filter(t => t.id !== taskId),
    somedayPool: s.somedayPool.filter(t => t.id !== taskId),
  })),

  setTasks: (tasks) => set({
    nowPool:     tasks.filter(t => t.pool === 'now'),
    nextPool:    tasks.filter(t => t.pool === 'next'),
    somedayPool: tasks.filter(t => t.pool === 'someday'),
  }),

  archiveAllOverdue: () => {
    const s = get()
    const today = new Date().toISOString().split('T')[0]
    const allOverdue = [...s.nowPool, ...s.nextPool]
      .filter(t => t.status === 'active' && t.dueDate != null && t.dueDate < today)
    const ids = allOverdue.map(t => t.id)
    const overdueSet = new Set(ids)
    set((s) => ({
      nowPool: s.nowPool.filter(t => !overdueSet.has(t.id)),
      nextPool: s.nextPool.filter(t => !overdueSet.has(t.id)),
      somedayPool: [...s.somedayPool, ...allOverdue.map(t => ({ ...t, pool: 'someday' as const }))],
    }))
    return ids
  },

  setTaskDueDate: (id, dueDate, dueTime) => set((s) => {
    const update = (tasks: Task[]) =>
      tasks.map(t => t.id === id ? { ...t, dueDate, dueTime } : t)
    return {
      nowPool: update(s.nowPool),
      nextPool: update(s.nextPool),
      somedayPool: update(s.somedayPool),
    }
  }),

  setTaskType: (id, type) => set((s) => {
    const update = (tasks: Task[]) =>
      tasks.map(t => t.id === id ? { ...t, taskType: type } : t)
    return {
      nowPool: update(s.nowPool),
      nextPool: update(s.nextPool),
      somedayPool: update(s.somedayPool),
    }
  }),

  setTaskCategory: (id, category) => set((s) => {
    const update = (tasks: Task[]) =>
      tasks.map(t => t.id === id ? { ...t, category } : t)
    return {
      nowPool: update(s.nowPool),
      nextPool: update(s.nextPool),
      somedayPool: update(s.somedayPool),
    }
  }),

  reorderPool: (pool, ordered) => set(() => {
    const withPositions = ordered.map((t, i) => ({ ...t, position: i }))
    if (pool === 'now')     return { nowPool: withPositions }
    if (pool === 'next')    return { nextPool: withPositions }
    return { somedayPool: withPositions }
  }),
})
