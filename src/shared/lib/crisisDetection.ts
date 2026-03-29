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
 * Normalize text before crisis keyword matching.
 * Resists common encoding bypasses:
 *   - Unicode NFKD normalization (strips accents / decomposes lookalikes)
 *   - Cyrillic homoglyphs that render identically to Latin (а→a, е→e, etc.)
 *   - Leet-speak digit substitutions (0→o, 1→i, 3→e, 4→a, 5→s)
 *   - Punctuation/dash injection between characters
 */
function normalizeForDetection(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')                    // strip combining diacritics
    .replace(/[аА]/g, 'a').replace(/[еЕ]/g, 'e')        // Cyrillic homoglyphs
    .replace(/[оО]/g, 'o').replace(/[рР]/g, 'p')
    .replace(/[сС]/g, 'c').replace(/[хХ]/g, 'x')
    .replace(/[уУ]/g, 'y').replace(/[іІ]/g, 'i')
    .replace(/0/g, 'o').replace(/1/g, 'i')              // leet digits
    .replace(/3/g, 'e').replace(/4/g, 'a').replace(/5/g, 's')
    .replace(/[.\-_*|\\/@]+/g, ' ')                     // punctuation collapse
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim()
}

/**
 * Case-insensitive check against crisis keyword lists (EN + RU).
 * Normalizes text before matching to resist simple encoding bypasses.
 * Returns true if any crisis-related phrase is found in the text.
 */
export function detectCrisis(text: string): boolean {
  const lower = text.toLowerCase()
  const normalized = normalizeForDetection(text)
  // Check both raw lowercase and normalized — normalization can introduce
  // false negatives for genuine Cyrillic input.
  return ALL_KEYWORDS.some(k => lower.includes(k) || normalized.includes(k))
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
