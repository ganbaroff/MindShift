/**
 * idbStorage — Zustand StateStorage adapter backed by idb-keyval.
 *
 * Why: localStorage is synchronous and capped at 5MB.
 * With 100+ tasks + sessions + achievements, we approach that limit.
 * IndexedDB is async and has no practical size limit.
 *
 * Migration strategy (transparent):
 *   1. On first getItem: check idb first, fall back to localStorage.
 *   2. On setItem: write to idb, delete from localStorage (one-way migration).
 *   3. After first write, localStorage is no longer used.
 *
 * Research #2 (PWA Architecture): "Migrating from synchronous localStorage to
 * asynchronous idb-keyval with Zustand's partialize configuration prevents
 * catastrophic main-thread blocking when application state exceeds 5MB."
 */

import { get, set, del } from 'idb-keyval'
import type { StateStorage } from 'zustand/middleware'

export const idbStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    // Check localStorage FIRST (synchronous, fastest path).
    // This covers: (a) pre-migration users, (b) E2E test seeding.
    // If found, migrate to IDB in the background and return immediately.
    const lsVal = localStorage.getItem(name)
    if (lsVal !== null) {
      // Fire-and-forget migration to IDB
      set(name, lsVal).then(() => localStorage.removeItem(name)).catch(() => {})
      return lsVal
    }

    // Post-migration: read from IndexedDB
    const idbVal = await get<string>(name)
    if (idbVal !== undefined) return idbVal

    return null
  },

  setItem: async (name: string, value: string): Promise<void> => {
    await set(name, value)
    // Ensure localStorage is cleaned up if it still exists (race condition safety)
    if (localStorage.getItem(name) !== null) {
      localStorage.removeItem(name)
    }
  },

  removeItem: async (name: string): Promise<void> => {
    await del(name)
    localStorage.removeItem(name)
  },
}
