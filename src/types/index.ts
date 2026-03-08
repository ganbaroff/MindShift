// ── Domain types (app-level, not DB-level) ────────────────────────────────────

export type { Database, UserRow, TaskRow, FocusSessionRow, AchievementRow, EnergyLogRow } from './database'

export type Pool = 'now' | 'next' | 'someday'
export type CognitiveMode = 'focused' | 'overview'
export type AppMode = 'minimal' | 'habit' | 'system'
export type Psychotype = 'achiever' | 'explorer' | 'connector' | 'planner'
export type AudioPreset = 'brown' | 'lofi' | 'nature' | 'pink'
export type SessionPhase = 'idle' | 'struggle' | 'release' | 'flow' | 'recovery'
export type EnergyLevel = 1 | 2 | 3 | 4 | 5

export interface Task {
  id: string
  title: string
  pool: Pool
  status: 'active' | 'completed' | 'archived'
  difficulty: 1 | 2 | 3
  estimatedMinutes: number
  createdAt: string
  completedAt: string | null
  snoozeCount: number
  parentTaskId: string | null
  position: number
}

export interface ActiveSession {
  id: string
  taskId: string | null
  startedAt: string
  durationMs: number
  phase: SessionPhase
  audioPreset: AudioPreset | null
}

export interface WeeklyStats {
  peakFocusTime: string
  tasksCompleted: number
  mostUsedPreset: AudioPreset | null
  peakEnergyLevel: EnergyLevel
  consistencyScore: number // 0-1, tasks done / 7 days
  totalFocusMinutes: number
}

export interface Achievement {
  key: string
  name: string
  description: string
  emoji: string
  unlockedAt: string | null
}

export const ACHIEVEMENT_DEFINITIONS: Omit<Achievement, 'unlockedAt'>[] = [
  { key: 'first_seed',    name: 'First Seed',     emoji: '🌱', description: 'Complete your first task' },
  { key: 'five_min_hero', name: '5-Minute Hero',  emoji: '⚡', description: 'Start a task using the 5-minute rule' },
  { key: 'flow_rider',    name: 'Flow Rider',     emoji: '🌊', description: 'Complete a 52-minute focus session' },
  { key: 'comeback_kid',  name: 'Comeback Kid',   emoji: '🦋', description: 'Return after 3+ days and complete a task' },
  { key: 'deep_diver',    name: 'Deep Diver',     emoji: '🌊', description: 'Complete 5 focus sessions' },
  { key: 'quiet_mind',    name: 'Quiet Mind',     emoji: '🧘', description: 'Use audio for 3 sessions in a row' },
  { key: 'task_sniper',   name: 'Task Sniper',    emoji: '🎯', description: 'Complete 10 tasks' },
  { key: 'sonic_anchor',  name: 'Sonic Anchor',   emoji: '🎵', description: 'Set a focus anchor sound' },
  { key: 'week_warrior',  name: 'Week Warrior',   emoji: '💪', description: 'Active 5 out of 7 days' },
  { key: 'brain_trust',   name: 'Brain Trust',    emoji: '🧠', description: 'Use AI task decomposition 10 times' },
  { key: 'micro_master',  name: 'Micro Master',   emoji: '⚙️', description: 'Complete 50 micro-tasks' },
  { key: 'gentle_start',  name: 'Gentle Start',   emoji: '🌅', description: 'Complete a task at low energy (1-2)' },
  { key: 'recover_rise',  name: 'Recover & Rise', emoji: '🌿', description: 'Come back after a break and focus' },
  { key: 'pool_shifter',  name: 'Pool Shifter',   emoji: '🔀', description: 'Move a task from Someday to Now' },
  { key: 'night_owl',     name: 'Night Owl',      emoji: '🦉', description: 'Complete a task after 9 PM' },
  { key: 'morning_mind',  name: 'Morning Mind',   emoji: '☀️', description: 'Complete a task before 9 AM' },
  { key: 'voice_input',   name: 'Voice Input',    emoji: '🎤', description: 'Add a task by voice' },
  { key: 'full_cycle',    name: 'Full Cycle',     emoji: '♾️', description: 'Complete all 4 focus phases in one session' },
]
