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

  // ── Generic ───────────────────────────────────────────────────────────────
  'generic.skip':            'Skip',
  'generic.done':            'Done',
  'generic.cancel':          'Cancel',
} as const

export type I18nKey = keyof typeof en
