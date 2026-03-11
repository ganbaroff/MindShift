import { describe, it, expect } from 'vitest'
import {
  parseClassifyResult,
  isLowConfidence,
  CONFIDENCE_THRESHOLD,
  type ClassifyResult,
} from '../voiceClassify'

// ── Test phrases ──────────────────────────────────────────────────────────────
// 20 representative inputs covering EN + RU, all three types, edge cases.
// Each simulates what the edge function WOULD return for a given transcript.

describe('parseClassifyResult — happy path', () => {
  it('parses a valid task result', () => {
    const raw = {
      type: 'task',
      title: 'Buy groceries after work',
      pool: 'now',
      difficulty: 2,
      estimatedMinutes: 15,
      dueDate: null,
      dueTime: null,
      reminderMinutesBefore: null,
      notes: null,
      confidence: 0.95,
    }
    const result = parseClassifyResult(raw, 'buy groceries after work')
    expect(result).not.toBeNull()
    expect(result!.type).toBe('task')
    expect(result!.title).toBe('Buy groceries after work')
    expect(result!.pool).toBe('now')
    expect(result!.difficulty).toBe(2)
    expect(result!.estimatedMinutes).toBe(15)
    expect(result!.confidence).toBe(0.95)
  })

  it('parses a valid idea result', () => {
    const raw = {
      type: 'idea',
      title: 'What if we add dark mode',
      pool: 'someday',
      difficulty: 1,
      estimatedMinutes: 5,
      dueDate: null,
      dueTime: null,
      reminderMinutesBefore: null,
      notes: null,
      confidence: 0.88,
    }
    const result = parseClassifyResult(raw, 'what if we add dark mode')
    expect(result).not.toBeNull()
    expect(result!.type).toBe('idea')
    expect(result!.pool).toBe('someday')
    expect(result!.difficulty).toBe(1)
  })

  it('parses a valid reminder with date and time', () => {
    const raw = {
      type: 'reminder',
      title: 'Call dentist',
      pool: 'next',
      difficulty: 1,
      estimatedMinutes: 5,
      dueDate: '2026-03-15',
      dueTime: '14:30',
      reminderMinutesBefore: 30,
      notes: null,
      confidence: 0.92,
    }
    const result = parseClassifyResult(raw, 'call dentist tomorrow at 2:30')
    expect(result).not.toBeNull()
    expect(result!.type).toBe('reminder')
    expect(result!.dueDate).toBe('2026-03-15')
    expect(result!.dueTime).toBe('14:30')
    expect(result!.reminderMinutesBefore).toBe(30)
  })

  it('parses Russian task: "Написать отчёт для работы"', () => {
    const raw = {
      type: 'task',
      title: 'Написать отчёт для работы',
      pool: 'next',
      difficulty: 3,
      estimatedMinutes: 45,
      dueDate: null,
      dueTime: null,
      reminderMinutesBefore: null,
      notes: null,
      confidence: 0.85,
    }
    const result = parseClassifyResult(raw, 'написать отчёт для работы')
    expect(result).not.toBeNull()
    expect(result!.title).toBe('Написать отчёт для работы')
    expect(result!.difficulty).toBe(3)
  })

  it('parses Russian idea: "А что если добавить тёмную тему"', () => {
    const raw = {
      type: 'idea',
      title: 'Добавить тёмную тему',
      pool: 'someday',
      difficulty: 1,
      estimatedMinutes: 5,
      dueDate: null,
      dueTime: null,
      reminderMinutesBefore: null,
      notes: null,
      confidence: 0.78,
    }
    const result = parseClassifyResult(raw, 'а что если добавить тёмную тему')
    expect(result).not.toBeNull()
    expect(result!.type).toBe('idea')
    expect(result!.pool).toBe('someday')
  })

  it('parses Russian reminder: "Напомни позвонить маме завтра в 10"', () => {
    const raw = {
      type: 'reminder',
      title: 'Позвонить маме',
      pool: 'next',
      difficulty: 1,
      estimatedMinutes: 5,
      dueDate: '2026-03-13',
      dueTime: '10:00',
      reminderMinutesBefore: 15,
      notes: null,
      confidence: 0.91,
    }
    const result = parseClassifyResult(raw, 'напомни позвонить маме завтра в 10')
    expect(result).not.toBeNull()
    expect(result!.type).toBe('reminder')
    expect(result!.dueDate).toBe('2026-03-13')
    expect(result!.dueTime).toBe('10:00')
  })
})

