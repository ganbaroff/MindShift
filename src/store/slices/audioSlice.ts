import { type StateCreator } from 'zustand'
import type { AppStore } from '../types'
import type { AudioPreset } from '@/types'
import { ACHIEVEMENT_DEFINITIONS } from '@/types'
import { getToneCopy } from '@/shared/lib/uiTone'
import { notifyAchievement } from '@/shared/lib/notify'

export interface AudioSlice {
  activePreset: AudioPreset | null
  audioVolume: number          // 0-1 (mapped to 0-70 dBA)
  audioPlaying: boolean
  focusAnchor: AudioPreset | null
  transitionBufferActive: boolean
  setPreset: (preset: AudioPreset | null) => void
  setVolume: (volume: number) => void
  setPlaying: (playing: boolean) => void
  setFocusAnchor: (preset: AudioPreset | null) => void
  setTransitionBuffer: (active: boolean) => void
}

export const createAudioSlice: StateCreator<
  AppStore,
  [['zustand/subscribeWithSelector', never], ['zustand/persist', unknown]],
  [],
  AudioSlice
> = (set, get) => ({
  activePreset: null,
  audioVolume: 0.55,
  audioPlaying: false,
  focusAnchor: null,
  transitionBufferActive: false,

  setPreset: (preset) => set({ activePreset: preset }),
  setVolume: (volume) => set({ audioVolume: Math.min(1.0, Math.max(0, volume)) }),
  setPlaying: (playing) => set({ audioPlaying: playing }),
  setFocusAnchor: (preset) => {
    set({ focusAnchor: preset })
    // Achievement: sonic_anchor — set a focus anchor sound
    if (preset !== null) {
      const s2 = get()
      if (!s2.hasAchievement('sonic_anchor')) {
        s2.unlockAchievement('sonic_anchor')
        const toneCopy = getToneCopy(s2.uiTone)
        const def = ACHIEVEMENT_DEFINITIONS.find(a => a.key === 'sonic_anchor')
        if (def) notifyAchievement(toneCopy.badgeUnlocked(def.name), def.emoji, def.description)
      }
    }
  },
  setTransitionBuffer: (active) => set({ transitionBufferActive: active }),
})
