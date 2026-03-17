/**
 * useUITone — React hook for accessing tone-aware copy.
 *
 * Returns the current ToneCopy + density based on the store's uiTone field.
 * Components use this instead of hardcoding strings.
 */

import { useMemo } from 'react'
import { useStore } from '@/store'
import { getToneCopy, getDensity } from '@/shared/lib/uiTone'
import type { ToneCopy, UIDensity } from '@/shared/lib/uiTone'

export function useUITone(): { copy: ToneCopy; density: UIDensity } {
  const uiTone = useStore(s => s.uiTone)
  return useMemo(() => ({
    copy: getToneCopy(uiTone),
    density: getDensity(uiTone),
  }), [uiTone])
}
