/**
 * quickParse — client-side natural language parser for Quick Capture.
 *
 * Extracts task type, date, time from free-form text (EN + RU).
 * Pure function, no React, testable in isolation, works offline.
 */

import { todayISO, tomorrowISO, toISODate } from './dateUtils'

export type TaskType = 'task' | 'idea' | 'reminder' | 'meeting'

export interface ParsedTask {
  title: string
  taskType: TaskType
  dueDate: string | null
  dueTime: string | null
  confidence: number
}

// ── Day name maps ─────────────────────────────────────────────────────────────

const EN_DAYS: Record<string, number> = {
  sunday: 0, sun: 0,
  monday: 1, mon: 1,
  tuesday: 2, tue: 2,
  wednesday: 3, wed: 3,
  thursday: 4, thu: 4,
  friday: 5, fri: 5,
  saturday: 6, sat: 6,
}

const RU_DAYS: Record<string, number> = {
  'воскресенье': 0, 'воскресенья': 0, 'вс': 0,
  'понедельник': 1, 'понедельника': 1, 'пн': 1,
  'вторник': 2, 'вторника': 2, 'вт': 2,
  'среда': 3, 'среду': 3, 'ср': 3,
  'четверг': 4, 'четверга': 4, 'чт': 4,
  'пятница': 5, 'пятницу': 5, 'пт': 5,
  'суббота': 6, 'субботу': 6, 'сб': 6,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function nextWeekday(target: number): string {
  const now = new Date()
  const current = now.getDay()
  let diff = target - current
  if (diff <= 0) diff += 7
  const date = new Date(now)
  date.setDate(now.getDate() + diff)
  return toISODate(date)
}

function stripMatch(text: string, match: string): string {
  return text.replace(match, '').replace(/\s{2,}/g, ' ').trim()
}

// ── Date extraction ───────────────────────────────────────────────────────────

function extractDate(text: string): { date: string | null; cleaned: string } {
  const lower = text.toLowerCase()

  // Today / Сегодня
  if (/\b(today|сегодня)\b/i.test(text)) {
    return { date: todayISO(), cleaned: text.replace(/\b(today|сегодня)\b/i, '').trim() }
  }

  // Tomorrow / Завтра
  if (/\b(tomorrow|завтра)\b/i.test(text)) {
    return { date: tomorrowISO(), cleaned: text.replace(/\b(tomorrow|завтра)\b/i, '').trim() }
  }

  // "next Monday" / "в понедельник"
  const enNextDay = lower.match(/\bnext\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|wed|thu|fri|sat)\b/)
  if (enNextDay) {
    const dayNum = EN_DAYS[enNextDay[1]]
    if (dayNum !== undefined) {
      return { date: nextWeekday(dayNum), cleaned: stripMatch(text, enNextDay[0]) }
    }
  }

  // English day name standalone: "friday", "on friday"
  const enDay = lower.match(/\b(?:on\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|wed|thu|fri|sat)\b/)
  if (enDay) {
    const dayNum = EN_DAYS[enDay[1]]
    if (dayNum !== undefined) {
      return { date: nextWeekday(dayNum), cleaned: stripMatch(text, enDay[0]) }
    }
  }

  // Russian: "в пятницу", "в понедельник"
  const ruDay = lower.match(/\bв\s+(воскресенье|понедельник|вторник|среду|четверг|пятницу|субботу)\b/)
  if (ruDay) {
    const dayNum = RU_DAYS[ruDay[1]]
    if (dayNum !== undefined) {
      return { date: nextWeekday(dayNum), cleaned: stripMatch(text, ruDay[0]) }
    }
  }

  // Russian short: "в пн", "в ср"
  const ruShortDay = lower.match(/\bв\s+(пн|вт|ср|чт|пт|сб|вс)\b/)
  if (ruShortDay) {
    const dayNum = RU_DAYS[ruShortDay[1]]
    if (dayNum !== undefined) {
      return { date: nextWeekday(dayNum), cleaned: stripMatch(text, ruShortDay[0]) }
    }
  }

  return { date: null, cleaned: text }
}

// ── Time extraction ───────────────────────────────────────────────────────────

