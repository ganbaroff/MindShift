/**
 * useOfflineSync
 *
 * Sets up window `online` and `document visibilitychange` listeners
 * to flush the offline task queue when connectivity is restored.
 *
 * Mount once at the App level (after auth).
 */

import { useEffect } from 'react'
import { useStore } from '@/store'
import { supabase } from '@/shared/lib/supabase'
import { flushQueue } from '@/shared/lib/offlineQueue'
import { logError } from '@/shared/lib/logger'

export function useOfflineSync(): void {
  const userId = useStore(s => s.userId)

  useEffect(() => {
    if (!userId) return

    async function flush() {
      try {
        await flushQueue(supabase)
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
    }
  }, [userId])
}
