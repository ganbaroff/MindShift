/**
 * Localized crisis hotlines by country.
 *
 * Source: findahelpline.com (175+ countries), IASP, Wikipedia.
 * Falls back to international helpline if country not found.
 *
 * IMPORTANT: These are life-critical resources. Keep updated.
 */

export interface CrisisResource {
  name: string
  number: string
  type: 'call' | 'text' | 'chat' | 'web'
}

const HOTLINES: Record<string, CrisisResource[]> = {
  US: [
    { name: '988 Suicide & Crisis Lifeline', number: '988', type: 'call' },
    { name: 'Crisis Text Line', number: 'Text HOME to 741741', type: 'text' },
  ],
  GB: [
    { name: 'Samaritans', number: '116 123', type: 'call' },
    { name: 'SHOUT', number: 'Text SHOUT to 85258', type: 'text' },
  ],
  CA: [
    { name: 'Talk Suicide Canada', number: '988', type: 'call' },
    { name: 'Crisis Text Line', number: 'Text CONNECT to 686868', type: 'text' },
  ],
  AU: [
    { name: 'Lifeline Australia', number: '13 11 14', type: 'call' },
    { name: 'Beyond Blue', number: '1300 22 4636', type: 'call' },
  ],
  DE: [
    { name: 'Telefonseelsorge', number: '0800 111 0 111', type: 'call' },
  ],
  FR: [
    { name: 'SOS Amitié', number: '09 72 39 40 50', type: 'call' },
    { name: '3114 (numéro national)', number: '3114', type: 'call' },
  ],
  RU: [
    { name: 'Телефон доверия', number: '8-800-2000-122', type: 'call' },
  ],
  AZ: [
    { name: 'Psixoloji yardım xətti', number: '510', type: 'call' },
    { name: 'Uşaq və gənclər üçün', number: '116 111', type: 'call' },
  ],
  TR: [
    { name: 'Yaşam Hattı', number: '182', type: 'call' },
  ],
  UA: [
    { name: 'Лайфлайн Україна', number: '7333', type: 'call' },
  ],
  IN: [
    { name: 'iCall', number: '9152987821', type: 'call' },
    { name: 'Vandrevala Foundation', number: '1860-2662-345', type: 'call' },
  ],
  JP: [
    { name: 'いのちの電話', number: '0570-783-556', type: 'call' },
  ],
  KR: [
    { name: '자살예방상담전화', number: '1393', type: 'call' },
  ],
  BR: [
    { name: 'CVV', number: '188', type: 'call' },
  ],
  IL: [
    { name: 'ERAN', number: '1201', type: 'call' },
  ],
  GE: [
    { name: 'სატელეფონო ნდობა', number: '116 006', type: 'call' },
  ],
}

const INTERNATIONAL: CrisisResource[] = [
  { name: 'Find A Helpline', number: 'findahelpline.com', type: 'web' },
  { name: 'Befrienders Worldwide', number: 'befrienders.org', type: 'web' },
]

/**
 * Get crisis resources for a country code.
 * Falls back to international resources if country not found.
 */
export function getCrisisResourcesByCountry(countryCode: string | null): CrisisResource[] {
  if (!countryCode) return INTERNATIONAL
  const code = countryCode.toUpperCase()
  return HOTLINES[code] ?? INTERNATIONAL
}

/**
 * Try to detect country from locale string (e.g. "en-US" → "US", "ru-RU" → "RU").
 * Returns null if can't determine.
 */
export function countryFromLocale(locale: string): string | null {
  const parts = locale.split('-')
  if (parts.length >= 2) {
    const country = parts[parts.length - 1].toUpperCase()
    if (country.length === 2) return country
  }
  // Fallback: language → likely country
  const LANG_COUNTRY: Record<string, string> = {
    en: 'US', ru: 'RU', de: 'DE', fr: 'FR', ja: 'JP',
    ko: 'KR', pt: 'BR', tr: 'TR', uk: 'UA', az: 'AZ',
    ka: 'GE', he: 'IL', hi: 'IN',
  }
  return LANG_COUNTRY[parts[0].toLowerCase()] ?? null
}
