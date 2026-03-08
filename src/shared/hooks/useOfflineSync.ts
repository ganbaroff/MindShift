/**
 * useOfflineSync
 *
 * Sets up window `online` and `document visibilitychange` listeners
 * to flush the offline task queue when connectivity is restored.
 *
 * Mount once at the App level (after auth).
 */

import { useEffect } from 'react'
import { toast } from 'sonner'
import { useStore } from '@/store'
import { supabase } from '@/shared/lib/supabase'
import { flushQueue, setOnItemsDropped, migrateLegacyQueue } from '@/shared/lib/offlineQueue'
import { logError } from '@/shared/lib/logger'

export function useOfflineSync(): void {
  const userId = useStore(s => s.userId)

  useEffect(() => {
    if (!userId) return

    // Migrate any legacy non-namespaced queue items
    migrateLegacyQueue(userId)

    // Wire up drop notification — never lose data silently (ADHD users can't afford lost tasks)
    setOnItemsDropped((count) => {
      toast.error(
        `${count} offline change${count > 1 ? 's' : ''} could not be saved after multiple retries.`,
        { duration: 8000 }
      )
    })

    async function flush() {
      try {
        await flushQueue(supabase, userId!)
      } catch (err) {
        logError('useOfflineSync.flush', err)
      }
    }

    function handleOnline() {
      void flush()
    }

    function handleVisibility() {
      if (document.visibilityState === 'visible') {
        void flush()
      }
    }

    window.addEventListener('online', handleOnline)
    document.addEventListener('visibilitychange', handleVisibility)

    // Also flush on mount — catches items from previous offline sessions
    void flush()

    return () => {
      window.removeEventListener('online', handleOnline)
      document.removeEventListener('visibilitychange', handleVisibility)
      setOnItemsDropped(null)
    }
  }, [userId])
}
