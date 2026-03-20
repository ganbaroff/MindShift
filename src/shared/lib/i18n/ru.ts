/**
 * Russian strings — parallel to en.ts.
 * Missing keys automatically fall back to en.ts at runtime.
 */
import type { I18nKey } from './en'

export const ru: Partial<Record<I18nKey, string>> = {
  // ── Greetings ──────────────────────────────────────────────────────────────
  'home.greeting.morning':   'Доброе утро ☀️',
  'home.greeting.afternoon': 'Добрый день 🌤️',
  'home.greeting.evening':   'Добрый вечер 🌙',
  'home.greeting.night':     'Спокойной ночи 🌃',

  // ── Home screen ────────────────────────────────────────────────────────────
  'home.now_pool.empty':     'Пока пусто — добавь первую задачу 👇',
  'home.streak.label':       'дней подряд 🔥',
  'home.low_energy.banner':  'Режим низкой энергии — одна задача за раз 🌱',

  // ── Focus screen ──────────────────────────────────────────────────────────
  'focus.start':             'Начать фокус →',
  'focus.skip_ritual':       'Пропустить ритуал',
  'focus.med_peak_prefix':   '⚡ Пик действия лекарства:',

  // ── Tasks ─────────────────────────────────────────────────────────────────
  'tasks.next.filling_up':   'почти полно',
  'tasks.overdue_banner':    'Есть просроченные задачи — перенести?',

  // ── Settings ──────────────────────────────────────────────────────────────
  'settings.medication.title':    'Медикаменты',
  'settings.medication.subtitle': 'Выделить окно пиковой концентрации',
  'settings.rerun_setup':         'Пройти настройку заново',

  // ── Crisis / Mental Health ────────────────────────────────────────────────
  'crisis.banner.message':   'Ты не одинок. Эти чувства реальны, и помощь доступна.',
  'crisis.settings.title':   'Если тебе или кому-то из близких тяжело',
  'crisis.settings.en':      'Телефон доверия: 8-800-2000-122 (бесплатно, круглосуточно)',
  'crisis.settings.intl':    'Crisis Text Line: Text HOME to 741741',

  // ── Generic ───────────────────────────────────────────────────────────────
  'generic.skip':            'Пропустить',
  'generic.done':            'Готово',
  'generic.cancel':          'Отмена',
}
