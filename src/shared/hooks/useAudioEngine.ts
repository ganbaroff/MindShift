/**
 * useAudioEngine
 *
 * Audio engine overhaul — March 2025 (ADHD neuroscience research):
 *
 * CHANGES vs previous version:
 * ┌─────────────────────┬──────────────────────────────┬─────────────────────────────────────┐
 * │ Area                │ Before                       │ After                               │
 * ├─────────────────────┼──────────────────────────────┼─────────────────────────────────────┤
 * │ Brown noise source  │ 3s AudioBuffer loop (seams!) │ AudioWorklet leaky integrator       │
 * │ Crossfade           │ exponentialRamp 500ms (dip)  │ Constant power sine/cos 1.5s        │
 * │ Volume mapping      │ Linear gain (UNSAFE 0-0.70)  │ Logarithmic 0.001–0.10 (safe)       │
 * │ Sonic Anchor        │ 396 Hz triangle (pseudosci.) │ C Maj9 chord, 50ms attack, 1.5s rel │
 * │ Lo-fi preset        │ White noise placeholder      │ Pink + LPF 3kHz (vintage warmth)    │
 * │ Buffer length       │ 3 seconds (seams every 3s)   │ 15 seconds (barely perceptible)     │
 * │ Nature modulation   │ Single 0.1 Hz sine wave      │ 3-rate organic swell (0.07/0.17/0.31 Hz) │
 * └─────────────────────┴──────────────────────────────┴─────────────────────────────────────┘
 *
 * Research basis:
 * - Pink noise: g=0.249, p<0.0001 validated for ADHD focus (systematic review)
 * - Brown noise: popular in ADHD community (reduced mind-wandering)
 * - Nature sounds: parasympathetic activation (validated)
 * - Binaural beats/solfeggio (396 Hz): INSUFFICIENT evidence — REMOVED
 * - Optimal SPL: 45–60 dBA; gain 0.001–0.10 maps to this range for typical earbuds
 */

import { useRef, useCallback, useEffect } from 'react'
import { useStore } from '@/store'
import { HPF_CUTOFF_HZ, AUDIO_FADE_DURATION_S } from '@/shared/lib/constants'
import type { AudioPreset } from '@/types'

// ── Volume: logarithmic mapping ───────────────────────────────────────────────

const LOG_GAIN_MIN = 0.001   // 0% volume → ~40 dBA (nearly inaudible)
const LOG_GAIN_MAX = 0.10    // 100% volume → ~70 dBA (safe all-day maximum)

/**
 * Maps normalized 0–1 UI slider value to a logarithmic gain.
 * Perceptually linear: each step feels equal in loudness.
 *   volume=0.00 → gain=0.001 (~silent)
 *   volume=0.47 → gain≈0.009 (default, ~50 dBA)
 *   volume=0.80 → gain≈0.040 (warning threshold)
 *   volume=1.00 → gain=0.100 (hard ceiling, ~70 dBA)
 */
function volumeToGain(volume: number): number {
  const v = Math.max(0, Math.min(1, volume))
  return LOG_GAIN_MIN * Math.pow(LOG_GAIN_MAX / LOG_GAIN_MIN, v)
}

// ── Constant power crossfade curves ──────────────────────────────────────────

const FADE_STEPS = 64

/** Sine curve 0→1: used for fade-in. Prevents "dip" on correlated-noise crossfades. */
const FADE_IN_CURVE = (() => {
  const arr = new Float32Array(FADE_STEPS)
  for (let i = 0; i < FADE_STEPS; i++) {
    arr[i] = Math.sin((i / (FADE_STEPS - 1)) * Math.PI / 2)
  }
  return arr
})()

/** Cosine curve 1→0: used for fade-out. Mirror of fade-in for constant power. */
const FADE_OUT_CURVE = (() => {
  const arr = new Float32Array(FADE_STEPS)
  for (let i = 0; i < FADE_STEPS; i++) {
    arr[i] = Math.cos((i / (FADE_STEPS - 1)) * Math.PI / 2)
  }
  return arr
})()

// ── AudioWorklet (brown noise, seam-free) ─────────────────────────────────────

let workletLoaded = false
let workletLoadPromise: Promise<void> | null = null

async function ensureWorklet(ctx: AudioContext): Promise<void> {
  if (workletLoaded) return
  if (!workletLoadPromise) {
    workletLoadPromise = ctx.audioWorklet
      .addModule('/audio-worklets/brown-noise-processor.js')
      .then(() => { workletLoaded = true })
      .catch(() => {
        workletLoadPromise = null
        throw new Error('AudioWorklet load failed — using buffer fallback')
      })
  }
  return workletLoadPromise
}

// ── Noise buffer generators ───────────────────────────────────────────────────

const BUFFER_SECONDS = 15  // 15s loops: seams 5× less frequent than 3s; imperceptible in practice

