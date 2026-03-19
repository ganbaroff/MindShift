// ── Database types ────────────────────────────────────────────────────────────
// Structured to match Supabase PostgREST v12 expected format.

export type Database = {
  public: {
    Tables: {
      users: {
        Row: UserRow
        Insert: UserInsert
        Update: UserUpdate
        Relationships: []
      }
      tasks: {
        Row: TaskRow
        Insert: TaskInsert
        Update: Partial<TaskInsert>
        Relationships: []
      }
      focus_sessions: {
        Row: FocusSessionRow
        Insert: FocusSessionInsert
        Update: Partial<FocusSessionInsert>
        Relationships: []
      }
      user_behavior: {
        Row: UserBehaviorRow
        Insert: UserBehaviorInsert
        Update: Partial<UserBehaviorInsert>
        Relationships: []
      }
      achievements: {
        Row: AchievementRow
        Insert: AchievementInsert
        Update: Partial<AchievementInsert>
        Relationships: []
      }
      energy_logs: {
        Row: EnergyLogRow
        Insert: EnergyLogInsert
        Update: Partial<EnergyLogInsert>
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// dashboard_config shape — kept local to avoid circular imports
export type DashboardConfig = { widgets?: WidgetConfigLike[] } | null
interface WidgetConfigLike { id: string; type: string; visible: boolean }

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
  // Migration 002
  subscription_tier: 'free' | 'pro_trial' | 'pro'
  trial_ends_at: string | null
  reduced_stimulation: boolean
  // Migration 003 — bento grid widget layout
  dashboard_config: DashboardConfig
  // Migration 005 — legal consent tracking
  terms_accepted_at:  string | null
  terms_version:      string | null
  age_confirmed:      boolean
  cookie_accepted_at: string | null
}

// Insert: minimal required fields (server fills the rest with defaults)
export type UserInsert = Pick<UserRow, 'id' | 'email'>

// Update: any subset of user-owned mutable fields
export type UserUpdate = Partial<Omit<UserRow, 'id' | 'created_at'>>

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
  due_date: string | null
  due_time: string | null
  task_type: string | null
  reminder_sent_at: string | null
  note: string | null
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
export interface FocusSessionInsert {
  user_id: string
  started_at: string
  duration_ms: number | null
  phase_reached: 'struggle' | 'release' | 'flow' | 'recovery' | null
  audio_preset: string | null
  task_id: string | null
  energy_before: number | null
  energy_after?: number | null   // written via UPDATE after NatureBuffer energy pick
}

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