function extractTime(text: string): { time: string | null; cleaned: string } {
  // "at 3pm", "at 3:30pm", "at 15:00"
  const enTime = text.match(/\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i)
  if (enTime) {
    let h = parseInt(enTime[1], 10)
    const m = enTime[2] ? parseInt(enTime[2], 10) : 0
    const period = enTime[3].toLowerCase()
    if (period === 'pm' && h < 12) h += 12
    if (period === 'am' && h === 12) h = 0
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
      return { time, cleaned: stripMatch(text, enTime[0]) }
    }
  }

  // "at 15:00", "в 15:00", "at 9:30"
  const militaryTime = text.match(/\b(?:at|в)\s+(\d{1,2}):(\d{2})\b/i)
  if (militaryTime) {
    const h = parseInt(militaryTime[1], 10)
    const m = parseInt(militaryTime[2], 10)
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
      return { time, cleaned: stripMatch(text, militaryTime[0]) }
    }
  }

  // "в 3 часа", "в 15 часов"
  const ruHour = text.match(/\bв\s+(\d{1,2})\s*(?:часа?|часов)\b/i)
  if (ruHour) {
    const h = parseInt(ruHour[1], 10)
    if (h >= 0 && h <= 23) {
      const time = `${h.toString().padStart(2, '0')}:00`
      return { time, cleaned: stripMatch(text, ruHour[0]) }
    }
  }

  // "at noon" / "в полдень"
  if (/\b(at\s+noon|в\s+полдень)\b/i.test(text)) {
    return { time: '12:00', cleaned: text.replace(/\b(at\s+noon|в\s+полдень)\b/i, '').trim() }
  }

  return { time: null, cleaned: text }
}

// ── Type extraction ───────────────────────────────────────────────────────────

function extractType(text: string): { type: TaskType; cleaned: string } {
  const lower = text.toLowerCase()

  // Meeting patterns
  if (/\b(meeting\s+with|встреча\s+с|встреча|meeting|созвон)\b/i.test(text)) {
    return { type: 'meeting', cleaned: text }
  }

  // Reminder patterns — strip prefix
  const reminderMatch = text.match(/^(?:remind\s+me\s+(?:to\s+)?|напомни(?:ть)?\s+(?:мне\s+)?|напоминание\s*[:\-]?\s*)/i)
  if (reminderMatch) {
    return { type: 'reminder', cleaned: text.slice(reminderMatch[0].length).trim() }
  }

  // Idea patterns — strip prefix
  const ideaMatch = text.match(/^(?:idea\s*[:\-]\s*|идея\s*[:\-]\s*)/i)
  if (ideaMatch) {
    return { type: 'idea', cleaned: text.slice(ideaMatch[0].length).trim() }
  }

  // Check for call/звонок — treat as reminder
  if (/\b(call|позвонить|звонок)\b/i.test(lower)) {
    return { type: 'reminder', cleaned: text }
  }

  return { type: 'task', cleaned: text }
}

// ── Main parser ───────────────────────────────────────────────────────────────

export function parseQuickInput(text: string): ParsedTask {
  const trimmed = text.trim()
  if (!trimmed) {
    return { title: '', taskType: 'task', dueDate: null, dueTime: null, confidence: 0 }
  }

  // Extract in order: type, date, time
  const { type, cleaned: afterType } = extractType(trimmed)
  const { date, cleaned: afterDate } = extractDate(afterType)
  const { time, cleaned: afterTime } = extractTime(afterDate)

  // Clean up residual prepositions and whitespace
  let title = afterTime
    .replace(/^\s*[-–—:,]\s*/, '')    // leading punctuation
    .replace(/\s*[-–—:,]\s*$/, '')    // trailing punctuation
    .replace(/\s{2,}/g, ' ')          // double spaces
    .trim()

  // Capitalize first letter
  if (title.length > 0) {
    title = title[0].toUpperCase() + title.slice(1)
  }

  // Confidence scoring
  let confidence = 0.2 // base: has some text
  if (type !== 'task') confidence += 0.3
  if (date) confidence += 0.3
  if (time) confidence += 0.2

  return { title, taskType: type, dueDate: date, dueTime: time, confidence }
}