function fillPinkNoise(data: Float32Array): void {
  // Voss-McCartney 6-generator: ±0.05 dB accuracy at 1/f spectrum
  // Validated for ADHD: g=0.249, p<0.0001 (systematic review, n=196)
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
  for (let i = 0; i < data.length; i++) {
    const w = Math.random() * 2 - 1
    b0 = 0.99886 * b0 + w * 0.0555179
    b1 = 0.99332 * b1 + w * 0.0750759
    b2 = 0.96900 * b2 + w * 0.1538520
    b3 = 0.86650 * b3 + w * 0.3104856
    b4 = 0.55000 * b4 + w * 0.5329522
    b5 = -0.7616 * b5 - w * 0.0168980
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11
    b6 = w * 0.115926
  }
}

function fillNatureNoise(data: Float32Array, sampleRate: number): void {
  // Organic pink noise + 3-rate amplitude modulation
  // Three overlapping modulation frequencies create organic ebb/swell
  // similar to rain or wind — prevents neural habituation (~25 min for static noise)
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
  for (let i = 0; i < data.length; i++) {
    const w = Math.random() * 2 - 1
    b0 = 0.99886 * b0 + w * 0.0555179
    b1 = 0.99332 * b1 + w * 0.0750759
    b2 = 0.96900 * b2 + w * 0.1538520
    b3 = 0.86650 * b3 + w * 0.3104856
    b4 = 0.55000 * b4 + w * 0.5329522
    b5 = -0.7616 * b5 - w * 0.0168980
    const t = i / sampleRate
    // Superimposed modulations: 14s swell + 6s variation + 3s detail
    const mod = 0.70
      + 0.15 * Math.sin(2 * Math.PI * 0.07 * t)   // 0.07 Hz ~14s period — main swell
      + 0.10 * Math.sin(2 * Math.PI * 0.17 * t)   // 0.17 Hz ~6s — secondary variation
      + 0.05 * Math.sin(2 * Math.PI * 0.31 * t)   // 0.31 Hz ~3s — surface detail
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.09 * mod
    b6 = w * 0.115926
  }
}

function fillLofiNoise(data: Float32Array): void {
  // Pink noise base for lo-fi: LPF at 3 kHz applied in graph (vintage warmth).
  // Rare amplitude spikes (~every 0.27s on average) simulate vinyl crackle texture.
  // (60-90 BPM procedural lo-fi via Tone.js is a future enhancement — see roadmap)
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
  for (let i = 0; i < data.length; i++) {
    const w = Math.random() * 2 - 1
    b0 = 0.99886 * b0 + w * 0.0555179
    b1 = 0.99332 * b1 + w * 0.0750759
    b2 = 0.96900 * b2 + w * 0.1538520
    b3 = 0.86650 * b3 + w * 0.3104856
    b4 = 0.55000 * b4 + w * 0.5329522
    b5 = -0.7616 * b5 - w * 0.0168980
    // Crackle: 1-in-12000 chance ≈ once every ~0.27s at 44.1 kHz
    const crackle = Math.random() < 0.000083 ? Math.random() * 0.18 : 0
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11 + crackle
    b6 = w * 0.115926
  }
}

function fillBrownFallback(data: Float32Array): void {
  // Fallback brown noise buffer — used when AudioWorklet is unavailable (e.g., Safari 15.4-)
  let lastOut = 0
  for (let i = 0; i < data.length; i++) {
    const w = Math.random() * 2 - 1
    lastOut = (lastOut + 0.02 * w) / 1.02
    data[i] = lastOut * 3.5
  }
}

function createNoiseBuffer(ctx: AudioContext, preset: AudioPreset): AudioBuffer {
  const size = ctx.sampleRate * BUFFER_SECONDS
  const buf  = ctx.createBuffer(1, size, ctx.sampleRate)
  const data = buf.getChannelData(0)
  switch (preset) {
    case 'pink':   fillPinkNoise(data);               break
    case 'nature': fillNatureNoise(data, ctx.sampleRate); break
    case 'lofi':   fillLofiNoise(data);               break
    default:       fillBrownFallback(data)  // 'brown' buffer fallback only
  }
  return buf
}

// ── Sonic Anchor: C Major 9th chord ──────────────────────────────────────────

/**
 * Plays a soft Cmaj9 chord (C4–E4–G4–B4–D5) as a Pavlovian focus cue.
 *
 * Replaces the pseudoscientific 396 Hz solfeggio triangle wave.
 * Research: Consistent acoustic cue = conditioned stimulus; 1-2 weeks of daily
 * use → faster attentional engagement (classical conditioning, Pavlov 1927).
 *
 * 50ms attack: avoids click transient
 * 1.5s release: natural piano-like decay
 */
const MAJ9_FREQS  = [261.63, 329.63, 392.00, 493.88, 587.33]  // C4 E4 G4 B4 D5
const MAJ9_LEVELS = [0.50,   0.40,   0.40,   0.30,   0.25  ]  // root loudest, 9th softest

