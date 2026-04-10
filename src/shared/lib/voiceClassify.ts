/**
 * Voice classification utilities.
 *
 * Pure functions extracted from AddTaskModal so they can be
 * tested in isolation and reused.
 */

// -- ClassifyResult type -------------------------------------------------------

export interface ClassifyResult {
  type: 'task' | 'idea' | 'reminder'
  title: string
  pool: 'now' | 'next' | 'someday'
  difficulty: 1 | 2 | 3
  estimatedMinutes: number
  dueDate: string | null
  dueTime: string | null
  reminderMinutesBefore: number | null
  notes: string | null
  confidence: number
}

// -- Validation constants ------------------------------------------------------

const VALID_TYPES = ['task', 'idea', 'reminder'] as const
const VALID_POOLS = ['now', 'next', 'someday'] as const
const VALID_DIFFICULTIES = [1, 2, 3] as const
const VALID_REMINDER_MINUTES = [15, 30, 60, 1440] as const

/** Minimum confidence for auto-classification. Below this → ask user. */
export const CONFIDENCE_THRESHOLD = 0.7

// -- parseClassifyResult -------------------------------------------------------

/**
 * Safely parse and validate a raw classify-voice-input response.
 *
 * Returns a valid ClassifyResult or `null` if the data is garbage.
 * Never throws — returns null for any invalid input.
 *
 * @param data - raw value from supabase.functions.invoke `data` field
 * @param fallbackTitle - original transcript to use if title is missing
 */
export function parseClassifyResult(
  data: unknown,
  fallbackTitle: string
): ClassifyResult | null {
  if (data == null || typeof data !== 'object') return null

  const raw = data as Record<string, unknown>

  // type — required, must be one of 3
  const type = VALID_TYPES.includes(raw.type as typeof VALID_TYPES[number])
    ? (raw.type as ClassifyResult['type'])
    : null
  if (!type) return null

  // title — string, fallback to transcript
  const title = typeof raw.title === 'string' && raw.title.trim()
    ? raw.title.trim().slice(0, 60)
    : fallbackTitle.slice(0, 60)
  if (!title) return null

  // pool
  const pool = VALID_POOLS.includes(raw.pool as typeof VALID_POOLS[number])
    ? (raw.pool as ClassifyResult['pool'])
    : (type === 'idea' ? 'someday' : type === 'reminder' ? 'next' : 'now')

  // difficulty
  const rawDiff = Number(raw.difficulty)
  const difficulty = (VALID_DIFFICULTIES as readonly number[]).includes(rawDiff)
    ? (rawDiff as ClassifyResult['difficulty'])
    : (type === 'idea' ? 1 : 2) as ClassifyResult['difficulty']

  // estimatedMinutes
  const rawMin = Number(raw.estimatedMinutes)
  const estimatedMinutes = Number.isFinite(rawMin) && rawMin > 0
    ? Math.max(1, Math.min(480, Math.round(rawMin)))
    : (type === 'idea' ? 5 : 25)

  // dueDate
  const dueDate = typeof raw.dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.dueDate)
    ? raw.dueDate
    : null

  // dueTime
  const dueTime = typeof raw.dueTime === 'string' && /^\d{2}:\d{2}$/.test(raw.dueTime)
    ? raw.dueTime
    : null

  // reminderMinutesBefore
  const rawReminder = Number(raw.reminderMinutesBefore)
  const reminderMinutesBefore = (VALID_REMINDER_MINUTES as readonly number[]).includes(rawReminder)
    ? rawReminder
    : null

  // notes
  const notes = typeof raw.notes === 'string' && raw.notes.trim()
    ? raw.notes.trim()
    : null

  // confidence (0-1, default 1.0 for backward compat with old edge function)
  const rawConf = Number(raw.confidence)
  const confidence = Number.isFinite(rawConf) && rawConf >= 0 && rawConf <= 1
    ? rawConf
    : 1.0

  return {
    type,
    title,
    pool,
    difficulty,
    estimatedMinutes,
    dueDate,
    dueTime,
    reminderMinutesBefore,
    notes,
    confidence,
  }
}

// -- isLowConfidence -----------------------------------------------------------

/** Returns true when the user should confirm classification manually. */
export function isLowConfidence(result: ClassifyResult): boolean {
  return result.confidence < CONFIDENCE_THRESHOLD
}
