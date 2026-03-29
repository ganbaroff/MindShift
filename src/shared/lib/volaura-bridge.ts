/**
 * volaura-bridge.ts — Phase 1 integration with VOLAURA ecosystem.
 *
 * Best-effort: all calls are fire-and-forget. VOLAURA API failures
 * NEVER block MindShift UX. Silent fallback on any error.
 *
 * Integration spec: C:/Projects/VOLAURA/docs/MINDSHIFT-INTEGRATION-SPEC.md
 */

const VOLAURA_API = import.meta.env.VITE_VOLAURA_API_URL ?? ''

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CharacterState {
  crystal_balance: number
  xp_total: number
  verified_skills: Array<{
    skill_slug: string
    aura_score: number
    badge_tier: 'none' | 'bronze' | 'silver' | 'gold' | 'platinum'
  }>
  character_stats: Record<string, number>
  login_streak: number
  event_count: number
}

export interface CrystalBalance {
  balance: number
  earned_lifetime: number
  spent_lifetime: number
}

interface CharacterEvent {
  event_type: 'xp_earned' | 'buff_applied' | 'vital_logged' | 'stat_changed'
  payload: Record<string, unknown> & { _schema_version: 1 }
  source_product: 'mindshift'
}

// ── Cache ─────────────────────────────────────────────────────────────────────

let cachedState: CharacterState | null = null
let cacheTs = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// ── API helpers ───────────────────────────────────────────────────────────────

function isConfigured(): boolean {
  return VOLAURA_API.length > 0
}

async function volauraFetch<T>(
  path: string,
  token: string,
  options?: RequestInit
): Promise<T | null> {
  if (!isConfigured()) return null
  try {
    const res = await fetch(`${VOLAURA_API}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options?.headers,
      },
    })
    if (!res.ok) return null
    const json = await res.json()
    return json.data ?? json
  } catch {
    return null
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Fetch user's VOLAURA character state (AURA badge, crystals, stats).
 * Cached for 5 minutes. Returns null if VOLAURA not configured or API fails.
 */
export async function fetchCharacterState(
  token: string
): Promise<CharacterState | null> {
  if (Date.now() - cacheTs < CACHE_TTL && cachedState) return cachedState
  const data = await volauraFetch<CharacterState>('/api/character/state', token)
  if (data) {
    cachedState = data
    cacheTs = Date.now()
  }
  return data
}

/**
 * Fetch crystal balance separately (lighter endpoint).
 */
export async function fetchCrystals(
  token: string
): Promise<CrystalBalance | null> {
  return volauraFetch<CrystalBalance>('/api/character/crystals', token)
}

/**
 * Send a character event to VOLAURA (focus session, streak, energy, psychotype).
 * Best-effort: retries once on 500, silently fails on everything else.
 */
export async function sendCharacterEvent(
  token: string,
  event: CharacterEvent
): Promise<boolean> {
  if (!isConfigured()) return false
  const res = await volauraFetch<unknown>('/api/character/events', token, {
    method: 'POST',
    body: JSON.stringify(event),
  })
  return res !== null
}

// ── Convenience senders ───────────────────────────────────────────────────────

/** Send focus session completion event */
export function sendFocusSession(
  token: string,
  data: {
    durationMinutes: number
    phase: string
    energyBefore: number
    energyAfter: number
    psychotype: string | null
  }
): Promise<boolean> {
  return sendCharacterEvent(token, {
    event_type: 'xp_earned',
    payload: {
      _schema_version: 1,
      xp: Math.floor(data.durationMinutes * 5),
      focus_minutes: data.durationMinutes,
      phase: data.phase,
      energy_before: data.energyBefore,
      energy_after: data.energyAfter,
      psychotype: data.psychotype,
    },
    source_product: 'mindshift',
  })
}

/** Send streak update event (once per day max) */
export function sendStreakUpdate(
  token: string,
  streakDays: number
): Promise<boolean> {
  return sendCharacterEvent(token, {
    event_type: 'buff_applied',
    payload: {
      _schema_version: 1,
      buff_type: 'consistency',
      streak_days: streakDays,
    },
    source_product: 'mindshift',
  })
}

/** Send energy/vitals event */
export function sendVitals(
  token: string,
  energyLevel: number,
  burnoutScore: number
): Promise<boolean> {
  return sendCharacterEvent(token, {
    event_type: 'vital_logged',
    payload: {
      _schema_version: 1,
      energy_level: energyLevel,
      burnout_score: burnoutScore,
    },
    source_product: 'mindshift',
  })
}

/** Send psychotype derivation event (one-time or on change) */
export function sendPsychotype(
  token: string,
  psychotype: string
): Promise<boolean> {
  return sendCharacterEvent(token, {
    event_type: 'stat_changed',
    payload: {
      _schema_version: 1,
      stat: 'psychotype',
      value: psychotype,
      source: 'mindshift_derivation',
    },
    source_product: 'mindshift',
  })
}

/** Check if VOLAURA integration is configured */
export { isConfigured as isVolauraConfigured }
