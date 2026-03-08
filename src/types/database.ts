// ── Database types ────────────────────────────────────────────────────────────
// Auto-generated from Supabase schema. Update with: supabase gen types typescript

export interface Database {
  public: {
    Tables: {
      users: { Row: UserRow; Insert: UserInsert; Update: Partial<UserInsert> }
      tasks: { Row: TaskRow; Insert: TaskInsert; Update: Partial<TaskInsert> }
      focus_sessions: { Row: FocusSessionRow; Insert: FocusSessionInsert; Update: Partial<FocusSessionInsert> }
      user_behavior: { Row: UserBehaviorRow; Insert: UserBehaviorInsert; Update: Partial<UserBehaviorInsert> }
      achievements: { Row: AchievementRow; Insert: AchievementInsert; Update: Partial<AchievementInsert> }
      energy_logs: { Row: EnergyLogRow; Insert: EnergyLogInsert; Update: Partial<EnergyLogInsert> }
    }
  }
}

export interface UserRow {
  id: string
  email: string
  cognitive_mode: 'focused' | 'overview'
  energy_level: 1 | 2 | 3 | 4 | 5
  psychotype: 'achiever' | 'explorer' | 'connector' | 'planner' | null
  avatar_id: number
  xp_total: number
  created_at: string
  last_session_at: string | null
  onboarding_completed: boolean
}
export type UserInsert = Omit<UserRow, 'created_at' | 'xp_total' | 'psychotype' | 'last_session_at'>

export interface TaskRow {
  id: string
  user_id: string
  title: string
  pool: 'now' | 'next' | 'someday'
  status: 'active' | 'completed' | 'archived'
  difficulty: 1 | 2 | 3
  estimated_minutes: number
  completed_at: string | null
  created_at: string
  snooze_count: number
  parent_task_id: string | null
  position: number
}
export type TaskInsert = Omit<TaskRow, 'id' | 'created_at' | 'completed_at' | 'snooze_count'>

export interface FocusSessionRow {
  id: string
  user_id: string
  started_at: string
  ended_at: string | null
  duration_ms: number | null
  phase_reached: 'struggle' | 'release' | 'flow' | 'recovery' | null
  audio_preset: string | null
  task_id: string | null
  energy_before: number | null
  energy_after: number | null
}
export type FocusSessionInsert = Omit<FocusSessionRow, 'id' | 'ended_at' | 'duration_ms' | 'phase_reached' | 'energy_after'>

export interface UserBehaviorRow {
  id: string
  user_id: string
  date: string
  session_timestamps: string[]
  session_duration_ms: number
  task_completion_ratio: number
  snooze_count: number
  feature_span: number
  interaction_pace_ms: number
}
export type UserBehaviorInsert = Omit<UserBehaviorRow, 'id'>

export interface AchievementRow {
  id: string
  user_id: string
  achievement_key: string
  unlocked_at: string
}
export type AchievementInsert = Omit<AchievementRow, 'id' | 'unlocked_at'>

export interface EnergyLogRow {
  id: string
  user_id: string
  energy_before: number
  energy_after: number | null
  session_id: string | null
  logged_at: string
}
export type EnergyLogInsert = Omit<EnergyLogRow, 'id' | 'logged_at' | 'energy_after' | 'session_id'>
