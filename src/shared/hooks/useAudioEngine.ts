/**
 * useAudioEngine
 *
 * Thin orchestrator — delegates to extracted modules:
 *   audioGain.ts       — logarithmic volume mapping + crossfade curves
 *   audioWorklet.ts    — AudioWorklet singleton loader
 *   audioBuffers.ts    — noise + binaural beat buffer generators
 *   sonicAnchor.ts     — C Maj9 Pavlovian focus cue
 *
 * Audio graph per preset:
 *   Default:    source → fade → HPF → master → out
 *   Pink/Nature: source → fade → pinkLpf(285Hz) → HPF → master → out
 *   Lo-fi:      source → fade → tapeSat → bassShelf → lofiLpf(3kHz) → HPF → master → out
 *   Gamma/60:   source → fade → HPF → master → out  (stereo preserved)
 */

import { useRef, useCallback, useEffect } from 'react'
import { useStore } from '@/store'
import { HPF_CUTOFF_HZ, PINK_LPF_CUTOFF_HZ, AUDIO_FADE_DURATION_S } from '@/shared/lib/constants'
import { volumeToGain, FADE_IN_CURVE, FADE_OUT_CURVE } from '@/shared/lib/audioGain'
import { ensureWorklet } from '@/shared/lib/audioWorklet'
import { createNoiseBuffer, createGammaBuffer, createGamma60Buffer } from '@/shared/lib/audioBuffers'
import { playSonicAnchor } from '@/shared/lib/sonicAnchor'
import type { AudioPreset } from '@/types'

