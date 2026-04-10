/**
 * Vitest global test setup.
 *
 * Runs before every test file. Adds lightweight polyfills for browser APIs
 * that are not available in jsdom or are needed across all test suites.
 */

import { vi, afterEach } from 'vitest'

// -- crypto.randomUUID ---------------------------------------------------------
// jsdom doesn't expose crypto.randomUUID in all versions.
// Use a simple counter-based stub that produces unique deterministic IDs.
let _uuidCounter = 0
Object.defineProperty(globalThis, 'crypto', {
  value: {
    randomUUID: () => `test-uuid-${String(++_uuidCounter).padStart(4, '0')}`,
  },
  configurable: true,
})

// -- navigator.vibrate ---------------------------------------------------------
// jsdom doesn't implement the Vibration API. Stub it so haptic.ts doesn't throw.
Object.defineProperty(navigator, 'vibrate', {
  value: vi.fn(() => true),
  configurable: true,
  writable: true,
})

// -- localStorage reset between tests ------------------------------------------
// Prevent test state leaking through localStorage (offlineQueue, store persist).
afterEach(() => {
  localStorage.clear()
})