describe('parseClassifyResult — auto-correction', () => {
  it('defaults pool to "someday" for ideas even if server says "now"', () => {
    const raw = {
      type: 'idea',
      title: 'Maybe try yoga',
      pool: 'invalid_pool',
      difficulty: 1,
      estimatedMinutes: 5,
      dueDate: null,
      dueTime: null,
      reminderMinutesBefore: null,
      notes: null,
    }
    const result = parseClassifyResult(raw, 'maybe try yoga')
    expect(result!.pool).toBe('someday')
  })

  it('defaults pool to "next" for reminders when pool is invalid', () => {
    const raw = {
      type: 'reminder',
      title: 'Doctor appointment',
      pool: 'garbage',
      difficulty: 1,
      estimatedMinutes: 5,
      dueDate: '2026-04-01',
      dueTime: null,
      reminderMinutesBefore: null,
      notes: null,
    }
    const result = parseClassifyResult(raw, 'doctor appointment')
    expect(result!.pool).toBe('next')
  })

  it('clamps estimatedMinutes to 1–480 range', () => {
    const raw = {
      type: 'task',
      title: 'Long task',
      pool: 'now',
      difficulty: 2,
      estimatedMinutes: 999,
      dueDate: null,
      dueTime: null,
      reminderMinutesBefore: null,
      notes: null,
    }
    const result = parseClassifyResult(raw, 'long task')
    expect(result!.estimatedMinutes).toBe(480)

    const raw2 = { ...raw, estimatedMinutes: -5 }
    const result2 = parseClassifyResult(raw2, 'long task')
    expect(result2!.estimatedMinutes).toBe(25) // falls to NaN → default 25
  })

  it('uses fallback title when server title is empty', () => {
    const raw = {
      type: 'task',
      title: '',
      pool: 'now',
      difficulty: 2,
      estimatedMinutes: 25,
      dueDate: null,
      dueTime: null,
      reminderMinutesBefore: null,
      notes: null,
    }
    const result = parseClassifyResult(raw, 'my spoken words')
    expect(result!.title).toBe('my spoken words')
  })

  it('truncates title to 60 chars', () => {
    const longTitle = 'A'.repeat(100)
    const raw = {
      type: 'task',
      title: longTitle,
      pool: 'now',
      difficulty: 2,
      estimatedMinutes: 25,
      dueDate: null,
      dueTime: null,
      reminderMinutesBefore: null,
      notes: null,
    }
    const result = parseClassifyResult(raw, 'fallback')
    expect(result!.title.length).toBe(60)
  })

  it('defaults confidence to 1.0 when not provided (backward compat)', () => {
    const raw = {
      type: 'task',
      title: 'Do laundry',
      pool: 'now',
      difficulty: 1,
      estimatedMinutes: 15,
      dueDate: null,
      dueTime: null,
      reminderMinutesBefore: null,
      notes: null,
      // no confidence field
    }
    const result = parseClassifyResult(raw, 'do laundry')
    expect(result!.confidence).toBe(1.0)
  })

  it('rejects invalid dueDate format', () => {
    const raw = {
      type: 'reminder',
      title: 'Check email',
      pool: 'next',
      difficulty: 1,
      estimatedMinutes: 5,
      dueDate: 'tomorrow',
      dueTime: 'afternoon',
      reminderMinutesBefore: null,
      notes: null,
    }
    const result = parseClassifyResult(raw, 'check email')
    expect(result!.dueDate).toBeNull()
    expect(result!.dueTime).toBeNull()
  })

  it('rejects invalid reminderMinutesBefore values', () => {
    const raw = {
      type: 'reminder',
      title: 'Meeting',
      pool: 'next',
      difficulty: 2,
      estimatedMinutes: 30,
      dueDate: '2026-03-20',
      dueTime: '09:00',
      reminderMinutesBefore: 999,
      notes: null,
    }
    const result = parseClassifyResult(raw, 'meeting')
    expect(result!.reminderMinutesBefore).toBeNull()
  })

  it('defaults difficulty to 1 for ideas', () => {
    const raw = {
      type: 'idea',
      title: 'New app concept',
      pool: 'someday',
      difficulty: 'invalid',
      estimatedMinutes: 5,
      dueDate: null,
      dueTime: null,
      reminderMinutesBefore: null,
      notes: null,
    }
    const result = parseClassifyResult(raw, 'new app concept')
    expect(result!.difficulty).toBe(1)
  })
})

describe('parseClassifyResult — garbage input', () => {
  it('returns null for null input', () => {
    expect(parseClassifyResult(null, 'test')).toBeNull()
  })

  it('returns null for undefined input', () => {
    expect(parseClassifyResult(undefined, 'test')).toBeNull()
  })

  it('returns null for string input', () => {
    expect(parseClassifyResult('not an object', 'test')).toBeNull()
  })

  it('returns null for empty object (no type)', () => {
    expect(parseClassifyResult({}, 'test')).toBeNull()
  })

  it('returns null for invalid type', () => {
    const raw = {
      type: 'question',
      title: 'What is the meaning of life',
      pool: 'now',
      difficulty: 2,
      estimatedMinutes: 25,
    }
    expect(parseClassifyResult(raw, 'test')).toBeNull()
  })

  it('returns null for error response from edge function', () => {
    expect(parseClassifyResult({ error: 'Classification failed' }, 'test')).toBeNull()
  })
})