export function useAudioEngine() {
  const { audioVolume, setPlaying, audioPlaying } = useStore()

  const ctxRef       = useRef<AudioContext | null>(null)
  const sourceRef    = useRef<AudioBufferSourceNode | AudioWorkletNode | null>(null)
  const fadeRef      = useRef<GainNode | null>(null)
  const masterRef    = useRef<GainNode | null>(null)
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { ctxRef.current?.close() }, [])

  const getCtx = (): AudioContext => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new AudioContext()
    }
    if (ctxRef.current.state === 'suspended') void ctxRef.current.resume()
    return ctxRef.current
  }

  const stop = useCallback((immediate = false) => {
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current)

    const source = sourceRef.current
    const fade   = fadeRef.current
    const ctx    = ctxRef.current

    if (immediate || !fade || !ctx) {
      if (source) {
        try { (source as AudioBufferSourceNode).stop?.() }  catch { /* already stopped */ }
        try { (source as AudioWorkletNode).disconnect?.() } catch { /* already disconnected */ }
      }
      sourceRef.current = null
    } else {
      const now = ctx.currentTime
      fade.gain.cancelScheduledValues(now)
      fade.gain.setValueAtTime(Math.max(fade.gain.value, 0.0001), now)
      fade.gain.setValueCurveAtTime(FADE_OUT_CURVE, now, AUDIO_FADE_DURATION_S)

      stopTimerRef.current = setTimeout(() => {
        const s = sourceRef.current
        if (s) {
          try { (s as AudioBufferSourceNode).stop?.() }  catch { /* ok */ }
          try { (s as AudioWorkletNode).disconnect?.() } catch { /* ok */ }
        }
        sourceRef.current = null
      }, AUDIO_FADE_DURATION_S * 1000 + 150)
    }

    setPlaying(false)
  }, [setPlaying])

  const play = useCallback(async (preset: AudioPreset) => {
    stop(true)
    if (stopTimerRef.current) { clearTimeout(stopTimerRef.current); stopTimerRef.current = null }

    const ctx = getCtx()
    if (ctx.state === 'suspended') {
      try { await ctx.resume() } catch { /* no audio */ }
    }

    const now  = ctx.currentTime
    const fade = ctx.createGain()
    fade.gain.setValueAtTime(0.0001, now)
    fadeRef.current = fade

    const hpf = ctx.createBiquadFilter()
    hpf.type = 'highpass'
    hpf.frequency.value = HPF_CUTOFF_HZ
    hpf.Q.value = 0.5

    const pinkLpf = (preset === 'pink' || preset === 'nature') ? ctx.createBiquadFilter() : null
    if (pinkLpf) { pinkLpf.type = 'lowpass'; pinkLpf.frequency.value = PINK_LPF_CUTOFF_HZ; pinkLpf.Q.value = 0.7 }

    let tapeSat: WaveShaperNode | null = null
    let bassShelf: BiquadFilterNode | null = null
    const lofiLpf = preset === 'lofi' ? ctx.createBiquadFilter() : null

    if (preset === 'lofi') {
      tapeSat = ctx.createWaveShaper()
      const curve = new Float32Array(256)
      const amt   = 1.5
      for (let i = 0; i < 256; i++) {
        const x = (2 * i / 255) - 1
        curve[i] = Math.tanh(x * amt) / Math.tanh(amt)
      }
      tapeSat.curve = curve
      tapeSat.oversample = '2x'

      bassShelf = ctx.createBiquadFilter()
      bassShelf.type = 'peaking'
      bassShelf.frequency.value = 200
      bassShelf.Q.value = 1.5
      bassShelf.gain.value = 4

      lofiLpf!.type = 'lowpass'
      lofiLpf!.frequency.value = 3000
      lofiLpf!.Q.value = 0.7
    }

    const master = ctx.createGain()
    master.gain.value = volumeToGain(audioVolume)
    masterRef.current = master

    let source: AudioBufferSourceNode | AudioWorkletNode

    if (preset === 'brown') {
      try {
        await ensureWorklet(ctx)
        source = new AudioWorkletNode(ctx, 'brown-noise')
      } catch {
        const node = ctx.createBufferSource()
        node.buffer = createNoiseBuffer(ctx, 'brown')
        node.loop = true; node.start()
        source = node
      }
    } else if (preset === 'gamma') {
      const node = ctx.createBufferSource()
      node.buffer = createGammaBuffer(ctx)
      node.loop = true; node.start()
      source = node
    } else if (preset === 'gamma60') {
      const node = ctx.createBufferSource()
      node.buffer = createGamma60Buffer(ctx)
      node.loop = true; node.start()
      source = node
    } else {
      const node = ctx.createBufferSource()
      node.buffer = createNoiseBuffer(ctx, preset)
      node.loop = true; node.start()
      source = node
    }

    sourceRef.current = source

    // Connect graph
    source.connect(fade)
    if (tapeSat && bassShelf && lofiLpf) {
      fade.connect(tapeSat); tapeSat.connect(bassShelf)
      bassShelf.connect(lofiLpf); lofiLpf.connect(hpf)
    } else if (pinkLpf) {
      fade.connect(pinkLpf); pinkLpf.connect(hpf)
    } else {
      fade.connect(hpf)
    }
    hpf.connect(master)
    master.connect(ctx.destination)

    fade.gain.setValueCurveAtTime(FADE_IN_CURVE, now, AUDIO_FADE_DURATION_S)
    setPlaying(true)
  }, [audioVolume, setPlaying, stop])

  const setVolume = useCallback((volume: number) => {
    if (!masterRef.current || !ctxRef.current) return
    masterRef.current.gain.setTargetAtTime(volumeToGain(volume), ctxRef.current.currentTime, 0.1)
  }, [])

  const adaptToPhase = useCallback((phase: 'struggle' | 'release' | 'flow') => {
    if (!masterRef.current || !ctxRef.current) return
    const mult = phase === 'struggle' ? 1.0 : phase === 'release' ? 0.80 : 0.60
    masterRef.current.gain.setTargetAtTime(
      volumeToGain(audioVolume) * mult,
      ctxRef.current.currentTime,
      1.5,
    )
  }, [audioVolume])

  const toggle = useCallback((preset: AudioPreset) => {
    if (audioPlaying) stop()
    else void play(preset)
  }, [audioPlaying, play, stop])

  const playAnchor = useCallback(() => {
    playSonicAnchor(getCtx())
  }, [])

  return { play, stop, toggle, setVolume, playAnchor, adaptToPhase, isPlaying: audioPlaying }
}
