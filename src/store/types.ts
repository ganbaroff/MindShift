import type { UserSlice } from './slices/userSlice'
import type { TaskSlice } from './slices/taskSlice'
import type { SessionSlice } from './slices/sessionSlice'
import type { AudioSlice } from './slices/audioSlice'
import type { ProgressSlice } from './slices/progressSlice'
import type { PreferencesAndGridSlice } from './slices/preferencesAndGridSlice'

export type AppStore =
  UserSlice &
  TaskSlice &
  SessionSlice &
  AudioSlice &
  ProgressSlice &
  PreferencesAndGridSlice &
  { _hasHydrated: boolean }
