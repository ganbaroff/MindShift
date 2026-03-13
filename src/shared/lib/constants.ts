// ── App constants ─────────────────────────────────────────────────────────────

export const RECOVERY_THRESHOLD_HOURS = 72  // Research #7: RSD spiral peaks at 3+ days absence
export const NOW_POOL_MAX = 3
export const NEXT_POOL_MAX = 6

// Focus session phase thresholds (minutes) — Research #2: neuroscience
// Struggle → Release → Flow progression matches ADHD attention ramp-up
export const PHASE_STRUGGLE_MINUTES = 7   // 0–7 min: high-contrast, large timer
export const PHASE_RELEASE_MINUTES = 15   // 7–15 min: timer shrinks, animations slow
export const PHASE_FLOW_MINUTES = 15      // 15+ min: digits vanish, ambient arc only
export const MAX_SESSION_MINUTES = 90
export const SESSION_SOFT_STOP_MINUTES = 90   // Block 4a: toast nudge to wrap up
export const SESSION_HARD_STOP_MINUTES = 120  // Block 4a: half-sheet forced end
export const RECOVERY_LOCK_MINUTES = 10

// Audio
// Volume: audioVolume in store is a 0–1 normalized value (0% to 100%).
//   The engine converts it logarithmically → 0.001–0.10 GainNode gain
//   (≈ 40–70 dBA for typical earbuds; physiologically safe for all-day use).
export const AUDIO_FADE_DURATION_S = 1.5      // Constant power crossfade duration (seconds)
export const AUDIO_HARD_LIMIT = 1.0           // Slider max (0–1 normalized; gain limit is internal)
export const AUDIO_DEFAULT_VOLUME = 0.55      // 55% slider → ~58 dBA (research optimal: 65–75 dBA)
export const AUDIO_WARNING_VOLUME = 0.80      // >80% → warn user (maps to ~65 dBA internally)
export const NATURE_BUFFER_SECONDS = 120      // 2-minute between-session buffer
export const HPF_CUTOFF_HZ = 60               // Sub-bass protection (mandatory on all noise)
export const PINK_LPF_CUTOFF_HZ = 285         // Pink/nature HF fatigue cutoff (Research #3: eliminate HF strain)

// XP
export const XP_BASE = 10
export const XP_ENERGY_MULTIPLIER_LOW = 1.2   // energy 1-2 → bonus
export const XP_ENERGY_MULTIPLIER_HIGH = 0.8  // energy 4-5 → baseline

// Variable Ratio XP schedule — Research #5: dopamine transfer deficit in ADHD
// Unpredictable reward distribution sustains motivation better than fixed rewards.
// Schedule (per 100 completions): 8%=2× | 17%=1.5× | 75%=1×
export const VR_BUCKET_SIZE = 100              // rolling window
export const VR_JACKPOT_THRESHOLD = 8          // completedTotal % 100 < 8  → 2× multiplier
export const VR_BONUS_THRESHOLD = 25           // completedTotal % 100 < 25 → 1.5× multiplier
export const VR_MULTIPLIER_JACKPOT = 2
export const VR_MULTIPLIER_BONUS = 1.5
export const VR_MULTIPLIER_BASE = 1

// Timer presets (minutes)
export const TIMER_PRESETS = [5, 25, 52, 90] as const

// Psychotype detection (day 7+)
export const PSYCHOTYPE_DETECTION_DAYS = 7

// Avatars
export const AVATAR_COUNT = 6

// ── App mode configuration — drives pool limits + HomeScreen visibility ───────
// Each appMode maps to a specific NOW pool max and HomeScreen layout.
// Used by HomeScreen, AddTaskModal, and NowPoolWidget.
export const APP_MODE_CONFIG = {
  minimal: {
    nowPoolMax: 3,
    showNextOnHome: false,
    showSomedayOnHome: false,
    homeSubtitle: 'One task at a time. What matters most?',
  },
  habit: {
    nowPoolMax: 3,
    showNextOnHome: true,
    showSomedayOnHome: false,
    homeSubtitle: 'Build your routine, one step at a time.',
  },
  system: {
    nowPoolMax: 5,
    showNextOnHome: true,
    showSomedayOnHome: true,
    homeSubtitle: "Everything visible. You're in control.",
  },
} as const

// ── Energy labels — canonical set used across all UI ──────────────────────────
// Drained(1) → Low(2) → Okay(3) → Good(4) → Wired(5)
// Keep in sync: EnergyCheckin, HomeScreen, PostSessionFlow, SettingsScreen
export const ENERGY_LABELS = ['Drained', 'Low', 'Okay', 'Good', 'Wired'] as const
export const ENERGY_EMOJI  = ['😴', '😌', '🙂', '😄', '⚡'] as const
export type EnergyLabel = typeof ENERGY_LABELS[number]
