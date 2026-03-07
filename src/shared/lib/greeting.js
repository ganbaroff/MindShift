/**
 * shared/lib/greeting.js
 * Time-of-day greeting in the user's language.
 *
 * Bolt 1.2: extracted from mindflow.jsx lines 746–750.
 * Previously blocked by T dependency (resolved: T now in shared/i18n/).
 */

import { T } from "../i18n/translations.js";

export function greeting(lang) {
  const h = new Date().getHours();
  const t = T[lang] || T.en;
  return h < 12 ? t.greeting_morning : h < 18 ? t.greeting_day : t.greeting_evening;
}
