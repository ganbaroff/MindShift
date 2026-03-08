/**
 * useGridSync — two-tier layout persistence for the bento grid.
 *
 * Architecture (Research #1 recommendation):
 *   Tier 1 — IndexedDB (idb-keyval): non-blocking async write, offline-first.
 *             Loads instantly on every mount, even without auth.
 *   Tier 2 — Supabase (dashboard_config JSONB): authoritative cross-device sync.
 *             Fetched once on auth; updates debounced 500ms after each drag.
 *
 * Priority on hydration: Supabase > IndexedDB > Zustand defaults
 * Write order: always IDB first (instant), then Supabase if authed.
 *
 * Usage: call once in HomeScreen. No props needed.
 */

import { useEffect, useRef } from 'react'
import { get, set, createStore } from 'idb-keyval'
import { useStore } from '@/store'
import { supabase } from '@/shared/lib/supabase'
import type { WidgetConfig } from '@/types'

// Isolated IndexedDB store — doesn't conflict with other app data
const idbStore = createStore('mindshift-grid-v1', 'widgets')
const IDB_KEY   = 'grid-layout'
const DEBOUNCE  = 500  // ms — matches Supabase recommended debounce

export function useGridSync() {
  const { gridWidgets, setGridWidgets, userId } = useStore()

  const hydratedRef   = useRef(false)
  const prevJsonRef   = useRef<string>('')
  const syncTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Hydration: IndexedDB → Supabase (on mount + auth changes) ──────────────
  useEffect(() => {
    // Re-run when userId changes (sign-in / sign-out)
    hydratedRef.current = false

    async function hydrate() {
      if (hydratedRef.current) return
      hydratedRef.current = true

      // 1. IndexedDB first — available immediately, even offline
      const localWidgets = await get<WidgetConfig[]>(IDB_KEY, idbStore)
      if (localWidgets?.length) {
        setGridWidgets(localWidgets)
        prevJsonRef.current = JSON.stringify(localWidgets)
      }

      // 2. Supabase — authoritative, overwrites local if available
      if (!userId) return

      // Use explicit generic to work around Supabase JSONB column type inference
      type DashboardRow = { dashboard_config: { widgets?: WidgetConfig[] } | null }
      const { data, error } = await supabase
        .from('users')
        .select<'dashboard_config', DashboardRow>('dashboard_config')
        .eq('id', userId)
        .single()

      if (error || !data?.dashboard_config) return

      const serverWidgets = data.dashboard_config.widgets
      if (!Array.isArray(serverWidgets) || serverWidgets.length === 0) return

      // Server wins: update both store and IDB
      setGridWidgets(serverWidgets)
      prevJsonRef.current = JSON.stringify(serverWidgets)
      await set(IDB_KEY, serverWidgets, idbStore)
    }

    void hydrate()
  }, [userId, setGridWidgets])

  // ── Persistence: store → IDB + Supabase (debounced, change-detected) ────────
  useEffect(() => {
    if (!hydratedRef.current) return   // don't persist during hydration

    const json = JSON.stringify(gridWidgets)
    if (json === prevJsonRef.current) return   // no change
    prevJsonRef.current = json

    if (syncTimerRef.current) clearTimeout(syncTimerRef.current)

    syncTimerRef.current = setTimeout(async () => {
      // Tier 1: IndexedDB — always, no auth required
      await set(IDB_KEY, gridWidgets, idbStore)

      // Tier 2: Supabase — only if authenticated
      if (!userId) return

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- JSONB update; dashboard_config is in UserUpdate but TS infers narrowed type
      await (supabase.from('users') as any)
        .update({ dashboard_config: { widgets: gridWidgets } })
        .eq('id', userId)
        // Fire-and-forget: errors are non-critical (IDB is the fallback)
    }, DEBOUNCE)

    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current)
    }
  }, [gridWidgets, userId])
}
