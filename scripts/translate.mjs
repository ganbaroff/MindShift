/**
 * Auto-translate en.json to target languages using the translate.i18next.com free API.
 *
 * Usage: node scripts/translate.mjs <targetLang>
 * Example: node scripts/translate.mjs de
 *
 * Preserves: {{variables}}, structure, keys
 * Falls back to English if translation fails.
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const LOCALES_DIR = resolve(__dirname, '../src/locales')

const targetLang = process.argv[2]
if (!targetLang) {
  console.error('Usage: node scripts/translate.mjs <lang>')
  console.error('Example: node scripts/translate.mjs de')
  process.exit(1)
}

const en = JSON.parse(readFileSync(resolve(LOCALES_DIR, 'en.json'), 'utf-8'))

// Load existing translations if file exists
let existing = {}
try {
  existing = JSON.parse(readFileSync(resolve(LOCALES_DIR, `${targetLang}.json`), 'utf-8'))
} catch { /* new language */ }

// Flatten nested object
function flatten(obj, prefix = '') {
  const result = {}
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'object' && value !== null) {
      Object.assign(result, flatten(value, fullKey))
    } else {
      result[fullKey] = value
    }
  }
  return result
}

// Unflatten back to nested
function unflatten(obj) {
  const result = {}
  for (const [key, value] of Object.entries(obj)) {
    const parts = key.split('.')
    let current = result
    for (let i = 0; i < parts.length - 1; i++) {
      current[parts[i]] = current[parts[i]] || {}
      current = current[parts[i]]
    }
    current[parts[parts.length - 1]] = value
  }
  return result
}

// Check if key already translated
function getExisting(key) {
  const parts = key.split('.')
  let current = existing
  for (const part of parts) {
    if (!current || typeof current !== 'object') return null
    current = current[part]
  }
  return typeof current === 'string' ? current : null
}

// Free translation via Google Translate (no API key needed)
async function translateText(text, from, to) {
  // Protect {{variables}}
  const vars = []
  const protected_ = text.replace(/\{\{([^}]+)\}\}/g, (match) => {
    vars.push(match)
    return `__VAR${vars.length - 1}__`
  })

  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(protected_)}`

  try {
    const resp = await fetch(url)
    const data = await resp.json()
    let translated = data[0].map(s => s[0]).join('')

    // Restore {{variables}}
    vars.forEach((v, i) => {
      translated = translated.replace(`__VAR${i}__`, v)
      translated = translated.replace(`__VAR${i} __`, v)
      translated = translated.replace(`__ VAR${i}__`, v)
    })

    return translated
  } catch (err) {
    console.warn(`  Failed to translate: "${text.slice(0, 40)}..." — keeping English`)
    return text
  }
}

async function main() {
  const flat = flatten(en)
  const keys = Object.keys(flat)
  const translated = {}
  let newCount = 0
  let skipCount = 0

  console.log(`Translating ${keys.length} keys to ${targetLang}...`)

  for (const key of keys) {
    const existingVal = getExisting(key)
    if (existingVal) {
      translated[key] = existingVal
      skipCount++
      continue
    }

    const result = await translateText(flat[key], 'en', targetLang)
    translated[key] = result
    newCount++

    // Rate limit: 100ms between requests
    await new Promise(r => setTimeout(r, 100))

    if (newCount % 20 === 0) {
      console.log(`  ${newCount} translated, ${skipCount} skipped...`)
    }
  }

  const output = unflatten(translated)
  writeFileSync(
    resolve(LOCALES_DIR, `${targetLang}.json`),
    JSON.stringify(output, null, 2) + '\n',
    'utf-8'
  )

  console.log(`\nDone! ${newCount} new translations, ${skipCount} kept existing.`)
  console.log(`Output: src/locales/${targetLang}.json`)
}

main().catch(console.error)
