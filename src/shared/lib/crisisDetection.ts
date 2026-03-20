/**
 * Crisis detection — keyword-based safety net for vulnerable users.
 *
 * This is NOT a clinical tool. It's a simple text scan that surfaces
 * crisis resources when certain phrases appear in user input.
 *
 * Rules:
 * - Never block user actions — show resources alongside, not instead of
 * - Never send flagged text to AI endpoints
 * - Warm teal styling, never alarming
 * - Respect user autonomy
 */

const CRISIS_KEYWORDS_EN = [
  'kill myself',
  'suicide',
  'want to die',
  'end my life',
  'self harm',
  'self-harm',
  'hurt myself',
  'no reason to live',
  'better off dead',
]

const CRISIS_KEYWORDS_RU = [
  'убить себя',
  'суицид',
  'хочу умереть',
  'покончить',
  'причинить себе',
  'нет смысла жить',
  'лучше бы умер',
  'лучше бы умерла',
]

const ALL_KEYWORDS = [...CRISIS_KEYWORDS_EN, ...CRISIS_KEYWORDS_RU]

/**
 * Case-insensitive check against crisis keyword lists (EN + RU).
 * Returns true if any crisis-related phrase is found in the text.
 */
export function detectCrisis(text: string): boolean {
  const lower = text.toLowerCase()
  return ALL_KEYWORDS.some(keyword => lower.includes(keyword))
}

interface CrisisResources {
  /** Primary crisis line for the user's locale */
  primary: string
  /** International fallback line */
  international: string
}

/**
 * Returns locale-appropriate crisis hotline information.
 * Always includes an international option.
 */
export function getCrisisResources(locale: string): CrisisResources {
  const lang = locale.slice(0, 2).toLowerCase()

  if (lang === 'ru') {
    return {
      primary: 'Телефон доверия: 8-800-2000-122 (бесплатно, круглосуточно)',
      international: 'Crisis Text Line: Text HOME to 741741',
    }
  }

  return {
    primary: 'If you\'re in crisis: 988 Suicide & Crisis Lifeline (call or text 988)',
    international: 'Crisis Text Line: Text HOME to 741741',
  }
}
