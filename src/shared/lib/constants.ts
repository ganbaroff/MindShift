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
// Volume: audioVolume in store is a 0–1 normalized value (0% to 100%).
//   The engine converts it logarithmically → 0.001–0.10 GainNode gain
//   (≈ 40–70 dBA for typical earbuds; physiologically safe for all-day use).
export const AUDIO_FADE_DURATION_S = 1.5      // Constant power crossfade duration (seconds)
export const AUDIO_HARD_LIMIT = 1.0           // Slider max (0–1 normalized; gain limit is internal)
export const AUDIO_DEFAULT_VOLUME = 0.47      // 47% slider → ~50 dBA (research optimal: 45–60 dBA)
export const AUDIO_WARNING_VOLUME = 0.80      // >80% → warn user (maps to ~65 dBA internally)
export const NATURE_BUFFER_SECONDS = 120      // 2-minute between-session buffer
export const HPF_CUTOFF_HZ = 60               // Sub-bass protection (mandatory on all noise)

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
