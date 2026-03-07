/**
 * shared/lib/date.js
 * Pure date utilities. No React, no side effects, no i18n dependencies.
 *
 * Note: greeting() was NOT moved here because it depends on the T translation
 * object defined in mindflow.jsx. It will move to shared/lib/i18n.js when the
 * T object is extracted in Sprint 1 (features/ slice extraction).
 * TODO: move greeting() here once T is in shared/
 */

/**
 * Returns true if the given ISO date string represents today.
 *
 * @param {string|null|undefined} iso - ISO8601 date string
 * @returns {boolean}
 * @example isToday("2026-03-07T09:00:00Z") // true (if today is 2026-03-07)
 */
export function isToday(iso) {
  if (!iso) return false;
  const d = new Date(iso);
  const n = new Date();
  return (
    d.getFullYear() === n.getFullYear() &&
    d.getMonth()    === n.getMonth()    &&
    d.getDate()     === n.getDate()
  );
}

/**
 * Returns a human-readable label for today's date in the given language.
 * Uses the browser's Intl.DateTimeFormat — no external dependencies.
 *
 * @param {"en"|"ru"|"az"} lang
 * @returns {string}
 * @example todayLabel("en") // "Saturday, March 7"
 * @example todayLabel("ru") // "суббота, 7 марта"
 */
export function todayLabel(lang) {
  const locale =
    lang === "ru" ? "ru-RU" :
    lang === "az" ? "az-AZ" :
    "en-US";
  return new Date().toLocaleDateString(locale, {
    weekday: "long",
    month:   "long",
    day:     "numeric",
  });
}