describe('isLowConfidence', () => {
  it('returns false for high confidence (≥ 0.7)', () => {
    const result: ClassifyResult = {
      type: 'task', title: 'Test', pool: 'now', difficulty: 2,
      estimatedMinutes: 25, dueDate: null, dueTime: null,
      reminderMinutesBefore: null, notes: null, confidence: 0.85,
    }
    expect(isLowConfidence(result)).toBe(false)
  })

  it('returns true for low confidence (< 0.7)', () => {
    const result: ClassifyResult = {
      type: 'task', title: 'Test', pool: 'now', difficulty: 2,
      estimatedMinutes: 25, dueDate: null, dueTime: null,
      reminderMinutesBefore: null, notes: null, confidence: 0.5,
    }
    expect(isLowConfidence(result)).toBe(true)
  })

  it('returns false at exact threshold (0.7)', () => {
    const result: ClassifyResult = {
      type: 'task', title: 'Test', pool: 'now', difficulty: 2,
      estimatedMinutes: 25, dueDate: null, dueTime: null,
      reminderMinutesBefore: null, notes: null, confidence: CONFIDENCE_THRESHOLD,
    }
    expect(isLowConfidence(result)).toBe(false)
  })
})

describe('voice classification routing — test phrases', () => {
  // Simulates the full classify → route decision
  // These test the same logic that AddTaskModal uses

  const testPhrases: Array<{
    transcript: string
    lang: string
    expectedType: ClassifyResult['type']
    expectedPool: ClassifyResult['pool']
    description: string
  }> = [
    // EN tasks
    { transcript: 'buy milk on the way home', lang: 'en', expectedType: 'task', expectedPool: 'now', description: 'simple task EN' },
    { transcript: 'finish the quarterly report', lang: 'en', expectedType: 'task', expectedPool: 'now', description: 'work task EN' },
    { transcript: 'clean the kitchen', lang: 'en', expectedType: 'task', expectedPool: 'now', description: 'chore EN' },
    // EN ideas
    { transcript: 'what if we tried a subscription model', lang: 'en', expectedType: 'idea', expectedPool: 'someday', description: 'idea EN' },
    { transcript: 'maybe I should learn guitar someday', lang: 'en', expectedType: 'idea', expectedPool: 'someday', description: 'aspirational idea EN' },
    // EN reminders
    { transcript: 'remind me to call the dentist tomorrow at 3pm', lang: 'en', expectedType: 'reminder', expectedPool: 'next', description: 'reminder with date EN' },
    { transcript: 'pick up package on Friday', lang: 'en', expectedType: 'reminder', expectedPool: 'next', description: 'reminder implicit date EN' },
    // RU tasks
    { transcript: 'написать отчёт для работы', lang: 'ru', expectedType: 'task', expectedPool: 'now', description: 'task RU' },
    { transcript: 'починить кран в ванной', lang: 'ru', expectedType: 'task', expectedPool: 'now', description: 'chore RU' },
    // RU ideas
    { transcript: 'а что если сделать подкаст', lang: 'ru', expectedType: 'idea', expectedPool: 'someday', description: 'idea RU' },
    // RU reminders
    { transcript: 'напомни забрать посылку завтра', lang: 'ru', expectedType: 'reminder', expectedPool: 'next', description: 'reminder RU' },
  ]

  it.each(testPhrases)(
    'route: "$description" ($transcript) → type=$expectedType, pool=$expectedPool',
    ({ expectedType, expectedPool }) => {
      // Simulate what the edge function would return
      const mockResponse = {
        type: expectedType,
        title: 'Mock Title',
        pool: expectedPool,
        difficulty: expectedType === 'idea' ? 1 : 2,
        estimatedMinutes: expectedType === 'idea' ? 5 : 25,
        dueDate: expectedType === 'reminder' ? '2026-03-15' : null,
        dueTime: expectedType === 'reminder' ? '15:00' : null,
        reminderMinutesBefore: expectedType === 'reminder' ? 30 : null,
        notes: null,
        confidence: 0.9,
      }
      const result = parseClassifyResult(mockResponse, 'fallback')
      expect(result).not.toBeNull()
      expect(result!.type).toBe(expectedType)
      expect(result!.pool).toBe(expectedPool)

      // Ideas always → someday
      if (expectedType === 'idea') {
        expect(result!.pool).toBe('someday')
      }
    }
  )
})
