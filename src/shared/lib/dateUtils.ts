/**
 * Date Utilities — MindShift
 *
 * Centralised date helpers. Previously scattered across AddTaskModal,
 * useSessionHistory, App.tsx, etc.
 */

/** YYYY-MM-DD string from a Date (local timezone). */
export function toISODate(d: Date): string {
  return d.toISOString().split('T')[0]
}

/** Today as YYYY-MM-DD (local). */
export function todayISO(): string {
  return toISODate(new Date())
}

/** Tomorrow as YYYY-MM-DD (local). */
export function tomorrowISO(): string {
  return toISODate(new Date(Date.now() + 86_400_000))
}

/** Current month as YYYY-MM. */
export function currentMonthISO(): string {
  return new Date().toISOString().slice(0, 7)
}

/** Monday of the current week at 00:00 local time. */
export function getWeekStart(): Date {
  const now = new Date()
  const day = now.getDay() // 0 = Sun
  const daysToMonday = (day + 6) % 7
  const monday = new Date(now)
  monday.setDate(now.getDate() - daysToMonday)
  monday.setHours(0, 0, 0, 0)
  return monday
}

/** Next Monday as YYYY-MM-DD (local). Advances past current day even if today is Monday. */
export function nextMondayISO(): string {
  const now = new Date()
  const day = now.getDay() // 0=Sun, 1=Mon … 6=Sat
  const daysUntilMonday = day === 1 ? 7 : (8 - day) % 7 || 7
  const next = new Date(now)
  next.setDate(now.getDate() + daysUntilMonday)
  return toISODate(next)
}

/**
 * ISO week key for a date.
 * Sunday maps to next week (to match the weekly planning trigger logic).
 */
export function getISOWeekKey(date: Date = new Date()): string {
  const d = new Date(date)
  // If Sunday, advance to next week
  if (d.getDay() === 0) d.setDate(d.getDate() + 1)
  const daysToMonday = (d.getDay() + 6) % 7
  const monday = new Date(d)
  monday.setDate(d.getDate() - daysToMonday)
  return toISODate(monday)
}
