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

    // Fallback: check localStorage backup (survives SW cache cleanup race conditions)
    const backupKey = `${name}_backup`
    const backup = localStorage.getItem(backupKey)
    if (backup !== null) {
      // Restore from backup into IDB
      set(name, backup).catch(() => {})
      return backup
    }

    return null
  },

  setItem: async (name: string, value: string): Promise<void> => {
    // Write localStorage backup first — fast synchronous write survives IDB failures
    try { localStorage.setItem(`${name}_backup`, value) } catch { /* quota exceeded — non-fatal */ }
    // Ensure primary localStorage key is cleaned up (migration artifact)
    if (localStorage.getItem(name) !== null) {
      localStorage.removeItem(name)
    }
    // Write to IDB — if quota exceeded or unavailable, backup above is still intact
    try {
      await set(name, value)
    } catch {
      // IDB write failed (quota, private mode, storage error) — backup already written above
    }
  },

  removeItem: async (name: string): Promise<void> => {
    await del(name)
    localStorage.removeItem(name)
    localStorage.removeItem(`${name}_backup`)
  },
}

// ── Cross-tab sync ─────────────────────────────────────────────────────────
// When tab A saves state, the _backup key in localStorage changes.
// Tab B detects this via the `storage` event and merges state instead of
// reloading — a full reload would interrupt in-progress focus sessions,
// abort API calls, and reset scroll position. (BUG-D4 fix)
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e: StorageEvent) => {
    if (e.key?.endsWith('_backup') && e.newValue) {
      try {
        // Dynamically import store to avoid circular dependency at module init
        import('@/store').then(({ useStore }) => {
          const parsed = JSON.parse(e.newValue!) as { state?: Record<string, unknown> }
          if (parsed?.state) useStore.setState(parsed.state)
        }).catch(() => { /* non-critical — tab will sync on next interaction */ })
      } catch { /* non-critical */ }
    }
  })
}
