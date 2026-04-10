/**
 * volaura-bridge.ts — Phase 4: MindShift → volaura-bridge-proxy → VOLAURA
 *
 * All VOLAURA API calls now route through the `volaura-bridge-proxy` Supabase
 * edge function, which handles JWT exchange server-side. This fixes the 401
 * errors that occurred in Phase 1 (direct Railway calls with MindShift JWTs).
 *
 * Best-effort: all calls are fire-and-forget. VOLAURA proxy failures
 * NEVER block MindShift UX. Silent fallback on any error.
 *
 * Integration spec: C:/Projects/VOLAURA/docs/MINDSHIFT-INTEGRATION-SPEC.md
 * Sprint E2 Phase 4 — see memory/wip-sprint-e2-phase3.md
 */

// -- Types ---------------------------------------------------------------------

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
  event_type: 'xp_earned' | 'buff_applied' | 'vital_logged' | 'stat_changed' | 'crystal_earned'
  payload: Record<string, unknown> & { _schema_version: 1 }
  source_product: 'mindshift'
}

// -- Config --------------------------------------------------------------------

// The proxy edge function lives in the same Supabase project as MindShift.
// No cross-project JWT issues — Supabase validates the JWT internally.
const SUPABASE_URL   = import.meta.env.VITE_SUPABASE_URL ?? ''
const SUPABASE_ANON  = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''
const PROXY_ENDPOINT = `${SUPABASE_URL}/functions/v1/volaura-bridge-proxy`

// -- Cache ---------------------------------------------------------------------

const stateCache = new Map<string, { data: CharacterState; ts: number }>()
const CACHE_TTL  = 5 * 60 * 1000 // 5 minutes client-side cache

// -- Proxy helper --------------------------------------------------------------

function isConfigured(): boolean {
  return SUPABASE_URL.length > 0 && SUPABASE_ANON.length > 0
}

async function proxyCall<T>(
  token: string,
  body: Record<string, unknown>,
): Promise<T | null> {
  if (!isConfigured()) return null

  try {
    const res = await fetch(PROXY_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'apikey':        SUPABASE_ANON,
        Authorization:   `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    })

    // Proxy always returns 200 (even on VOLAURA-side errors)
    if (!res.ok) return null

    const json = await res.json() as { ok: boolean; data?: T; reason?: string }
    if (!json.ok) return null

    return (json.data ?? null) as T | null
  } catch {
    return null
  }
}

// -- Public API ----------------------------------------------------------------

/**
 * Fetch user's VOLAURA character state (AURA badge, crystals, stats).
 * Cached for 5 minutes. Returns null if not configured or proxy fails.
 */
export async function fetchCharacterState(
  token: string,
): Promise<CharacterState | null> {
  const cached = stateCache.get(token)
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data

  const data = await proxyCall<CharacterState>(token, { action: 'fetch_state' })
  if (data) stateCache.set(token, { data, ts: Date.now() })
  return data
}

/**
 * Fetch crystal balance separately (lighter endpoint).
 */
export async function fetchCrystals(
  token: string,
): Promise<CrystalBalance | null> {
  return proxyCall<CrystalBalance>(token, { action: 'fetch_crystals' })
}

/**
 * Send a character event to VOLAURA via proxy.
 * Best-effort: silently fails on any error.
 */
async function sendCharacterEvent(
  token: string,
  event: CharacterEvent,
): Promise<boolean> {
  if (!isConfigured()) return false

  const result = await proxyCall<unknown>(token, {
    action:     'character_event',
    event_type: event.event_type,
    payload:    event.payload,
  })

  return result !== null
}

// -- Convenience senders -------------------------------------------------------

/** Send focus session completion event
 *
 * GDPR FIREWALL (Article 9): energy_before / energy_after are health signals.
 * They are stored in Supabase (user's own data) but NEVER forwarded to VOLAURA.
 * Only anonymised productivity signals (duration, phase, xp) cross the boundary.
 */
export function sendFocusSession(
  token: string,
  data: {
    durationMinutes: number
    phase: string
    energyBefore: number
    energyAfter: number
    psychotype: string | null
  },
): Promise<boolean> {
  return sendCharacterEvent(token, {
    event_type: 'xp_earned',
    payload: {
      _schema_version: 1,
      xp:              Math.floor(data.durationMinutes * 5),
      focus_minutes:   data.durationMinutes,
      phase:           data.phase,
      // energy_before / energy_after intentionally excluded — GDPR Art.9 health data firewall
      psychotype:      data.psychotype ?? undefined,
    },
    source_product: 'mindshift',
  })
}

/** Send streak update event (once per day max) */
export function sendStreakUpdate(
  token: string,
  streakDays: number,
): Promise<boolean> {
  return sendCharacterEvent(token, {
    event_type: 'buff_applied',
    payload: {
      _schema_version: 1,
      buff_type:   'consistency',
      streak_days: streakDays,
    },
    source_product: 'mindshift',
  })
}

/** Send energy/vitals event */
export function sendVitals(
  token: string,
  energyLevel: number,
  burnoutScore: number,
): Promise<boolean> {
  return sendCharacterEvent(token, {
    event_type: 'vital_logged',
    payload: {
      _schema_version: 1,
      energy_level:  energyLevel,
      burnout_score: burnoutScore,
    },
    source_product: 'mindshift',
  })
}

/** Send psychotype derivation event (one-time or on change) */
export function sendPsychotype(
  token: string,
  psychotype: string,
): Promise<boolean> {
  return sendCharacterEvent(token, {
    event_type: 'stat_changed',
    payload: {
      _schema_version: 1,
      stat:   'psychotype',
      value:  psychotype,
      source: 'mindshift_derivation',
    },
    source_product: 'mindshift',
  })
}

/** Send task completion event (skill credit) */
export function sendTaskDone(
  token: string,
  difficulty: number,
): Promise<boolean> {
  return sendCharacterEvent(token, {
    event_type: 'xp_earned',
    payload: {
      _schema_version: 1,
      xp:              difficulty * 10,
      skill_credit:    1,
      task_difficulty: difficulty,
      source:          'task_completion',
    },
    source_product: 'mindshift',
  })
}

/** Send crystal earned event — 1 min focus = 5 crystals (Constitution formula) */
export function sendCrystalEarned(
  token: string,
  crystals: number,
  source: 'focus_session' | 'task_bonus' | 'streak_bonus',
): Promise<boolean> {
  return sendCharacterEvent(token, {
    event_type: 'crystal_earned',
    payload: {
      _schema_version: 1,
      crystals,
      source,
    },
    source_product: 'mindshift',
  })
}

/** Check if VOLAURA integration is configured */
export { isConfigured as isVolauraConfigured }
