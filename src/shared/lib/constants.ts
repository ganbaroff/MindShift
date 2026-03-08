// ── App constants ─────────────────────────────────────────────────────────────

export const RECOVERY_THRESHOLD_HOURS = 48
export const NOW_POOL_MAX = 3
export const NEXT_POOL_MAX = 6

// Focus session phase thresholds (minutes)
export const PHASE_RELEASE_MINUTES = 15
export const PHASE_FLOW_MINUTES = 15
export const MAX_SESSION_MINUTES = 90
export const RECOVERY_LOCK_MINUTES = 10

// Audio
export const AUDIO_FADE_MS = 500
export const AUDIO_HARD_LIMIT = 0.70          // GainNode ceiling (~70 dBA)
export const AUDIO_DEFAULT_VOLUME = 0.47      // ~47 dBA default
export const AUDIO_WARNING_VOLUME = 0.65      // >65 dBA warning
export const NATURE_BUFFER_SECONDS = 120      // 2-minute between-session buffer
export const SONIC_ANCHOR_FREQ = 396          // Hz, triangle wave
export const SONIC_ANCHOR_DURATION = 2.0      // seconds
export const HPF_CUTOFF_HZ = 60               // Low-frequency noise mitigation

// XP
export const XP_BASE = 10
export const XP_ENERGY_MULTIPLIER_LOW = 1.2   // energy 1-2 → bonus
export const XP_ENERGY_MULTIPLIER_HIGH = 0.8  // energy 4-5 → baseline

// Timer presets (minutes)
export const TIMER_PRESETS = [5, 25, 52] as const

// Psychotype detection (day 7+)
export const PSYCHOTYPE_DETECTION_DAYS = 7

// Avatars
export const AVATAR_COUNT = 6
