import { useRef, useCallback, useEffect } from 'react'
import { useStore } from '@/store'
import { AUDIO_FADE_MS, AUDIO_HARD_LIMIT, HPF_CUTOFF_HZ } from '@/shared/lib/constants'
import type { AudioPreset } from '@/types'

// ── Noise buffer generators ───────────────────────────────────────────────────

function fillBrownNoise(data: Float32Array): void {
  // Brown/red noise: integrate white noise → 1/f² spectrum
  let lastOut = 0
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1
    lastOut = (lastOut + 0.02 * white) / 1.02
    data[i] = lastOut * 3.5  // compensate for volume loss
  }
}

function fillPinkNoise(data: Float32Array): void {
  // Voss-McCartney 6-generator pink noise (1/f spectrum)
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1
    b0 = 0.99886 * b0 + white * 0.0555179
    b1 = 0.99332 * b1 + white * 0.0750759
    b2 = 0.96900 * b2 + white * 0.1538520
    b3 = 0.86650 * b3 + white * 0.3104856
    b4 = 0.55000 * b4 + white * 0.5329522
    b5 = -0.7616 * b5 - white * 0.0168980
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11
    b6 = white * 0.115926
  }
}

function fillNatureNoise(data: Float32Array): void {
  // Nature approximation: soft pink noise with amplitude modulation
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1
    b0 = 0.99886 * b0 + white * 0.0555179
    b1 = 0.99332 * b1 + white * 0.0750759
    b2 = 0.96900 * b2 + white * 0.1538520
    b3 = 0.86650 * b3 + white * 0.3104856
    b4 = 0.55000 * b4 + white * 0.5329522
    b5 = -0.7616 * b5 - white * 0.0168980
    // Slightly quieter + amplitude variation for organic feel
    const modulation = 0.8 + 0.2 * Math.sin(i / 44100 * 0.1)
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.09 * modulation
    b6 = white * 0.115926
  }
}

function fillLofiNoise(data: Float32Array): void {
  // Lo-fi: very quiet white noise (the lo-fi music would come from a real track)
  // Used as subtle masking layer
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.04
  }
}

function createNoiseBuffer(ctx: AudioContext, preset: AudioPreset): AudioBuffer {
  const bufferSize = ctx.sampleRate * 3  // 3s loop
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)

  switch (preset) {
    case 'brown':  fillBrownNoise(data);  break
    case 'pink':   fillPinkNoise(data);   break
    case 'nature': fillNatureNoise(data); break
    case 'lofi':   fillLofiNoise(data);   break
  }

  return buffer
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAudioEngine() {
  const { audioVolume, setPlaying, audioPlaying } = useStore()

  const ctxRef    = useRef<AudioContext | null>(null)
  const sourceRef = useRef<AudioBufferSourceNode | null>(null)
  const fadeRef   = useRef<GainNode | null>(null)
  const masterRef = useRef<GainNode | null>(null)
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      ctxRef.current?.close()
    }
  }, [])

  const getCtx = (): AudioContext => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new AudioContext()
    }
    if (ctxRef.current.state === 'suspended') {
      void ctxRef.current.resume()
    }
    return ctxRef.current
  }

  const stop = useCallback((immediate = false) => {
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current)
    if (!sourceRef.current || !fadeRef.current || !ctxRef.current) return

    const ctx = ctxRef.current
    const fade = fadeRef.current
    const source = sourceRef.current

    if (immediate) {
      try { source.stop() } catch { /* already stopped */ }
      sourceRef.current = null
    } else {
      const now = ctx.currentTime
      fade.gain.cancelScheduledValues(now)
      fade.gain.setValueAtTime(fade.gain.value || 0.0001, now)
      fade.gain.exponentialRampToValueAtTime(0.0001, now + AUDIO_FADE_MS / 1000)

      stopTimerRef.current = setTimeout(() => {
        try { source.stop() } catch { /* already stopped */ }
        sourceRef.current = null
      }, AUDIO_FADE_MS + 100)
    }

    setPlaying(false)
  }, [setPlaying])

  const play = useCallback((preset: AudioPreset) => {
    // Stop any existing playback
    stop(true)
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current)
      stopTimerRef.current = null
    }

    const ctx = getCtx()

    // Generate noise buffer
    const buffer = createNoiseBuffer(ctx, preset)

    // Source node
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.loop = true
    sourceRef.current = source

    // Per-source fade gain (for fade in/out)
    const fade = ctx.createGain()
    fade.gain.setValueAtTime(0.0001, ctx.currentTime)
    fadeRef.current = fade

    // HPF — protect ears from sub-bass rumble
    const hpf = ctx.createBiquadFilter()
    hpf.type = 'highpass'
    hpf.frequency.value = HPF_CUTOFF_HZ
    hpf.Q.value = 0.5

    // Master gain + hard limiter
    const master = ctx.createGain()
    master.gain.value = Math.min(audioVolume, AUDIO_HARD_LIMIT)
    masterRef.current = master

    // Graph: source → fade → HPF → master → destination
    source.connect(fade)
    fade.connect(hpf)
    hpf.connect(master)
    master.connect(ctx.destination)

    source.start()

    // Exponential fade in
    const fadeInEnd = ctx.currentTime + AUDIO_FADE_MS / 1000
    fade.gain.exponentialRampToValueAtTime(1.0, fadeInEnd)

    setPlaying(true)
  }, [audioVolume, setPlaying, stop])

  const setVolume = useCallback((volume: number) => {
    if (!masterRef.current || !ctxRef.current) return
    const safeVolume = Math.min(Math.max(volume, 0.0001), AUDIO_HARD_LIMIT)
    masterRef.current.gain.setTargetAtTime(safeVolume, ctxRef.current.currentTime, 0.1)
  }, [])

  const toggle = useCallback((preset: AudioPreset) => {
    if (audioPlaying) {
      stop()
    } else {
      play(preset)
    }
  }, [audioPlaying, play, stop])

  return { play, stop, toggle, setVolume, isPlaying: audioPlaying }
}
