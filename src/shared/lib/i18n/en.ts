/**
 * English strings — source of truth for all user-facing copy.
 * Keys are dot-separated namespaces: <feature>.<key>
 */
export const en = {
  // ── Greetings (time-of-day aware) ─────────────────────────────────────────
  'home.greeting.morning':   'Good morning ☀️',
  'home.greeting.afternoon': 'Good afternoon 🌤️',
  'home.greeting.evening':   'Good evening 🌙',
  'home.greeting.night':     'Good night 🌃',

  // ── Home screen ────────────────────────────────────────────────────────────
  'home.now_pool.empty':     "Nothing here yet — add your first task 👇",
  'home.streak.label':       'day streak 🔥',
  'home.low_energy.banner':  'Low-energy mode — one task at a time 🌱',

  // ── Focus screen ──────────────────────────────────────────────────────────
  'focus.start':             'Start Focus →',
  'focus.skip_ritual':       'Skip ritual & jump in',
  'focus.med_peak_prefix':   '⚡ Med peak window:',

  // ── Tasks ─────────────────────────────────────────────────────────────────
  'tasks.next.filling_up':   'filling up',
  'tasks.overdue_banner':    'Some tasks are overdue — reschedule?',

  // ── Settings ──────────────────────────────────────────────────────────────
  'settings.medication.title':    'Medication',
  'settings.medication.subtitle': 'Highlight peak focus window',
  'settings.rerun_setup':         'Re-run setup wizard',

  // ── Crisis / Mental Health ────────────────────────────────────────────────
  'crisis.banner.message':   "You're not alone. These feelings are real, and help is available.",
  'crisis.settings.title':   'If you or someone you know is struggling',
  'crisis.settings.en':      '988 Suicide & Crisis Lifeline (call or text 988)',
  'crisis.settings.intl':    'Crisis Text Line: Text HOME to 741741',

  // ── Today screen ──────────────────────────────────────────────────────────
  'today.energy.low':        'Low energy — one easy task is plenty today',
  'today.energy.high':       'Good energy. Your window for deeper work.',
  'today.evening.done':      "Today's wrap-up",
  'today.empty':             'Clear day ahead',

  // ── Generic ───────────────────────────────────────────────────────────────
  'generic.skip':            'Skip',
  'generic.done':            'Done',
  'generic.cancel':          'Cancel',
} as const

export type I18nKey = keyof typeof en
