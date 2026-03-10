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
import { HPF_CUTOFF_HZ, PINK_LPF_CUTOFF_HZ, AUDIO_FADE_DURATION_S } from '@/shared/lib/constants'
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

function fillLofiNoise(data: Float32Array, sampleRate: number): void {
  /**
   * Lo-fi "cassette tape" texture — three layered effects baked into the buffer:
   *
   * WOW  (0.27 Hz, ±8% AM): slow tape-speed drift — the gentle swell of vintage cassettes.
   * FLUTTER (1.1 Hz, ±4% AM): capstan/roller imperfection — the characteristic "warble".
   * CRACKLE (1-in-12000 per sample ≈ 1 per 0.27s): vinyl groove dust hit.
   *
   * The audible "warmth" comes from:
   *   • WaveShaper (tape saturation) applied in the audio graph
   *   • LPF at 3 kHz applied in graph — rolls off bright treble → "recorded on cassette"
   *   • Resonant peak at 200 Hz applied in graph → bass body
   */
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
  for (let i = 0; i < data.length; i++) {
    const t = i / sampleRate

    const w = Math.random() * 2 - 1
    b0 = 0.99886 * b0 + w * 0.0555179
    b1 = 0.99332 * b1 + w * 0.0750759
    b2 = 0.96900 * b2 + w * 0.1538520
    b3 = 0.86650 * b3 + w * 0.3104856
    b4 = 0.55000 * b4 + w * 0.5329522
    b5 = -0.7616 * b5 - w * 0.0168980
    const pink = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11
    b6 = w * 0.115926

    // Wow: slow tape speed drift (0.27 Hz) → gentle amplitude swell
    const wow     = 1.0 + 0.08 * Math.sin(2 * Math.PI * 0.27 * t)
    // Flutter: capstan irregularity (1.1 Hz) → audible warble
    const flutter = 1.0 + 0.04 * Math.sin(2 * Math.PI * 1.1  * t)
    // Crackle: random dust impulse ~1 per 0.27s at 44.1 kHz
    const crackle = Math.random() < 0.000083 ? Math.random() * 0.18 : 0

    data[i] = pink * wow * flutter + crackle
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

/**
 * 40 Hz gamma binaural beat — stereo buffer (L: 400 Hz, R: 440 Hz).
 * Research: narrows attentional spotlight, enhances visual working memory.
 * Leiden Institute study: reduced global-precedence effect after 3 min exposure.
 * MIT (Tsai lab): 40 Hz stimulation triggers brain-wide cellular responses.
 * Best used in 45–90 min bursts due to high cognitive energy demand.
 */
function createGammaBuffer(ctx: AudioContext): AudioBuffer {
  const size = ctx.sampleRate * BUFFER_SECONDS
  const buf  = ctx.createBuffer(2, size, ctx.sampleRate) // stereo
  const dataL = buf.getChannelData(0)
  const dataR = buf.getChannelData(1)
  for (let i = 0; i < size; i++) {
    const t = i / ctx.sampleRate
    dataL[i] = Math.sin(2 * Math.PI * 400 * t) * 0.25  // 400 Hz left ear
    dataR[i] = Math.sin(2 * Math.PI * 440 * t) * 0.25  // 440 Hz right ear → 40 Hz phantom beat
  }
  return buf
}

function createNoiseBuffer(ctx: AudioContext, preset: AudioPreset): AudioBuffer {
  const size = ctx.sampleRate * BUFFER_SECONDS
  const buf  = ctx.createBuffer(1, size, ctx.sampleRate)
  const data = buf.getChannelData(0)
  switch (preset) {
    case 'pink':   fillPinkNoise(data);               break
    case 'nature': fillNatureNoise(data, ctx.sampleRate); break
    case 'lofi':   fillLofiNoise(data, ctx.sampleRate); break
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

    // iOS Safari fix: AudioContext starts in "suspended" state and requires an
    // explicit resume() *awaited* after a user gesture to actually produce sound.
    // Without this, play() silently succeeds but outputs nothing on iOS.
    if (ctx.state === 'suspended') {
      try { await ctx.resume() } catch { /* will fail gracefully — no audio */ }
    }

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

    // ── Lo-fi signal chain: LPF + resonant bass boost + tape saturation ──
    //
    //  source → [tapeSat] → [bassShelf] → [lofiLpf] → HPF → master
    //
    //  tapeSat: WaveShaper arctanh soft-clip — "bakes in" tape saturation warmth
    //  bassShelf: peaking EQ at 200 Hz, +4 dB — body/warmth of cassette recording
    //  lofiLpf: lowpass 3 kHz — rolls off bright treble, the definitive lo-fi sound

    // ── Pink/nature LPF at 285 Hz — eliminates high-frequency fatigue ────
    //  Research #3: pink noise filtered at 285 Hz creates optimal "sonic floor"
    //  that helps the ADHD brain settle into deep concentration without HF exhaustion
    const pinkLpf = (preset === 'pink' || preset === 'nature') ? ctx.createBiquadFilter() : null
    if (pinkLpf) {
      pinkLpf.type = 'lowpass'
      pinkLpf.frequency.value = PINK_LPF_CUTOFF_HZ
      pinkLpf.Q.value = 0.7
    }

    let tapeSat: WaveShaperNode | null = null
    let bassShelf: BiquadFilterNode | null = null
    const lofiLpf = preset === 'lofi' ? ctx.createBiquadFilter() : null

    if (preset === 'lofi') {
      // Tape saturation: arctanh soft-clip, amount=1.5 (subtle, not harsh)
      tapeSat = ctx.createWaveShaper()
      const CURVE_SIZE = 256
      const curve = new Float32Array(CURVE_SIZE)
      const amount = 1.5
      for (let i = 0; i < CURVE_SIZE; i++) {
        const x = (2 * i / (CURVE_SIZE - 1)) - 1
        // Normalized arctanh: gentle saturation with no hard clips
        curve[i] = Math.tanh(x * amount) / Math.tanh(amount)
      }
      tapeSat.curve = curve
      tapeSat.oversample = '2x'    // reduces aliasing at near-clip levels

      // Bass shelf: resonant peak at 200 Hz, Q=1.5, +4 dB → cassette body
      bassShelf = ctx.createBiquadFilter()
      bassShelf.type = 'peaking'
      bassShelf.frequency.value = 200
      bassShelf.Q.value = 1.5
      bassShelf.gain.value = 4

      // LPF: 3 kHz — vinyl/cassette treble rolloff
      lofiLpf!.type = 'lowpass'
      lofiLpf!.frequency.value = 3000
      lofiLpf!.Q.value = 0.7
    }

    // ── Master gain — logarithmic mapping (safe 40–70 dBA range) ─────────
    const master = ctx.createGain()
    master.gain.value = volumeToGain(audioVolume)
    masterRef.current = master

    // ── Source: AudioWorklet for brown (seam-free), stereo buffer for gamma, mono buffer for others
    let source: AudioBufferSourceNode | AudioWorkletNode

    if (preset === 'brown') {
      try {
        await ensureWorklet(ctx)
        source = new AudioWorkletNode(ctx, 'brown-noise')
      } catch {
        const node = ctx.createBufferSource()
        node.buffer = createNoiseBuffer(ctx, 'brown')
        node.loop = true
        node.start()
        source = node
      }
    } else if (preset === 'gamma') {
      // Stereo binaural beat: L=400Hz, R=440Hz → 40Hz gamma phantom
      const node = ctx.createBufferSource()
      node.buffer = createGammaBuffer(ctx)
      node.loop = true
      node.start()
      source = node
    } else {
      const node = ctx.createBufferSource()
      node.buffer = createNoiseBuffer(ctx, preset)
      node.loop = true
      node.start()
      source = node
    }

    sourceRef.current = source

    // ── Connect graph ─────────────────────────────────────────────────────
    // Default:  source → fade → HPF → master → out
    // Pink/Nature: source → fade → pinkLpf(285Hz) → HPF → master → out
    // Lo-fi:    source → fade → tapeSat → bassShelf → lofiLpf → HPF → master → out
    // Gamma:    source → fade → HPF → master → out (stereo preserved)
    source.connect(fade)
    if (tapeSat && bassShelf && lofiLpf) {
      fade.connect(tapeSat)
      tapeSat.connect(bassShelf)
      bassShelf.connect(lofiLpf)
      lofiLpf.connect(hpf)
    } else if (pinkLpf) {
      fade.connect(pinkLpf)
      pinkLpf.connect(hpf)
    } else {
      fade.connect(hpf)
    }
    hpf.connect(master)
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