export function playSonicAnchor(ctx: AudioContext): void {
  const now    = ctx.currentTime
  const master = ctx.createGain()
  // 50ms attack → sustain → 1.5s release
  master.gain.setValueAtTime(0.0001, now)
  master.gain.linearRampToValueAtTime(0.06, now + 0.05)
  master.gain.setValueAtTime(0.06,          now + 0.05)
  master.gain.linearRampToValueAtTime(0.0001, now + 1.55)
  master.connect(ctx.destination)

  MAJ9_FREQS.forEach((freq, i) => {
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type            = 'sine'
    osc.frequency.value = freq
    gain.gain.value     = MAJ9_LEVELS[i]
    osc.connect(gain)
    gain.connect(master)
    osc.start(now)
    osc.stop(now + 2.0)   // auto-cleanup after 2s
  })
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAudioEngine() {
  const { audioVolume, setPlaying, audioPlaying } = useStore()

  const ctxRef       = useRef<AudioContext | null>(null)
  const sourceRef    = useRef<AudioBufferSourceNode | AudioWorkletNode | null>(null)
  const fadeRef      = useRef<GainNode | null>(null)
  const masterRef    = useRef<GainNode | null>(null)
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Close AudioContext on unmount
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
      // Hard stop: disconnect immediately
      if (source) {
        try { (source as AudioBufferSourceNode).stop?.() }   catch { /* already stopped */ }
        try { (source as AudioWorkletNode).disconnect?.() }  catch { /* already disconnected */ }
      }
      sourceRef.current = null
    } else {
      // Soft stop: constant power cosine fade-out over AUDIO_FADE_DURATION_S seconds
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
    // Stop any running playback immediately before starting new one
    stop(true)
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current)
      stopTimerRef.current = null
    }

    const ctx = getCtx()
    const now = ctx.currentTime

    // ── Fade gain (constant power fade-in) ──────────────────────────────
    const fade = ctx.createGain()
    fade.gain.setValueAtTime(0.0001, now)
    fadeRef.current = fade

    // ── HPF — mandatory, protects ears from sub-bass rumble ──────────────
    const hpf = ctx.createBiquadFilter()
    hpf.type = 'highpass'
    hpf.frequency.value = HPF_CUTOFF_HZ
    hpf.Q.value = 0.5

    // ── LPF for lo-fi (3 kHz cutoff = vintage warmth) ────────────────────
    const lofiLpf = preset === 'lofi' ? ctx.createBiquadFilter() : null
    if (lofiLpf) {
      lofiLpf.type = 'lowpass'
      lofiLpf.frequency.value = 3000
      lofiLpf.Q.value = 0.7
    }

    // ── Master gain — logarithmic mapping (safe 40–70 dBA range) ─────────
    const master = ctx.createGain()
    master.gain.value = volumeToGain(audioVolume)
    masterRef.current = master

    // ── Source: AudioWorklet for brown (seam-free), buffer for others ─────
    let source: AudioBufferSourceNode | AudioWorkletNode

    if (preset === 'brown') {
      try {
        await ensureWorklet(ctx)
        source = new AudioWorkletNode(ctx, 'brown-noise')
        // AudioWorkletNode doesn't need .start() — it runs continuously
      } catch {
        // Fallback: 15s buffer loop (Safari / very old Chrome)
        const node = ctx.createBufferSource()
        node.buffer = createNoiseBuffer(ctx, 'brown')
        node.loop = true
        node.start()
        source = node
      }
    } else {
      const node = ctx.createBufferSource()
      node.buffer = createNoiseBuffer(ctx, preset)
      node.loop = true
      node.start()
      source = node
    }

    sourceRef.current = source

    // ── Connect graph: source → fade → HPF → [LPF] → master → speakers ──
    source.connect(fade)
    fade.connect(hpf)
    if (lofiLpf) {
      hpf.connect(lofiLpf)
      lofiLpf.connect(master)
    } else {
      hpf.connect(master)
    }
    master.connect(ctx.destination)

    // Constant power sine fade-in
    fade.gain.setValueCurveAtTime(FADE_IN_CURVE, now, AUDIO_FADE_DURATION_S)

    setPlaying(true)
  }, [audioVolume, setPlaying, stop])

  /** Update volume live (logarithmic). Smooth 100ms ramp avoids zipper noise. */
  const setVolume = useCallback((volume: number) => {
    if (!masterRef.current || !ctxRef.current) return
    masterRef.current.gain.setTargetAtTime(
      volumeToGain(volume),
      ctxRef.current.currentTime,
      0.1,
    )
  }, [])

  const toggle = useCallback((preset: AudioPreset) => {
    if (audioPlaying) stop()
    else void play(preset)
  }, [audioPlaying, play, stop])

  /**
   * Plays the Sonic Anchor (Cmaj9 chord) using the current AudioContext.
   * Initialises the context on first call if needed (requires a prior user gesture).
   * Safe to call even when no noise is currently playing.
   */
  const playAnchor = useCallback(() => {
    const ctx = getCtx()
    playSonicAnchor(ctx)
  }, [])

  return { play, stop, toggle, setVolume, playAnchor, isPlaying: audioPlaying }
}
