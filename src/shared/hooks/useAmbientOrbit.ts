/**
 * useAmbientOrbit — S-2 body-doubling signal
 *
 * Queries focus_sessions started in the last 30 min as a proxy
 * for how many people are currently focusing. Refreshes every 5 min.
 *
 * Extracted from FocusScreen.tsx.
 */

import { useState, useEffect } from 'react'
import { supabase } from '@/shared/lib/supabase'

export function useAmbientOrbit(active: boolean): number | null {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    if (!active) { setCount(null); return }

    let cancelled = false
    const fetch = async () => {
      const since = new Date(Date.now() - 30 * 60_000).toISOString()
      const { count: n } = await supabase
        .from('focus_sessions')
        .select('id', { count: 'exact', head: true })
        .gte('started_at', since)
      if (!cancelled && n !== null) setCount(Math.max(1, n))
    }
    void fetch()
    const id = setInterval(() => void fetch(), 5 * 60_000)
    return () => { cancelled = true; clearInterval(id) }
  }, [active])

  return count
}
